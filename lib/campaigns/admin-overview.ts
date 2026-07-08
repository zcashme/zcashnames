import "server-only";

import {
  listCampaignAttemptsForCampaignIds,
  listCampaignDeliveryBatchesForCampaignIds,
} from "@/lib/campaigns/repository";
import type {
  CampaignDeliveryBatchRecord,
  CampaignRecord,
  CampaignSendAttemptRecord,
} from "@/lib/campaigns/types";
import { listActiveSuppressions } from "@/lib/campaigns/suppression";
import {
  getCampaignWorkerHealth,
  type CampaignWorkerHealthRecord,
} from "@/lib/campaigns/worker-health";
import { getProviderManagedScheduleState } from "@/lib/campaigns/provider-schedule";
import { db } from "@/lib/db";

export interface CampaignOperationalSummary {
  campaign: CampaignRecord;
  batchCount: number;
  pendingCount: number;
  sentCount: number;
  failedCount: number;
  nextEligibleAt: string | null;
  providerScheduledAt: string | null;
  providerScheduledCount: number;
  providerManaged: boolean;
  hasFailedRecipients: boolean;
}

export interface CampaignAdminHealthSummary {
  ready: boolean;
  deliverySchemaOk: boolean;
  suppressionSchemaOk: boolean;
  workerHealthSchemaOk: boolean;
  webhookSchemaOk: boolean;
  resendApiConfigured: boolean;
  resendWebhookConfigured: boolean;
  cronSecretConfigured: boolean;
  workerHealthy: boolean;
  workerHealth: CampaignWorkerHealthRecord | null;
  warnings: string[];
}

function groupByCampaignId<T extends { campaign_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(row.campaign_id);
    if (group) group.push(row);
    else grouped.set(row.campaign_id, [row]);
  }
  return grouped;
}

function summarizeCampaign(
  campaign: CampaignRecord,
  batches: CampaignDeliveryBatchRecord[],
  attempts: CampaignSendAttemptRecord[],
): CampaignOperationalSummary {
  const currentBatch =
    batches.find((batch) => batch.status === "sending") ??
    batches.find((batch) => batch.status === "pending") ??
    null;
  const providerScheduledAttempts = attempts.filter(
    (attempt) => attempt.status === "scheduled",
  );
  const providerScheduledCount = providerScheduledAttempts.length;
  const providerFailedCount = attempts.filter(
    (attempt) => attempt.status === "failed",
  ).length;
  const providerScheduledAt =
    providerScheduledAttempts[0]?.scheduled_for ?? campaign.scheduled_at ?? null;
  const providerSchedule = getProviderManagedScheduleState({
    hasDeliveryBatches: batches.length > 0,
    acceptedCount: providerScheduledCount,
    scheduledAt: providerScheduledAt,
    canceledAt: campaign.delivery_canceled_at,
  });

  return {
    campaign,
    batchCount: batches.length,
    pendingCount: batches.filter(
      (batch) => batch.status === "pending" || batch.status === "sending",
    ).length,
    sentCount:
      batches.length > 0
        ? batches.reduce((sum, batch) => sum + batch.sent_count, 0)
        : 0,
    failedCount:
      batches.length > 0
        ? batches.reduce((sum, batch) => sum + batch.failed_count, 0)
        : providerFailedCount,
    nextEligibleAt:
      currentBatch?.next_eligible_at ??
      providerSchedule.nextEligibleAt ??
      (providerSchedule.managed ? null : campaign.scheduled_at ?? null),
    providerScheduledAt,
    providerScheduledCount,
    providerManaged: providerSchedule.managed,
    hasFailedRecipients:
      attempts.some((attempt) => attempt.status === "failed") ||
      campaign.status === "failed" ||
      campaign.status === "partial",
  };
}

async function checkTable(path: string, select = "id"): Promise<boolean> {
  const { error } = await db.from(path).select(select).limit(1);
  return !error;
}

async function checkSendAttemptSchema(): Promise<boolean> {
  const { error } = await db
    .from("campaign_send_attempts")
    .select("id, scheduled_for")
    .limit(1);
  return !error;
}

export async function listCampaignOperationalSummaries(
  campaigns: CampaignRecord[],
): Promise<CampaignOperationalSummary[]> {
  const campaignIds = campaigns.map((campaign) => campaign.id);
  const [batches, attempts] = await Promise.all([
    listCampaignDeliveryBatchesForCampaignIds(campaignIds).catch(() => []),
    listCampaignAttemptsForCampaignIds(campaignIds),
  ]);

  const batchesByCampaign = groupByCampaignId(batches);
  const attemptsByCampaign = groupByCampaignId(attempts);

  return campaigns.map((campaign) =>
    summarizeCampaign(
      campaign,
      batchesByCampaign.get(campaign.id) ?? [],
      attemptsByCampaign.get(campaign.id) ?? [],
    ),
  );
}

export async function getCampaignAdminHealthSummary(
  activeCampaigns: CampaignRecord[],
): Promise<CampaignAdminHealthSummary> {
  const [
    deliverySchemaOk,
    suppressionSchemaOk,
    workerHealthSchemaOk,
    webhookSchemaOk,
    sendAttemptSchemaOk,
    workerHealth,
  ] = await Promise.all([
    checkTable("campaign_delivery_batches"),
    checkTable("campaign_suppressions"),
    checkTable("campaign_worker_health", "worker_key"),
    checkTable("campaign_webhook_events", "svix_id"),
    checkSendAttemptSchema(),
    getCampaignWorkerHealth().catch(() => null),
  ]);

  const resendApiConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendWebhookConfigured = Boolean(
    process.env.RESEND_WEBHOOK_SECRET?.trim(),
  );
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());

  const lastSuccessAt = workerHealth?.last_success_at
    ? new Date(workerHealth.last_success_at).getTime()
    : 0;
  const workerHealthy =
    Boolean(lastSuccessAt) &&
    Date.now() - lastSuccessAt <= 15 * 60 * 1000;

  const warnings: string[] = [];
  if (!deliverySchemaOk || !sendAttemptSchemaOk) {
    warnings.push("Campaign delivery schema is not fully installed.");
  }
  if (!suppressionSchemaOk) warnings.push("Campaign suppression schema is missing.");
  if (!workerHealthSchemaOk) warnings.push("Campaign worker health schema is missing.");
  if (!webhookSchemaOk) warnings.push("Campaign webhook event schema is missing.");
  if (!resendApiConfigured) warnings.push("RESEND_API_KEY is not configured.");
  if (!resendWebhookConfigured) warnings.push("RESEND_WEBHOOK_SECRET is not configured.");
  if (!cronSecretConfigured) {
    warnings.push("CRON_SECRET is not configured. The worker route is currently unprotected.");
  }
  if (!workerHealthy) {
    warnings.push("No recent successful campaign worker heartbeat was observed.");
  }
  if (activeCampaigns.some((campaign) => campaign.status === "scheduled" || campaign.status === "sending") && !workerHealthy) {
    warnings.push("Active campaigns are waiting on a stale or missing worker heartbeat.");
  }

  return {
    ready:
      deliverySchemaOk &&
      sendAttemptSchemaOk &&
      suppressionSchemaOk &&
      workerHealthSchemaOk &&
      webhookSchemaOk &&
      resendApiConfigured &&
      resendWebhookConfigured &&
      workerHealthy,
    deliverySchemaOk: deliverySchemaOk && sendAttemptSchemaOk,
    suppressionSchemaOk,
    workerHealthSchemaOk,
    webhookSchemaOk,
    resendApiConfigured,
    resendWebhookConfigured,
    cronSecretConfigured,
    workerHealthy,
    workerHealth,
    warnings,
  };
}

export async function listRecentActiveSuppressions() {
  return listActiveSuppressions(10);
}
