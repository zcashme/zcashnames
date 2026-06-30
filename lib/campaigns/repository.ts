import "server-only";

import { db } from "@/lib/db";
import {
  defaultCampaignBodyText,
  defaultCampaignSubject,
  defaultCampaignTitle,
} from "@/lib/campaigns/content";
import {
  getSubscriberRecord,
  upsertSubscriber,
} from "@/lib/email/subscribers";
import {
  buildCampaignBatchEmailPayload,
  sendCampaignEmail,
  sendCampaignEmailBatch,
  type CampaignSendEmailArgs,
} from "@/lib/email/campaign";
import { cancelScheduledEmail } from "@/lib/email/client";
import {
  estimateWaitlistRecipients,
  getWaitlistRecipientSample,
  listWaitlistPersonalizationsByEmail,
  listWaitlistRecipients,
} from "@/lib/campaigns/waitlist";
import { buildCampaignReferralStatsContext, withCampaignReferralStats } from "@/lib/campaigns/referral-stats";
import { getDefaultCampaignSeries, isSupportedCampaignSeries } from "@/lib/campaigns/series";
import type {
  CampaignAudienceScope,
  CampaignBlockedRecipient,
  CampaignDeliveryBatchRecord,
  CampaignDeliveryBatchStatus,
  CampaignDedupeMode,
  CampaignDraftInput,
  CampaignDraftRecord,
  CampaignPersonalizationMode,
  CampaignRecipient,
  CampaignRecipientEstimate,
  CampaignRecipientSnapshotRecord,
  CampaignRecord,
  CampaignTargetSeries,
  CampaignSourceKind,
  CampaignStatus,
} from "@/lib/campaigns/types";

export const LARGE_CAMPAIGN_THRESHOLD = 500;
export const DEFAULT_DELIVERY_BATCH_SIZE = 100;
export const DEFAULT_DELIVERY_BATCH_INTERVAL_MINUTES = 2;
const CAMPAIGN_DELIVERY_MIGRATION_PATH = "sql/2026-06-21-campaign-paced-delivery.sql";
const SUBSCRIBER_PAGE_SIZE = 1000;

export function campaignDeliveryMigrationMessage(): string {
  return `Campaign paced delivery schema is not installed. Run ${CAMPAIGN_DELIVERY_MIGRATION_PATH} and refresh.`;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      typeof record.message === "string" ? record.message : null,
      typeof record.details === "string" ? record.details : null,
      typeof record.hint === "string" ? record.hint : null,
      typeof record.code === "string" ? `code: ${record.code}` : null,
    ].filter((value): value is string => Boolean(value && value.trim()));
    if (parts.length > 0) return parts.join(" ");
    try {
      return JSON.stringify(record);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

export function isCampaignDeliveryMigrationError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  if (message === campaignDeliveryMigrationMessage()) return true;
  if (!message.toLowerCase().includes("schema cache")) return false;
  return [
    "campaign_delivery_batches",
    "campaign_delivery_batch_id",
    "delivery_paused_at",
    "delivery_canceled_at",
    "delivery_batch_size",
    "delivery_batch_interval_minutes",
  ].some((token) => message.includes(token));
}

function normalizeCampaignDeliveryError(error: unknown): Error {
  if (isCampaignDeliveryMigrationError(error)) {
    return new Error(campaignDeliveryMigrationMessage());
  }
  return error instanceof Error ? error : new Error(extractErrorMessage(error));
}

function shouldIncludeUnsubscribe(
  sourceKind: CampaignSourceKind,
  series: string | null | undefined,
  includeUnsubscribe: boolean,
): boolean {
  if (sourceKind === "custom_emails" && !hasSeriesSelection(series)) return false;
  return includeUnsubscribe;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://zcashnames.com";
}

function normalizeDraftInput(draft: CampaignDraftInput): CampaignDraftInput {
  return {
    subject: draft.subject.trim(),
    bodyText: draft.bodyText.replace(/\r\n?/g, "\n").trim(),
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hasSeriesSelection(series: string | null | undefined): boolean {
  return Boolean(series?.trim());
}

function normalizeRecipientEstimatePayload(
  estimate: CampaignRecipientEstimate,
): {
  sample: Array<{ email: string; name: string; names: string[] }>;
  blocked: Array<{ email: string; reason: CampaignBlockedRecipient["reason"] }>;
} {
  return {
    sample: estimate.sample.slice(0, 5).map((recipient) => ({
      email: recipient.email,
      name: recipient.personalization.name,
      names: recipient.personalization.relatedNames,
    })),
    blocked: estimate.blocked.map((recipient) => ({
      email: recipient.email,
      reason: recipient.reason,
    })),
  };
}

export function buildCampaignRecipientEstimateCacheKey(args: {
  sourceKind: CampaignSourceKind;
  audienceScope: CampaignAudienceScope;
  dedupeMode: CampaignDedupeMode;
  series: string | null | undefined;
  customEmailsText: string | null | undefined;
}): string {
  return JSON.stringify({
    sourceKind: args.sourceKind,
    audienceScope: args.audienceScope,
    dedupeMode: args.dedupeMode,
    series: args.series?.trim() ?? null,
    customEmailsText: args.customEmailsText?.trim() ?? null,
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fallbackNameFromEmail(email: string): string {
  const localPart = normalizeEmail(email).split("@")[0] ?? "there";
  const cleaned = localPart.replace(/[._+-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildMinimalRecipient(
  email: string,
  sourceKind: CampaignSourceKind,
  sourceRowIds?: string[],
  personalizationOverrides?: Partial<CampaignRecipient["personalization"]>,
): CampaignRecipient {
  const normalizedEmail = normalizeEmail(email);
  const fallbackName = fallbackNameFromEmail(normalizedEmail);
  return {
    recipientKey: normalizedEmail,
    email: normalizedEmail,
    normalizedEmail,
    sourceKind,
    sourceRowIds: sourceRowIds ?? [normalizedEmail],
    personalization: {
      name: fallbackName,
      referralCode: null,
      referralUrl: null,
      dashboardUrl: null,
      humanReferralCode: null,
      humanReferralUrl: null,
      humanDashboardUrl: null,
      referralStats: null,
      relatedNames: [fallbackName],
      ...personalizationOverrides,
    },
  };
}

function parseCustomEmailsText(text: string | null | undefined): {
  normalizedEmails: string[];
  invalidEmails: string[];
} {
  const tokens = (text ?? "")
    .split(/[\s,;]+/g)
    .map((value) => value.trim())
    .filter(Boolean);

  const normalizedEmails: string[] = [];
  const invalidEmails: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeEmail(token);
    if (!isValidEmail(normalized)) {
      invalidEmails.push(token);
      continue;
    }
    if (!normalizedEmails.includes(normalized)) normalizedEmails.push(normalized);
  }

  return { normalizedEmails, invalidEmails };
}

async function resolveSubscriberRecipients(series: string): Promise<CampaignRecipient[]> {
  const recipients: CampaignRecipient[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db
      .from("email_subscribers")
      .select("email")
      .eq("series", series)
      .is("unsubscribed_at", null)
      .not("confirmed_at", "is", null)
      .order("email", { ascending: true })
      .range(offset, offset + SUBSCRIBER_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const rows = ((data ?? []) as Array<{ email?: string | null }>)
      .map((row) => (row.email ? buildMinimalRecipient(row.email, "email_subscribers") : null))
      .filter((row): row is CampaignRecipient => Boolean(row));

    recipients.push(...rows);

    if (rows.length < SUBSCRIBER_PAGE_SIZE) break;
    offset += SUBSCRIBER_PAGE_SIZE;
  }

  return recipients;
}

async function resolveSubscriberPreviewRecipient(
  series: string,
): Promise<CampaignRecipient | null> {
  const { data, error } = await db
    .from("email_subscribers")
    .select("email")
    .eq("series", series)
    .is("unsubscribed_at", null)
    .not("confirmed_at", "is", null)
    .order("email", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.email) return null;
  return buildMinimalRecipient(data.email, "email_subscribers");
}

async function resolveCustomEmailRecipients(
  series: string | null | undefined,
  customEmailsText: string | null | undefined,
): Promise<CampaignRecipientEstimate> {
  const { normalizedEmails, invalidEmails } = parseCustomEmailsText(customEmailsText);
  if (invalidEmails.length > 0) {
    throw new Error(`Invalid email address: ${invalidEmails.slice(0, 5).join(", ")}`);
  }
  if (normalizedEmails.length === 0) {
    throw new Error("Enter at least one valid custom email address.");
  }

  const waitlistPersonalizations = await listWaitlistPersonalizationsByEmail({
    emails: normalizedEmails,
    baseUrl: baseUrl(),
  });

  if (!hasSeriesSelection(series)) {
    return {
      count: normalizedEmails.length,
      sample: normalizedEmails.map((email) =>
        buildMinimalRecipient(
          email,
          "custom_emails",
          undefined,
          waitlistPersonalizations.get(email) ?? undefined,
        ),
      ),
      blocked: [],
    };
  }

  const normalizedSeries = series!.trim();
  const sample: CampaignRecipient[] = [];
  const blocked: CampaignBlockedRecipient[] = [];

  for (const email of normalizedEmails) {
    const row = await getSubscriberRecord(email, normalizedSeries);
    if (row?.unsubscribed_at) {
      blocked.push({ email, normalizedEmail: email, reason: "unsubscribed" });
      continue;
    }
    sample.push(
      buildMinimalRecipient(
        email,
        "custom_emails",
        undefined,
        waitlistPersonalizations.get(email) ?? undefined,
      ),
    );
  }

  return {
    count: sample.length,
    sample,
    blocked,
  };
}

export async function createCampaignDraft(args?: {
  title?: string;
  sourceKind?: CampaignSourceKind;
  series?: CampaignTargetSeries;
  includeUnsubscribe?: boolean;
  audienceScope?: CampaignAudienceScope;
  dedupeMode?: CampaignDedupeMode;
  personalizationMode?: CampaignPersonalizationMode;
  customEmailsText?: string | null;
  draft?: Partial<CampaignDraftInput>;
}): Promise<CampaignRecord> {
  const sourceKind = args?.sourceKind ?? "zn_waitlist";
  const insert = {
    title: args?.title?.trim() || defaultCampaignTitle(),
    source_kind: sourceKind,
    series: args?.series ?? getDefaultCampaignSeries(),
    include_unsubscribe:
      args?.includeUnsubscribe ?? (sourceKind === "zn_waitlist" ? false : true),
    audience_scope: args?.audienceScope ?? "verified_only",
    dedupe_mode: args?.dedupeMode ?? "one_per_email",
    personalization_mode: args?.personalizationMode ?? "light",
    status: "draft" as CampaignStatus,
  };
  const { data, error } = await db.from("campaigns").insert(insert).select("*").single();
  if (error) throw new Error(error.message);

  const normalizedDraft = normalizeDraftInput({
    subject: args?.draft?.subject ?? defaultCampaignSubject(),
    bodyText: args?.draft?.bodyText ?? defaultCampaignBodyText(),
  });
  const { error: draftError } = await db.from("campaign_drafts").insert({
    campaign_id: data.id,
    subject: normalizedDraft.subject,
    body_text: normalizedDraft.bodyText,
    custom_emails_text: args?.customEmailsText?.trim() || null,
  });
  if (draftError) throw new Error(draftError.message);

  return data as CampaignRecord;
}

export async function listDraftCampaigns(): Promise<CampaignRecord[]> {
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .in("status", ["draft", "scheduled", "sending", "failed", "partial"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRecord[];
}

export async function listSentCampaigns(): Promise<CampaignRecord[]> {
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .eq("status", "sent")
    .order("send_completed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CampaignRecord[];
}

export async function getCampaign(campaignId: string): Promise<CampaignRecord | null> {
  const { data, error } = await db.from("campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CampaignRecord | null) ?? null;
}

export async function getCampaignDraft(campaignId: string): Promise<CampaignDraftRecord | null> {
  const { data, error } = await db
    .from("campaign_drafts")
    .select("*")
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as CampaignDraftRecord | null) ?? null;
}

export async function getOrCreateCampaignDraft(campaignId: string): Promise<CampaignDraftRecord> {
  const existing = await getCampaignDraft(campaignId);
  if (existing) return existing;
  const { data, error } = await db
    .from("campaign_drafts")
    .insert({
      campaign_id: campaignId,
      subject: defaultCampaignSubject(),
      body_text: defaultCampaignBodyText(),
      custom_emails_text: null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CampaignDraftRecord;
}

export async function updateCampaignDraft(
  campaignId: string,
  patch: {
    title?: string;
    sourceKind?: CampaignSourceKind;
    series?: CampaignTargetSeries;
    includeUnsubscribe?: boolean;
    audienceScope?: CampaignAudienceScope;
    dedupeMode?: CampaignDedupeMode;
    personalizationMode?: CampaignPersonalizationMode;
    customEmailsText?: string | null;
    draft?: CampaignDraftInput;
  },
): Promise<void> {
  const updates: Record<string, string | boolean> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.sourceKind !== undefined) updates.source_kind = patch.sourceKind;
  if (patch.series !== undefined) updates.series = patch.series;
  if (patch.includeUnsubscribe !== undefined) updates.include_unsubscribe = patch.includeUnsubscribe;
  if (patch.audienceScope !== undefined) updates.audience_scope = patch.audienceScope;
  if (patch.dedupeMode !== undefined) updates.dedupe_mode = patch.dedupeMode;
  if (patch.personalizationMode !== undefined) updates.personalization_mode = patch.personalizationMode;
  const { error } = await db.from("campaigns").update(updates).eq("id", campaignId);
  if (error) throw new Error(error.message);

  if (patch.draft || patch.customEmailsText !== undefined) {
    const existingDraft = await getOrCreateCampaignDraft(campaignId);
    const normalized = patch.draft ? normalizeDraftInput(patch.draft) : null;
    const draftUpdate: Record<string, string | null> = {
      campaign_id: campaignId,
      subject: normalized?.subject ?? existingDraft.subject,
      body_text: normalized?.bodyText ?? existingDraft.body_text,
      updated_at: new Date().toISOString(),
    };
    if (patch.customEmailsText !== undefined) {
      draftUpdate.custom_emails_text = patch.customEmailsText?.trim() || null;
    }
    const { error: draftError } = await db.from("campaign_drafts").upsert(draftUpdate);
    if (draftError) throw new Error(draftError.message);
  }
}

async function resolveCampaignRecipientEstimate(
  campaign: CampaignRecord,
): Promise<CampaignRecipientEstimate> {
  if (campaign.source_kind === "email_subscribers" && !isSupportedCampaignSeries(campaign.series)) {
    throw new Error(`Unsupported campaign series: ${campaign.series}`);
  }
  if (
    campaign.source_kind === "custom_emails" &&
    hasSeriesSelection(campaign.series) &&
    !isSupportedCampaignSeries(campaign.series)
  ) {
    throw new Error(`Unsupported campaign series: ${campaign.series}`);
  }

  let recipients: CampaignRecipient[] = [];
  let blocked: CampaignBlockedRecipient[] = [];
  if (campaign.source_kind === "zn_waitlist") {
    const draft = await getCampaignDraft(campaign.id);
    return estimateWaitlistRecipients({
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      baseUrl: baseUrl(),
      selectedEmailsText: draft?.custom_emails_text,
    });
  }

  if (campaign.source_kind === "email_subscribers") {
    recipients = await resolveSubscriberRecipients(campaign.series.trim());
    return { count: recipients.length, sample: recipients, blocked: [] };
  }

  const draft = await getCampaignDraft(campaign.id);
  const customEstimate = await resolveCustomEmailRecipients(
    campaign.series,
    draft?.custom_emails_text,
  );
  recipients = customEstimate.sample;
  blocked = customEstimate.blocked;
  return { count: recipients.length, sample: recipients, blocked };
}

async function resolveCampaignPreviewRecipient(
  campaign: CampaignRecord,
): Promise<CampaignRecipient | null> {
  if (campaign.source_kind === "zn_waitlist") {
    const draft = await getCampaignDraft(campaign.id);
    return getWaitlistRecipientSample({
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      baseUrl: baseUrl(),
      selectedEmailsText: draft?.custom_emails_text,
    });
  }

  if (campaign.source_kind === "email_subscribers") {
    if (!isSupportedCampaignSeries(campaign.series)) {
      throw new Error(`Unsupported campaign series: ${campaign.series}`);
    }
    return resolveSubscriberPreviewRecipient(campaign.series.trim());
  }

  const draft = await getCampaignDraft(campaign.id);
  const estimate = await resolveCustomEmailRecipients(campaign.series, draft?.custom_emails_text);
  return estimate.sample[0] ?? null;
}

async function snapshotWaitlistCampaignRecipientsViaRpc(args: {
  campaignId: string;
  audienceScope: CampaignAudienceScope;
  dedupeMode: CampaignDedupeMode;
  selectedEmailsText: string | null | undefined;
}): Promise<void> {
  const { normalizedEmails, invalidEmails } = parseCustomEmailsText(args.selectedEmailsText);
  if (invalidEmails.length > 0) {
    throw new Error(`Invalid email address: ${invalidEmails.slice(0, 5).join(", ")}`);
  }
  if (args.audienceScope === "selected_emails" && normalizedEmails.length === 0) {
    throw new Error("Enter at least one valid waitlist email address.");
  }

  const { error } = await db.rpc("snapshot_waitlist_campaign_recipients", {
    p_campaign_id: args.campaignId,
    p_audience_scope: args.audienceScope,
    p_dedupe_mode: args.dedupeMode,
    p_selected_emails: normalizedEmails,
    p_base_url: baseUrl(),
  });
  if (error) throw new Error(error.message);
}

async function snapshotNonWaitlistCampaignRecipientsViaRpc(args: {
  campaignId: string;
  sourceKind: Exclude<CampaignSourceKind, "zn_waitlist">;
  series: string | null | undefined;
  customEmailsText: string | null | undefined;
}): Promise<void> {
  const { normalizedEmails, invalidEmails } = parseCustomEmailsText(args.customEmailsText);
  if (invalidEmails.length > 0) {
    throw new Error(`Invalid email address: ${invalidEmails.slice(0, 5).join(", ")}`);
  }
  if (args.sourceKind === "custom_emails" && normalizedEmails.length === 0) {
    throw new Error("Enter at least one valid custom email address.");
  }

  const { error } = await db.rpc("snapshot_non_waitlist_campaign_recipients", {
    p_campaign_id: args.campaignId,
    p_source_kind: args.sourceKind,
    p_series: args.series?.trim() || null,
    p_custom_emails: normalizedEmails,
    p_base_url: baseUrl(),
  });
  if (error) throw new Error(error.message);
}

export async function listScheduledCampaignAttempts(
  campaignId: string,
): Promise<
  Array<{
    id: string;
    recipient_snapshot_id: string;
    provider_message_id: string | null;
    email: string;
    status: "scheduled";
    scheduled_for: string | null;
    error: string | null;
  }>
> {
  const { data, error } = await db
    .from("campaign_send_attempts")
    .select("id, recipient_snapshot_id, provider_message_id, email, status, scheduled_for, error")
    .eq("campaign_id", campaignId)
    .eq("status", "scheduled")
    .order("scheduled_for", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    recipient_snapshot_id: String(row.recipient_snapshot_id),
    provider_message_id: row.provider_message_id ? String(row.provider_message_id) : null,
    email: String(row.email),
    status: "scheduled",
    scheduled_for: row.scheduled_for ? String(row.scheduled_for) : null,
    error: row.error ? String(row.error) : null,
  }));
}

export async function resolveCampaignRecipients(campaign: CampaignRecord): Promise<CampaignRecipient[]> {
  const estimate = await resolveCampaignRecipientEstimate(campaign);
  if (campaign.source_kind === "custom_emails" && hasSeriesSelection(campaign.series)) {
    const normalizedSeries = campaign.series.trim();
    for (const recipient of estimate.sample) {
      const existing = await getSubscriberRecord(recipient.normalizedEmail, normalizedSeries);
      if (existing?.unsubscribed_at) continue;
      if (existing?.confirmed_at) continue;
      await upsertSubscriber({
        email: recipient.normalizedEmail,
        series: normalizedSeries,
        emailVerified: false,
        source: "campaign_custom_send",
        confirmedAt: new Date().toISOString(),
        confirmTokenSentAt: null,
        unsubscribedAt: null,
        unsubscribeReason: null,
      });
    }
  }
  return estimate.sample;
}

export async function estimateCampaignRecipients(campaignId: string): Promise<CampaignRecipientEstimate> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  const draft = await getCampaignDraft(campaignId);
  const estimate = await resolveCampaignRecipientEstimate(campaign);
  const normalized = normalizeRecipientEstimatePayload(estimate);
  const cacheKey = buildCampaignRecipientEstimateCacheKey({
    sourceKind: campaign.source_kind,
    audienceScope: campaign.audience_scope,
    dedupeMode: campaign.dedupe_mode,
    series: campaign.series,
    customEmailsText: draft?.custom_emails_text,
  });
  const { error } = await db
    .from("campaigns")
    .update({
      recipient_count: estimate.count,
      recipient_sample: normalized.sample,
      recipient_blocked: normalized.blocked,
      recipient_estimate_generated_at: new Date().toISOString(),
      recipient_estimate_cache_key: cacheKey,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
  return { ...estimate, sample: estimate.sample.slice(0, 5) };
}

export async function getCampaignPreviewRecipient(
  campaignId: string,
): Promise<CampaignRecipient | null> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  return resolveCampaignPreviewRecipient(campaign);
}

export async function snapshotCampaignRecipients(campaignId: string): Promise<CampaignRecipientSnapshotRecord[]> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  const draft = await getCampaignDraft(campaignId);

  if (campaign.source_kind === "zn_waitlist") {
    await snapshotWaitlistCampaignRecipientsViaRpc({
      campaignId,
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      selectedEmailsText: draft?.custom_emails_text,
    });
    return listCampaignRecipientSnapshots(campaignId);
  }

  await snapshotNonWaitlistCampaignRecipientsViaRpc({
    campaignId,
    sourceKind: campaign.source_kind,
    series: campaign.series,
    customEmailsText: draft?.custom_emails_text,
  });
  return listCampaignRecipientSnapshots(campaignId);
}

export async function listCampaignDeliveryBatches(
  campaignId: string,
): Promise<CampaignDeliveryBatchRecord[]> {
  try {
    const { data, error } = await db
      .from("campaign_delivery_batches")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("batch_number", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      campaign_id: String(row.campaign_id),
      batch_number: Number(row.batch_number),
      status: row.status as CampaignDeliveryBatchStatus,
      recipient_count: Number(row.recipient_count ?? 0),
      sent_count: Number(row.sent_count ?? 0),
      failed_count: Number(row.failed_count ?? 0),
      next_eligible_at: row.next_eligible_at ? String(row.next_eligible_at) : null,
      started_at: row.started_at ? String(row.started_at) : null,
      completed_at: row.completed_at ? String(row.completed_at) : null,
      last_error: row.last_error ? String(row.last_error) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }));
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

async function updateCampaignDeliveryState(campaignId: string): Promise<void> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return;
  const batches = await listCampaignDeliveryBatches(campaignId);
  if (batches.length === 0) return;

  const anyPending = batches.some((batch) => batch.status === "pending");
  const anySending = batches.some((batch) => batch.status === "sending");
  const anyFailed = batches.some((batch) => batch.status === "failed");
  const anySent = batches.some((batch) => batch.status === "sent");
  const anyActive = anyPending || anySending;

  let status: CampaignStatus;
  if (campaign.delivery_canceled_at) {
    status = anySent ? "partial" : "failed";
  } else if (anySending) {
    status = "sending";
  } else if (anyPending) {
    status = anySent || anyFailed ? "sending" : "scheduled";
  } else if (anyFailed) {
    status = anySent ? "partial" : "failed";
  } else {
    status = "sent";
  }

  await markCampaignStatus(campaignId, status, {
    send_started_at: campaign.send_started_at ?? (anyActive || anySent ? new Date().toISOString() : null),
    send_completed_at: anyActive ? null : new Date().toISOString(),
    recipient_count: campaign.recipient_count,
  });
}

export async function createCampaignDeliveryBatches(
  campaignId: string,
  options?: {
    startAt?: string | null;
    batchSize?: number;
    intervalMinutes?: number;
  },
): Promise<CampaignDeliveryBatchRecord[]> {
  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found.");

    const batchSize = options?.batchSize ?? campaign.delivery_batch_size ?? DEFAULT_DELIVERY_BATCH_SIZE;
    const intervalMinutes =
      options?.intervalMinutes ??
      campaign.delivery_batch_interval_minutes ??
      DEFAULT_DELIVERY_BATCH_INTERVAL_MINUTES;
    const startAt = options?.startAt ? new Date(options.startAt) : new Date();
    if (Number.isNaN(startAt.getTime())) throw new Error("Invalid batch start time.");

    await snapshotCampaignRecipients(campaignId);
    const { error: batchError } = await db.rpc("create_campaign_delivery_batches_sql", {
      p_campaign_id: campaignId,
      p_start_at: startAt.toISOString(),
      p_batch_size: batchSize,
      p_interval_minutes: intervalMinutes,
    });
    if (batchError) throw batchError;

    return listCampaignDeliveryBatches(campaignId);
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

export async function pauseCampaignDelivery(campaignId: string): Promise<void> {
  try {
    const { error } = await db
      .from("campaigns")
      .update({
        delivery_paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    if (error) throw error;
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

export async function resumeCampaignDelivery(campaignId: string): Promise<void> {
  try {
    const { error } = await db
      .from("campaigns")
      .update({
        delivery_paused_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);
    if (error) throw error;
    await updateCampaignDeliveryState(campaignId);
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

export async function cancelCampaignDelivery(campaignId: string): Promise<void> {
  try {
    const campaign = await getCampaign(campaignId);
    if (!campaign) throw new Error("Campaign not found.");

    const batches = await listCampaignDeliveryBatches(campaignId).catch((error) => {
      throw normalizeCampaignDeliveryError(error);
    });
    if (batches.length === 0) {
      const scheduledAttempts = await listScheduledCampaignAttempts(campaignId);
      if (scheduledAttempts.length > 0) {
        let firstError: string | null = null;

        for (const attempt of scheduledAttempts) {
          if (!attempt.provider_message_id) continue;
          try {
            await cancelScheduledEmail(attempt.provider_message_id);
          } catch (error) {
            if (!firstError) firstError = extractErrorMessage(error).slice(0, 1000);
          }
        }

        const canceledAt = new Date().toISOString();
        const cancelMessage = firstError ?? "Canceled before provider delivery.";
        const { error: campaignError } = await db
          .from("campaigns")
          .update({
            delivery_canceled_at: canceledAt,
            updated_at: canceledAt,
          })
          .eq("id", campaignId);
        if (campaignError) throw campaignError;

        const { error: attemptError } = await db
          .from("campaign_send_attempts")
          .update({
            error: cancelMessage,
          })
          .eq("campaign_id", campaignId)
          .eq("status", "scheduled");
        if (attemptError) throw attemptError;

        const { error: snapshotError } = await db
          .from("campaign_recipient_snapshots")
          .update({
            last_error: cancelMessage,
          })
          .eq("campaign_id", campaignId)
          .eq("send_status", "scheduled");
        if (snapshotError) throw snapshotError;

        await markCampaignStatus(campaignId, "failed", {
          scheduled_at: campaign.scheduled_at,
          send_started_at: campaign.send_started_at,
          send_completed_at: campaign.send_completed_at,
          recipient_count: campaign.recipient_count,
        });
        return;
      }
    }

    const canceledAt = new Date().toISOString();
    const { error: campaignError } = await db
      .from("campaigns")
      .update({
        delivery_canceled_at: canceledAt,
        updated_at: canceledAt,
      })
      .eq("id", campaignId);
    if (campaignError) throw campaignError;

    const { error: batchError } = await db
      .from("campaign_delivery_batches")
      .update({
        status: "canceled",
        completed_at: canceledAt,
        updated_at: canceledAt,
      })
      .eq("campaign_id", campaignId)
      .in("status", ["pending", "sending"]);
    if (batchError) throw batchError;

    await updateCampaignDeliveryState(campaignId);
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

async function listBatchSnapshots(batchId: string): Promise<CampaignRecipientSnapshotRecord[]> {
  const { data, error } = await db
    .from("campaign_recipient_snapshots")
    .select("*")
    .eq("campaign_delivery_batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    campaign_delivery_batch_id: row.campaign_delivery_batch_id
      ? String(row.campaign_delivery_batch_id)
      : null,
    recipient_key: String(row.recipient_key),
    email: String(row.email),
    normalized_email: String(row.normalized_email),
    source_kind: row.source_kind as CampaignSourceKind,
    source_row_ids: Array.isArray(row.source_row_ids)
      ? row.source_row_ids.map((value) => String(value))
      : [],
    personalization: row.personalization as CampaignRecipientSnapshotRecord["personalization"],
    send_status: row.send_status as CampaignRecipientSnapshotRecord["send_status"],
    sent_at: row.sent_at ? String(row.sent_at) : null,
    last_error: row.last_error ? String(row.last_error) : null,
    created_at: String(row.created_at),
  }));
}

async function recordScheduledCampaignAttempt(args: {
  campaignId: string;
  snapshotId: string;
  email: string;
  providerMessageId?: string | null;
  scheduledFor: string;
  personalization?: CampaignRecipientSnapshotRecord["personalization"];
}): Promise<void> {
  const attemptedAt = new Date().toISOString();
  const { error: attemptError } = await db.from("campaign_send_attempts").insert({
    campaign_id: args.campaignId,
    recipient_snapshot_id: args.snapshotId,
    email: args.email,
    status: "scheduled",
    provider_message_id: args.providerMessageId ?? null,
    scheduled_for: args.scheduledFor,
    error: null,
    attempted_at: attemptedAt,
  });
  if (attemptError) throw new Error(attemptError.message);

  const { error: snapshotError } = await db
    .from("campaign_recipient_snapshots")
    .update({
      send_status: "scheduled",
      sent_at: null,
      last_error: null,
      personalization: args.personalization,
    })
    .eq("id", args.snapshotId);
  if (snapshotError) throw new Error(snapshotError.message);
}

export async function scheduleCampaignWithResend(
  campaignId: string,
  scheduledAt: string,
): Promise<{
  scheduledCount: number;
  failedCount: number;
  firstError: string | null;
}> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error("Invalid scheduled time.");
  }

  await snapshotCampaignRecipients(campaignId);

  const draft = await getCampaignDraft(campaignId);
  if (!draft) throw new Error("Campaign draft not found.");

  const referralStatsContext =
    campaign.source_kind === "zn_waitlist" ? await buildCampaignReferralStatsContext() : null;
  const includeUnsubscribe = shouldIncludeUnsubscribe(
    campaign.source_kind,
    campaign.series,
    campaign.include_unsubscribe,
  );
  const deliverySeries = campaign.source_kind === "zn_waitlist" ? null : campaign.series;
  const skipConsentCheck =
    campaign.source_kind === "zn_waitlist" ||
    (campaign.source_kind === "custom_emails" && !hasSeriesSelection(campaign.series));
  const snapshots = (await listCampaignRecipientSnapshots(campaignId)).filter(
    (snapshot) => snapshot.send_status === "pending",
  );

  let scheduledCount = 0;
  let failedCount = 0;
  let firstError: string | null = null;

  for (const snapshot of snapshots) {
    const personalization =
      campaign.source_kind === "zn_waitlist"
        ? withCampaignReferralStats(
            snapshot.personalization,
            snapshot.personalization.referralCode
              ? referralStatsContext?.get(snapshot.personalization.referralCode) ?? null
              : null,
          )
        : withCampaignReferralStats(snapshot.personalization, null);

    try {
      const result = await sendCampaignEmail({
        to: snapshot.email,
        subject: draft.subject,
        bodyText: draft.body_text,
        personalization,
        series: deliverySeries,
        includeUnsubscribe,
        scheduledAt,
        skipConsentCheck,
      });
      await recordScheduledCampaignAttempt({
        campaignId,
        snapshotId: snapshot.id,
        email: snapshot.email,
        providerMessageId: result.id ?? null,
        scheduledFor: scheduledAt,
        personalization,
      });
      scheduledCount += 1;
    } catch (error) {
      const message = extractErrorMessage(error).slice(0, 1000);
      if (!firstError) firstError = message;
      await recordCampaignAttempt({
        campaignId,
        snapshotId: snapshot.id,
        email: snapshot.email,
        status: "failed",
        error: message,
        personalization,
      });
      failedCount += 1;
    }
  }

  await markCampaignStatus(campaignId, "scheduled", {
    scheduled_at: scheduledAt,
    send_started_at: null,
    send_completed_at: null,
    recipient_count: campaign.recipient_count,
  });

  return {
    scheduledCount,
    failedCount,
    firstError,
  };
}

async function drainSpecificCampaignBatch(batch: {
  id: string;
  campaign_id: string;
  batch_number: number;
  status: CampaignDeliveryBatchStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  next_eligible_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}): Promise<{
  processed: boolean;
  campaignId?: string;
  batchId?: string;
  status?: CampaignDeliveryBatchStatus;
}> {
  const campaign = await getCampaign(batch.campaign_id);
  if (!campaign) return { processed: false };
  if (campaign.delivery_canceled_at || campaign.delivery_paused_at) return { processed: false };

  const nowIso = new Date().toISOString();
  const { error: markError } = await db
    .from("campaign_delivery_batches")
    .update({
      status: "sending",
      started_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", batch.id)
    .eq("status", "pending");
  if (markError) throw new Error(markError.message);

  try {
    const draft = await getCampaignDraft(batch.campaign_id);
    if (!draft) throw new Error("Campaign draft not found.");
    const referralStatsContext =
      campaign.source_kind === "zn_waitlist" ? await buildCampaignReferralStatsContext() : null;
    const includeUnsubscribe = shouldIncludeUnsubscribe(
      campaign.source_kind,
      campaign.series,
      campaign.include_unsubscribe,
    );
    const deliverySeries =
      campaign.source_kind === "zn_waitlist" ? null : campaign.series;
    const skipConsentCheck =
      campaign.source_kind === "zn_waitlist" ||
      (campaign.source_kind === "custom_emails" && !hasSeriesSelection(campaign.series));
    const snapshots = (await listBatchSnapshots(batch.id)).filter(
      (snapshot) => snapshot.send_status === "pending",
    );

    let sentCount = 0;
    let failedCount = 0;
    const prepared: Array<{
      snapshot: CampaignRecipientSnapshotRecord;
      personalization: CampaignRecipientSnapshotRecord["personalization"];
      sendArgs: CampaignSendEmailArgs;
      batchPayload: Awaited<ReturnType<typeof buildCampaignBatchEmailPayload>>;
    }> = [];

    for (const snapshot of snapshots) {
      const personalization =
        campaign.source_kind === "zn_waitlist"
          ? withCampaignReferralStats(
              snapshot.personalization,
              snapshot.personalization.referralCode
                ? referralStatsContext?.get(snapshot.personalization.referralCode) ?? null
                : null,
            )
          : withCampaignReferralStats(snapshot.personalization, null);
      const sendArgs: CampaignSendEmailArgs = {
        to: snapshot.email,
        subject: draft.subject,
        bodyText: draft.body_text,
        personalization,
        series: deliverySeries,
        includeUnsubscribe,
        skipConsentCheck,
      };

      try {
        const batchPayload = await buildCampaignBatchEmailPayload(sendArgs);
        prepared.push({ snapshot, personalization, sendArgs, batchPayload });
      } catch (prepError) {
        const message = extractErrorMessage(prepError).slice(0, 1000);
        await recordCampaignAttempt({
          campaignId: batch.campaign_id,
          snapshotId: snapshot.id,
          email: snapshot.email,
          status: "failed",
          error: message,
          personalization,
        });
        failedCount += 1;
      }
    }

    try {
      if (prepared.length > 0) {
        const results = await sendCampaignEmailBatch(prepared.map((entry) => entry.batchPayload));
        for (let index = 0; index < prepared.length; index += 1) {
          const entry = prepared[index];
          const result = results[index];
          await recordCampaignAttempt({
            campaignId: batch.campaign_id,
            snapshotId: entry.snapshot.id,
            email: entry.snapshot.email,
            status: "sent",
            providerMessageId: result?.id ?? null,
            personalization: entry.personalization,
          });
          sentCount += 1;
        }
      }
    } catch (batchError) {
      for (const entry of prepared) {
        try {
          const result = await sendCampaignEmail(entry.sendArgs);
          await recordCampaignAttempt({
            campaignId: batch.campaign_id,
            snapshotId: entry.snapshot.id,
            email: entry.snapshot.email,
            status: "sent",
            providerMessageId: result.id ?? null,
            personalization: entry.personalization,
          });
          sentCount += 1;
        } catch (error) {
          const message = extractErrorMessage(error ?? batchError).slice(0, 1000);
          await recordCampaignAttempt({
            campaignId: batch.campaign_id,
            snapshotId: entry.snapshot.id,
            email: entry.snapshot.email,
            status: "failed",
            error: message,
            personalization: entry.personalization,
          });
          failedCount += 1;
        }
      }
    }

    const finalStatus: CampaignDeliveryBatchStatus = failedCount > 0 ? "failed" : "sent";
    const completedAt = new Date().toISOString();
    const { error: completeError } = await db
      .from("campaign_delivery_batches")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: completedAt,
        last_error: failedCount > 0 ? "One or more recipients failed in this batch." : null,
        updated_at: completedAt,
      })
      .eq("id", batch.id);
    if (completeError) throw new Error(completeError.message);

    await updateCampaignDeliveryState(batch.campaign_id);
    return {
      processed: true,
      campaignId: batch.campaign_id,
      batchId: batch.id,
      status: finalStatus,
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    const message = extractErrorMessage(error).slice(0, 1000);
    await db
      .from("campaign_delivery_batches")
      .update({
        status: "failed",
        completed_at: failedAt,
        last_error: message,
        updated_at: failedAt,
      })
      .eq("id", batch.id);
    await updateCampaignDeliveryState(batch.campaign_id).catch(() => undefined);
    throw new Error(message);
  }
}

export async function drainNextEligibleCampaignBatch(): Promise<{
  processed: boolean;
  campaignId?: string;
  batchId?: string;
  status?: CampaignDeliveryBatchStatus;
}> {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await db
      .from("campaign_delivery_batches")
      .select("*")
      .eq("status", "pending")
      .lte("next_eligible_at", nowIso)
      .order("next_eligible_at", { ascending: true })
      .order("batch_number", { ascending: true })
      .limit(20);
    if (error) throw error;

    const eligible = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      campaign_id: String(row.campaign_id),
      batch_number: Number(row.batch_number),
      status: row.status as CampaignDeliveryBatchStatus,
      recipient_count: Number(row.recipient_count ?? 0),
      sent_count: Number(row.sent_count ?? 0),
      failed_count: Number(row.failed_count ?? 0),
      next_eligible_at: row.next_eligible_at ? String(row.next_eligible_at) : null,
      started_at: row.started_at ? String(row.started_at) : null,
      completed_at: row.completed_at ? String(row.completed_at) : null,
      last_error: row.last_error ? String(row.last_error) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    }));

    for (const batch of eligible) {
      const result = await drainSpecificCampaignBatch(batch);
      if (result.processed) return result;
    }

    return { processed: false };
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

export async function drainEligibleCampaignBatches(
  campaignId: string,
): Promise<{
  processedCount: number;
  lastStatus?: CampaignDeliveryBatchStatus;
}> {
  try {
    let processedCount = 0;
    let lastStatus: CampaignDeliveryBatchStatus | undefined;

    while (true) {
      const nowIso = new Date().toISOString();
      const { data, error } = await db
        .from("campaign_delivery_batches")
        .select("*")
        .eq("campaign_id", campaignId)
        .eq("status", "pending")
        .lte("next_eligible_at", nowIso)
        .order("batch_number", { ascending: true })
        .limit(1);
      if (error) throw error;

      const nextBatchRow = ((data ?? []) as Array<Record<string, unknown>>)[0];
      const nextBatch = nextBatchRow
        ? {
            id: String(nextBatchRow.id),
            campaign_id: String(nextBatchRow.campaign_id),
            batch_number: Number(nextBatchRow.batch_number),
            status: nextBatchRow.status as CampaignDeliveryBatchStatus,
            recipient_count: Number(nextBatchRow.recipient_count ?? 0),
            sent_count: Number(nextBatchRow.sent_count ?? 0),
            failed_count: Number(nextBatchRow.failed_count ?? 0),
            next_eligible_at: nextBatchRow.next_eligible_at
              ? String(nextBatchRow.next_eligible_at)
              : null,
            started_at: nextBatchRow.started_at ? String(nextBatchRow.started_at) : null,
            completed_at: nextBatchRow.completed_at ? String(nextBatchRow.completed_at) : null,
            last_error: nextBatchRow.last_error ? String(nextBatchRow.last_error) : null,
            created_at: String(nextBatchRow.created_at),
            updated_at: String(nextBatchRow.updated_at),
          }
        : null;
      if (!nextBatch) break;

      const result = await drainSpecificCampaignBatch(nextBatch);
      if (!result.processed) break;

      processedCount += 1;
      lastStatus = result.status;
    }

    return { processedCount, lastStatus };
  } catch (error) {
    throw normalizeCampaignDeliveryError(error);
  }
}

export async function listCampaignRecipientSnapshots(
  campaignId: string,
): Promise<CampaignRecipientSnapshotRecord[]> {
  const { data, error } = await db
    .from("campaign_recipient_snapshots")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    campaign_delivery_batch_id: row.campaign_delivery_batch_id
      ? String(row.campaign_delivery_batch_id)
      : null,
    recipient_key: String(row.recipient_key),
    email: String(row.email),
    normalized_email: String(row.normalized_email),
    source_kind: row.source_kind as CampaignSourceKind,
    source_row_ids: Array.isArray(row.source_row_ids)
      ? row.source_row_ids.map((value) => String(value))
      : [],
    personalization: row.personalization as CampaignRecipientSnapshotRecord["personalization"],
    send_status: row.send_status as CampaignRecipientSnapshotRecord["send_status"],
    sent_at: row.sent_at ? String(row.sent_at) : null,
    last_error: row.last_error ? String(row.last_error) : null,
    created_at: String(row.created_at),
  }));
}

export async function markCampaignStatus(
  campaignId: string,
  status: CampaignStatus,
  patch?: Partial<Pick<CampaignRecord, "scheduled_at" | "send_started_at" | "send_completed_at" | "recipient_count">>,
): Promise<void> {
  const update: Record<string, string | number | null> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (patch?.scheduled_at !== undefined) update.scheduled_at = patch.scheduled_at;
  if (patch?.send_started_at !== undefined) update.send_started_at = patch.send_started_at;
  if (patch?.send_completed_at !== undefined) update.send_completed_at = patch.send_completed_at;
  if (patch?.recipient_count !== undefined) update.recipient_count = patch.recipient_count;
  const { error } = await db.from("campaigns").update(update).eq("id", campaignId);
  if (error) throw new Error(error.message);
}

export async function recordCampaignAttempt(args: {
  campaignId: string;
  snapshotId: string;
  email: string;
  status: "sent" | "failed";
  providerMessageId?: string | null;
  error?: string | null;
  personalization?: CampaignRecipientSnapshotRecord["personalization"];
}): Promise<void> {
  const attemptedAt = new Date().toISOString();
  const { error: attemptError } = await db.from("campaign_send_attempts").insert({
    campaign_id: args.campaignId,
    recipient_snapshot_id: args.snapshotId,
    email: args.email,
    status: args.status,
    provider_message_id: args.providerMessageId ?? null,
    error: args.error ?? null,
    attempted_at: attemptedAt,
  });
  if (attemptError) throw new Error(attemptError.message);

  const { error: snapshotError } = await db
    .from("campaign_recipient_snapshots")
    .update({
      send_status: args.status,
      sent_at: args.status === "sent" ? attemptedAt : null,
      last_error: args.error ?? null,
      personalization: args.personalization,
    })
    .eq("id", args.snapshotId);
  if (snapshotError) throw new Error(snapshotError.message);
}

export async function listCampaignAttempts(campaignId: string): Promise<
  Array<{
    id: string;
    recipient_snapshot_id: string;
    email: string;
    status: string;
    provider_message_id: string | null;
    scheduled_for: string | null;
    error: string | null;
    attempted_at: string;
  }>
> {
  const { data, error } = await db
    .from("campaign_send_attempts")
    .select("id, recipient_snapshot_id, email, status, provider_message_id, scheduled_for, error, attempted_at")
    .eq("campaign_id", campaignId)
    .order("attempted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    recipient_snapshot_id: string;
    email: string;
    status: string;
    provider_message_id: string | null;
    scheduled_for: string | null;
    error: string | null;
    attempted_at: string;
  }>;
}
