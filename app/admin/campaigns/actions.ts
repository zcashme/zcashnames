"use server";

import { revalidatePath } from "next/cache";
import {
  scheduleCampaignWithResend,
  createCampaignDeliveryBatches,
  createCampaignDraft,
  DEFAULT_DELIVERY_BATCH_INTERVAL_MINUTES,
  DEFAULT_DELIVERY_BATCH_SIZE,
  estimateCampaignRecipients,
  getCampaign,
  getCampaignPreviewRecipient,
  isCampaignDeliveryMigrationError,
  listCampaignAttempts,
  listCampaignDeliveryBatches,
  pauseCampaignDelivery,
  cancelCampaignDelivery,
  resumeCampaignDelivery,
  updateCampaignDraft,
} from "@/lib/campaigns/repository";
import type {
  CampaignAudienceScope,
  CampaignBlockedReason,
  CampaignDedupeMode,
  CampaignPersonalizationMode,
  CampaignRecipientPersonalization,
  CampaignTargetSeries,
  CampaignSourceKind,
} from "@/lib/campaigns/types";
import { campaignDraftUsesLiveStats } from "@/lib/campaigns/content";
import {
  renderCampaignPreview,
  enrichCampaignPreviewPersonalization,
} from "@/lib/email/campaign";

function hasSeriesSelection(series: string | null | undefined): boolean {
  return Boolean(series?.trim());
}

function shouldIncludeUnsubscribe(
  sourceKind: CampaignSourceKind,
  series: string | null | undefined,
  includeUnsubscribe: boolean,
): boolean {
  if (sourceKind === "custom_emails" && !hasSeriesSelection(series)) return false;
  return includeUnsubscribe;
}

function revalidateCampaignPaths(campaignId?: string) {
  revalidatePath("/admin/campaigns/drafts");
  revalidatePath("/admin/campaigns/sent");
  if (campaignId) {
    revalidatePath(`/admin/campaigns/drafts/${campaignId}`);
    revalidatePath(`/admin/campaigns/sent/${campaignId}`);
  }
}

type CampaignDeliveryActionSuccess = {
  ok: true;
  mode: "immediate" | "scheduled" | "paced";
  outcome: "queued" | "sent" | "partial" | "failed" | "processing";
  message: string;
  batchCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  nextEligibleAt: string | null;
  firstError: string | null;
  sentDetailHref: string;
  delivery: CampaignDeliveryState;
};

type CampaignDeliveryActionResult =
  | CampaignDeliveryActionSuccess
  | { ok: false; error: string };

type CampaignDeliveryState = {
  batches: Array<{
    id: string;
    batchNumber: number;
    status: "pending" | "sending" | "sent" | "failed" | "canceled";
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    nextEligibleAt: string | null;
  }>;
  deliveryPausedAt: string | null;
  deliveryCanceledAt: string | null;
  deliveryWarning: string | null;
  providerScheduledAt: string | null;
  providerScheduledCount: number;
  providerFailedCount: number;
  providerManaged: boolean;
};

type CampaignDeliveryAttemptSummary = {
  id: string;
  email: string;
  status: string;
  error: string | null;
  attemptedAt: string;
  scheduledFor: string | null;
};

async function summarizeCampaignDelivery(campaignId: string) {
  const [batches, attempts] = await Promise.all([
    listCampaignDeliveryBatches(campaignId),
    listCampaignAttempts(campaignId),
  ]);
  const currentBatch =
    batches.find((batch) => batch.status === "sending") ??
    batches.find((batch) => batch.status === "pending") ??
    null;

  return {
    batchCount: batches.length,
    sentCount: batches.reduce((sum, batch) => sum + batch.sent_count, 0),
    failedCount: batches.reduce((sum, batch) => sum + batch.failed_count, 0),
    pendingCount: batches.filter(
      (batch) => batch.status === "pending" || batch.status === "sending",
    ).length,
    nextEligibleAt: currentBatch?.next_eligible_at ?? null,
    scheduledCount: attempts.filter((attempt) => attempt.status === "scheduled").length,
    firstError:
      attempts.find((attempt) => attempt.error)?.error ??
      batches.find((batch) => batch.last_error)?.last_error ??
      null,
  };
}

function validateResendScheduledAt(scheduledAt: string): string | null {
  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) return "Invalid scheduled time.";
  const now = Date.now();
  const max = now + 30 * 24 * 60 * 60 * 1000;
  if (scheduledDate.getTime() <= now) return "Scheduled time must be in the future.";
  if (scheduledDate.getTime() > max) return "Scheduled time must be within 30 days.";
  return null;
}

async function getCampaignDeliveryState(campaignId: string): Promise<CampaignDeliveryState> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");

  try {
    const [batches, attempts] = await Promise.all([
      listCampaignDeliveryBatches(campaignId),
      listCampaignAttempts(campaignId),
    ]);
    const providerScheduledAttempts = attempts.filter((attempt) => attempt.status === "scheduled");
    return {
      batches: batches.map((batch) => ({
        id: batch.id,
        batchNumber: batch.batch_number,
        status: batch.status,
        recipientCount: batch.recipient_count,
        sentCount: batch.sent_count,
        failedCount: batch.failed_count,
        nextEligibleAt: batch.next_eligible_at,
      })),
      deliveryPausedAt: campaign.delivery_paused_at,
      deliveryCanceledAt: campaign.delivery_canceled_at,
      deliveryWarning: null,
      providerScheduledAt:
        providerScheduledAttempts[0]?.scheduled_for ?? campaign.scheduled_at ?? null,
      providerScheduledCount: providerScheduledAttempts.length,
      providerFailedCount: attempts.filter((attempt) => attempt.status === "failed").length,
      providerManaged: batches.length === 0 && providerScheduledAttempts.length > 0,
    };
  } catch (error) {
    if (isCampaignDeliveryMigrationError(error)) {
      return {
        batches: [],
        deliveryPausedAt: campaign.delivery_paused_at,
        deliveryCanceledAt: campaign.delivery_canceled_at,
        deliveryWarning: error instanceof Error ? error.message : String(error),
        providerScheduledAt: campaign.scheduled_at,
        providerScheduledCount: 0,
        providerFailedCount: 0,
        providerManaged: false,
      };
    }
    throw error;
  }
}

function buildDeliveryMessage(args: {
  mode: CampaignDeliveryActionSuccess["mode"];
  batchCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}): {
  outcome: CampaignDeliveryActionSuccess["outcome"];
  message: string;
} {
  const batchLabel = `${args.batchCount} batch${args.batchCount === 1 ? "" : "es"}`;

  if (args.mode === "scheduled") {
    return {
      outcome: "queued",
      message: `Scheduled with Resend. Accepted ${args.pendingCount} recipient${args.pendingCount === 1 ? "" : "s"} for future delivery.`,
    };
  }

  if (args.mode === "paced") {
    return {
      outcome: "queued",
      message: `Queued ${batchLabel} for paced delivery. Remaining batches will advance as the campaign worker runs.`,
    };
  }

  if (args.failedCount > 0 && args.sentCount === 0) {
    return {
      outcome: "failed",
      message: `Send finished with failures. Sent ${args.sentCount}; failed ${args.failedCount}.`,
    };
  }

  if (args.failedCount > 0) {
    return {
      outcome: "partial",
      message: `Send finished with partial delivery. Sent ${args.sentCount}; failed ${args.failedCount}.`,
    };
  }

  if (args.pendingCount > 0) {
    return {
      outcome: "processing",
      message: `Send started. ${args.pendingCount} ${args.pendingCount === 1 ? "batch is" : "batches are"} still in progress.`,
    };
  }

  return {
    outcome: "sent",
    message: `Send finished. Sent ${args.sentCount}; failed ${args.failedCount}.`,
  };
}

export async function createCampaignAction(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const campaign = await createCampaignDraft();
    revalidateCampaignPaths(campaign.id);
    return { ok: true, id: campaign.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveCampaignAction(
  campaignId: string,
  patch: {
    title: string;
    sourceKind: CampaignSourceKind;
    series: CampaignTargetSeries;
    includeUnsubscribe: boolean;
    audienceScope: CampaignAudienceScope;
    dedupeMode: CampaignDedupeMode;
    personalizationMode: CampaignPersonalizationMode;
    customEmailsText: string;
    subject: string;
    bodyText: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateCampaignDraft(campaignId, {
      title: patch.title,
      sourceKind: patch.sourceKind,
      series: patch.series,
      includeUnsubscribe: patch.includeUnsubscribe,
      audienceScope: patch.audienceScope,
      dedupeMode: patch.dedupeMode,
      personalizationMode: patch.personalizationMode,
      customEmailsText: patch.customEmailsText,
      draft: { subject: patch.subject, bodyText: patch.bodyText },
    });
    revalidateCampaignPaths(campaignId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function renderCampaignPreviewAction(
  campaignId: string,
  draft: { subject: string; bodyText: string },
  options?: { hydrateLiveStats?: boolean },
): Promise<string> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  let personalization: CampaignRecipientPersonalization = {
    name: "Josh",
    referralCode: "jswihart",
    referralUrl: "https://zcashnames.com/?ref=jswihart",
    dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
    humanReferralCode: "josh",
    humanReferralUrl: "https://zcashnames.com/?ref=josh",
    humanDashboardUrl: "https://zcashnames.com/leaders/ref/josh",
    referralStats: null,
    relatedNames: ["Josh"],
  };
  try {
    const previewRecipient = await getCampaignPreviewRecipient(campaignId);
    personalization = previewRecipient?.personalization ?? personalization;
  } catch {
    // Keep preview usable while source-specific recipient validation is being edited.
  }
  if (
    campaign.source_kind === "zn_waitlist" &&
    (options?.hydrateLiveStats || campaignDraftUsesLiveStats(draft))
  ) {
    personalization = await enrichCampaignPreviewPersonalization(
      personalization,
      campaign.source_kind,
    );
  }
  return renderCampaignPreview({
    subject: draft.subject,
    bodyText: draft.bodyText,
    personalization,
    includeUnsubscribe: shouldIncludeUnsubscribe(
      campaign.source_kind,
      campaign.series,
      campaign.include_unsubscribe,
    ),
  });
}

export async function estimateCampaignRecipientsAction(
  campaignId: string,
): Promise<
  | {
      ok: true;
      count: number;
      sample: Array<{ email: string; name: string; names: string[] }>;
      blocked: Array<{ email: string; reason: CampaignBlockedReason }>;
      generatedAt: string;
    }
  | { ok: false; error: string }
> {
  try {
    const estimate = await estimateCampaignRecipients(campaignId);
    revalidateCampaignPaths(campaignId);
    return {
      ok: true,
      count: estimate.count,
      sample: estimate.sample.map((recipient) => ({
        email: recipient.email,
        name: recipient.personalization.name,
        names: recipient.personalization.relatedNames,
      })),
      blocked: estimate.blocked.map((recipient) => ({
        email: recipient.email,
        reason: recipient.reason,
      })),
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getCampaignDeliveryStateAction(
  campaignId: string,
): Promise<{ ok: true; delivery: CampaignDeliveryState } | { ok: false; error: string }> {
  try {
    return { ok: true, delivery: await getCampaignDeliveryState(campaignId) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getCampaignDeliveryDiagnosticsAction(
  campaignId: string,
): Promise<
  | {
      ok: true;
      delivery: CampaignDeliveryState;
      attempts: CampaignDeliveryAttemptSummary[];
      latestError: string | null;
    }
  | { ok: false; error: string }
> {
  try {
    const [delivery, attempts] = await Promise.all([
      getCampaignDeliveryState(campaignId),
      listCampaignAttempts(campaignId),
    ]);
    const latestError =
      attempts.find((attempt) => attempt.error)?.error ??
      delivery.deliveryWarning ??
      null;
    return {
      ok: true,
      delivery,
      attempts: attempts.slice(0, 10).map((attempt) => ({
        id: attempt.id,
        email: attempt.email,
        status: attempt.status,
        error: attempt.error,
        attemptedAt: attempt.attempted_at,
        scheduledFor: attempt.scheduled_for,
      })),
      latestError,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendCampaignAction(
  campaignId: string,
  options?: { scheduledAt?: string | null },
): Promise<CampaignDeliveryActionResult> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const nowIso = new Date().toISOString();
  const scheduledAt = options?.scheduledAt ?? null;

  try {
    if (scheduledAt) {
      const validationError = validateResendScheduledAt(scheduledAt);
      if (validationError) return { ok: false, error: validationError };

      const summary = await scheduleCampaignWithResend(campaignId, scheduledAt);
      revalidateCampaignPaths(campaignId);
      return {
        ok: true,
        mode: "scheduled",
        outcome: summary.failedCount > 0 && summary.scheduledCount === 0 ? "failed" : "queued",
        message:
          summary.failedCount > 0
            ? `Scheduled ${summary.scheduledCount} recipients with Resend. ${summary.failedCount} failed before scheduling.`
            : `Scheduled ${summary.scheduledCount} recipients with Resend for future delivery.`,
        batchCount: 0,
        sentCount: 0,
        failedCount: summary.failedCount,
        pendingCount: summary.scheduledCount,
        nextEligibleAt: scheduledAt,
        firstError: summary.firstError,
        sentDetailHref: `/admin/campaigns/sent/${campaignId}`,
        delivery: await getCampaignDeliveryState(campaignId),
      };
    }

    await createCampaignDeliveryBatches(campaignId, {
      startAt: nowIso,
      batchSize: DEFAULT_DELIVERY_BATCH_SIZE,
      intervalMinutes: 0,
    });
    const summary = await summarizeCampaignDelivery(campaignId);
    revalidateCampaignPaths(campaignId);
    return {
      ok: true,
      mode: "immediate",
      outcome: "processing",
      message: `Send requested. ${summary.batchCount} batch${summary.batchCount === 1 ? "" : "es"} created and queued for immediate delivery.`,
      batchCount: summary.batchCount,
      sentCount: summary.sentCount,
      failedCount: summary.failedCount,
      pendingCount: summary.pendingCount,
      nextEligibleAt: summary.nextEligibleAt,
      firstError: summary.firstError,
      sentDetailHref: `/admin/campaigns/sent/${campaignId}`,
      delivery: await getCampaignDeliveryState(campaignId),
    };
  } catch (error) {
    revalidateCampaignPaths(campaignId);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function queueCampaignAction(
  campaignId: string,
  options?: { scheduledAt?: string | null },
): Promise<CampaignDeliveryActionResult> {
  try {
    await createCampaignDeliveryBatches(campaignId, {
      startAt: options?.scheduledAt ?? new Date().toISOString(),
      batchSize: DEFAULT_DELIVERY_BATCH_SIZE,
      intervalMinutes: DEFAULT_DELIVERY_BATCH_INTERVAL_MINUTES,
    });
    const summary = await summarizeCampaignDelivery(campaignId);
    const delivery = buildDeliveryMessage({
      mode: "paced",
      batchCount: summary.batchCount,
      sentCount: summary.sentCount,
      failedCount: summary.failedCount,
      pendingCount: summary.pendingCount,
    });
    revalidateCampaignPaths(campaignId);
    return {
      ok: true,
      mode: "paced",
      outcome: delivery.outcome,
      message: delivery.message,
      batchCount: summary.batchCount,
      sentCount: summary.sentCount,
      failedCount: summary.failedCount,
      pendingCount: summary.pendingCount,
      nextEligibleAt: summary.nextEligibleAt,
      firstError: summary.firstError,
      sentDetailHref: `/admin/campaigns/sent/${campaignId}`,
      delivery: await getCampaignDeliveryState(campaignId),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function pauseCampaignAction(
  campaignId: string,
): Promise<{ ok: true; delivery: CampaignDeliveryState } | { ok: false; error: string }> {
  try {
    await pauseCampaignDelivery(campaignId);
    revalidateCampaignPaths(campaignId);
    return { ok: true, delivery: await getCampaignDeliveryState(campaignId) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function resumeCampaignAction(
  campaignId: string,
): Promise<{ ok: true; delivery: CampaignDeliveryState } | { ok: false; error: string }> {
  try {
    await resumeCampaignDelivery(campaignId);
    revalidateCampaignPaths(campaignId);
    return { ok: true, delivery: await getCampaignDeliveryState(campaignId) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function cancelCampaignAction(
  campaignId: string,
): Promise<{ ok: true; delivery: CampaignDeliveryState } | { ok: false; error: string }> {
  try {
    await cancelCampaignDelivery(campaignId);
    revalidateCampaignPaths(campaignId);
    return { ok: true, delivery: await getCampaignDeliveryState(campaignId) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
