import "server-only";

import { db } from "@/lib/db";
import {
  campaignTextUsesWaitlistConfirmResponseToken,
  campaignTextUsesWaitlistNameInterestToken,
  campaignTextUsesWaitlistReserveToken,
  campaignDraftUsesBetaInviteTokens,
  defaultCampaignBodyText,
  defaultCampaignSubject,
  defaultCampaignTitle,
  getCampaignBetaTokenUsage,
} from "@/lib/campaigns/content";
import {
  getBetaInviteDataByEmail,
} from "@/lib/campaigns/beta-invite";
import {
  getSubscriberRecord,
  upsertSubscriber,
} from "@/lib/email/subscribers";
import {
  sendCampaignEmail,
  type CampaignSendEmailArgs,
} from "@/lib/email/campaign";
import { cancelScheduledEmail } from "@/lib/email/client";
import {
  enrichWaitlistNameInterestCounts,
  estimateWaitlistRecipients,
  getWaitlistRecipientSample,
  listWaitlistPersonalizationsByEmail,
  listWaitlistRecipients,
} from "@/lib/campaigns/waitlist";
import { listActiveSuppressedEmailSet } from "@/lib/campaigns/suppression";
import { getProviderManagedScheduleState } from "@/lib/campaigns/provider-schedule";
import { buildCampaignReferralStatsContext, withCampaignReferralStats } from "@/lib/campaigns/referral-stats";
import { getDefaultCampaignSeries, isSupportedCampaignSeries } from "@/lib/campaigns/series";
import {
  buildWaitlistConfirmResponseTrackingUrl,
  buildWaitlistReserveUrl,
} from "@/lib/campaigns/waitlist-confirm-response";
import { resolveSiteUrl } from "@/lib/site-url";
import {
  WAITLIST_CAMPAIGN_SERIES,
  type CampaignAudienceScope,
  type CampaignBlockedRecipient,
  type CampaignDeliveryBatchRecord,
  type CampaignDeliveryBatchStatus,
  type CampaignDedupeMode,
  type CampaignDraftInput,
  type CampaignDraftRecord,
  type CampaignPersonalizationMode,
  type CampaignRecipient,
  type CampaignRecipientEstimate,
  type CampaignRecipientPersonalization,
  type CampaignRecipientSnapshotRecord,
  type CampaignRecord,
  type CampaignSendAttemptRecord,
  type CampaignTargetSeries,
  type CampaignSourceKind,
  type CampaignStatus,
} from "@/lib/campaigns/types";

export const LARGE_CAMPAIGN_THRESHOLD = 500;
export const DEFAULT_DELIVERY_BATCH_SIZE = 100;
export const DEFAULT_DELIVERY_BATCH_INTERVAL_MINUTES = 2;
const POSTGREST_PAGE_SIZE = 1000;
const IN_FILTER_CHUNK_SIZE = 100;
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

function waitlistDeliverySeries(): string {
  return WAITLIST_CAMPAIGN_SERIES;
}

function baseUrl(): string {
  return resolveSiteUrl();
}

function normalizeDraftInput(draft: CampaignDraftInput): CampaignDraftInput {
  return {
    subject: draft.subject.trim(),
    bodyText: draft.bodyText.replace(/\r\n?/g, "\n").trim(),
    headingText: draft.headingText?.trim() ? draft.headingText.trim() : null,
    showRelatedNamesFooter: draft.showRelatedNamesFooter !== false,
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
      confirmResponseUrl: null,
      reserveUrl: null,
      betaDisplayName: null,
      betaInviteCode: null,
      betaInviteLink: null,
      otherInterestedCount: null,
      referralStats: null,
      relatedNames: [fallbackName],
      ...personalizationOverrides,
    },
  };
}

function withBetaInvitePersonalization(
  personalization: CampaignRecipientPersonalization,
  betaInvite:
    | {
        betaDisplayName: string | null;
        betaInviteCode: string | null;
        betaInviteLink: string | null;
      }
    | null
    | undefined,
): CampaignRecipientPersonalization {
  return {
    ...personalization,
    betaDisplayName: betaInvite?.betaDisplayName ?? null,
    betaInviteCode: betaInvite?.betaInviteCode ?? null,
    betaInviteLink: betaInvite?.betaInviteLink ?? null,
  };
}

function betaInviteFailureReason(
  recipient: CampaignRecipient,
): CampaignBlockedRecipient {
  return {
    email: recipient.email,
    normalizedEmail: recipient.normalizedEmail,
    reason: "missing_beta_invite",
  };
}

async function applyBetaInviteTokenRules(args: {
  estimate: CampaignRecipientEstimate;
  betaTokenUsage: ReturnType<typeof getCampaignBetaTokenUsage>;
  baseUrl?: string | null;
}): Promise<CampaignRecipientEstimate> {
  if (
    !args.betaTokenUsage.usesBetaDisplayName &&
    !args.betaTokenUsage.usesBetaInviteCode &&
    !args.betaTokenUsage.usesBetaInviteLink
  ) {
    return args.estimate;
  }

  const betaInviteByEmail = await getBetaInviteDataByEmail({
    emails: args.estimate.sample.map((recipient) => recipient.normalizedEmail),
    baseUrl: args.baseUrl,
  });

  const sample: CampaignRecipient[] = [];
  const blocked = [...args.estimate.blocked];
  const blockedKeys = new Set(
    blocked.map((recipient) => `${recipient.normalizedEmail}:${recipient.reason}`),
  );

  for (const recipient of args.estimate.sample) {
    const betaInvite = betaInviteByEmail.get(recipient.normalizedEmail);
    const missingMatch = !betaInvite;
    const missingDisplayName =
      args.betaTokenUsage.usesBetaDisplayName && !betaInvite?.betaDisplayName;
    const missingInviteData =
      (args.betaTokenUsage.usesBetaInviteCode || args.betaTokenUsage.usesBetaInviteLink) &&
      (!betaInvite?.betaInviteCode || !betaInvite?.betaInviteLink);
    if (missingMatch || missingDisplayName || missingInviteData) {
      const blockedRecipient = betaInviteFailureReason(recipient);
      const blockedKey = `${blockedRecipient.normalizedEmail}:${blockedRecipient.reason}`;
      if (!blockedKeys.has(blockedKey)) {
        blocked.push(blockedRecipient);
        blockedKeys.add(blockedKey);
      }
      continue;
    }

    sample.push({
      ...recipient,
      personalization: withBetaInvitePersonalization(
        recipient.personalization,
        betaInvite,
      ),
    });
  }

  return {
    count: sample.length,
    sample,
    blocked,
  };
}

function validateRequiredCampaignTokens(args: {
  sourceKind: CampaignSourceKind;
  subject: string;
  bodyText: string;
  headingText?: string | null;
  betaTokenUsage: ReturnType<typeof getCampaignBetaTokenUsage>;
  personalization: CampaignRecipientPersonalization;
}): string | null {
  const usesConfirmResponseToken =
    campaignTextUsesWaitlistConfirmResponseToken(args.subject) ||
    campaignTextUsesWaitlistConfirmResponseToken(args.bodyText) ||
    campaignTextUsesWaitlistConfirmResponseToken(args.headingText ?? "");
  if (usesConfirmResponseToken && !args.personalization.confirmResponseUrl) {
    return "Waitlist confirm response tracking URL is unavailable. Ensure the recipient is waitlist-backed and the production click route is deployed on zcashnames.com.";
  }
  const usesReserveToken =
    campaignTextUsesWaitlistReserveToken(args.subject) ||
    campaignTextUsesWaitlistReserveToken(args.bodyText) ||
    campaignTextUsesWaitlistReserveToken(args.headingText ?? "");
  if (usesReserveToken && !args.personalization.reserveUrl) {
    return "Waitlist reserve URL is unavailable. Ensure the recipient is waitlist-backed.";
  }
  if (
    args.betaTokenUsage.usesBetaDisplayName &&
    !args.personalization.betaDisplayName
  ) {
    return "Recipient is missing beta display name.";
  }
  if (
    (args.betaTokenUsage.usesBetaInviteCode || args.betaTokenUsage.usesBetaInviteLink) &&
    (!args.personalization.betaInviteCode || !args.personalization.betaInviteLink)
  ) {
    return "Recipient is missing beta invite code.";
  }
  return null;
}

function withWaitlistConfirmResponseUrl(args: {
  personalization: CampaignRecipientPersonalization;
  normalizedEmail: string;
  campaignId: string;
  baseUrl?: string;
  fallbackToSample?: boolean;
}): CampaignRecipientPersonalization {
  return {
    ...args.personalization,
    confirmResponseUrl: buildWaitlistConfirmResponseTrackingUrl({
      normalizedEmail: args.normalizedEmail,
      campaignId: args.campaignId,
      baseUrl: args.baseUrl ?? baseUrl(),
      fallbackToSample: args.fallbackToSample,
    }),
    reserveUrl: buildWaitlistReserveUrl({
      normalizedEmail: args.normalizedEmail,
      campaignId: args.campaignId,
      fallbackToSample: args.fallbackToSample,
    }),
  };
}

async function enrichPendingSnapshotPersonalization(
  campaignId: string,
  draft: CampaignDraftRecord | null,
): Promise<void> {
  if (!draft) return;
  const usesBetaInviteTokens = campaignDraftUsesBetaInviteTokens({
    subject: draft.subject,
    bodyText: draft.body_text,
    headingText: draft.heading_text,
  });
  const usesNameInterestCount =
    campaignTextUsesWaitlistNameInterestToken(draft.subject) ||
    campaignTextUsesWaitlistNameInterestToken(draft.body_text) ||
    campaignTextUsesWaitlistNameInterestToken(draft.heading_text ?? "");
  if (!usesBetaInviteTokens && !usesNameInterestCount) return;

  const snapshots = (await listCampaignRecipientSnapshots(campaignId)).filter(
    (snapshot) => snapshot.send_status === "pending",
  );
  if (snapshots.length === 0) return;

  const betaInviteByEmail = usesBetaInviteTokens
    ? await getBetaInviteDataByEmail({
        emails: snapshots.map((snapshot) => snapshot.normalized_email),
        baseUrl: baseUrl(),
      })
    : null;
  const nameInterestBySnapshotId = usesNameInterestCount
    ? new Map(
        (
          await enrichWaitlistNameInterestCounts(
            snapshots.map((snapshot) => ({
              id: snapshot.id,
              normalizedEmail: snapshot.normalized_email,
              personalization: snapshot.personalization,
            })),
          )
        ).map((snapshot) => [snapshot.id, snapshot.personalization.otherInterestedCount]),
      )
    : null;

  for (const snapshot of snapshots) {
    let nextPersonalization = snapshot.personalization;
    if (betaInviteByEmail) {
      nextPersonalization = withBetaInvitePersonalization(
        nextPersonalization,
        betaInviteByEmail.get(snapshot.normalized_email) ?? null,
      );
    }
    if (nameInterestBySnapshotId) {
      nextPersonalization = {
        ...nextPersonalization,
        otherInterestedCount: nameInterestBySnapshotId.get(snapshot.id) ?? null,
      };
    }
    const { error } = await db
      .from("campaign_recipient_snapshots")
      .update({
        personalization: nextPersonalization,
      })
      .eq("id", snapshot.id);
    if (error) throw new Error(error.message);
  }
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

async function applySuppressionFilterToEstimate(
  estimate: CampaignRecipientEstimate,
): Promise<CampaignRecipientEstimate> {
  const suppressedEmails = await listActiveSuppressedEmailSet(
    estimate.sample.map((recipient) => recipient.normalizedEmail),
  );
  if (suppressedEmails.size === 0) return estimate;

  const blocked = [...estimate.blocked];
  const blockedKeys = new Set(
    blocked.map((recipient) => `${recipient.normalizedEmail}:${recipient.reason}`),
  );
  const sample = estimate.sample.filter((recipient) => {
    if (!suppressedEmails.has(recipient.normalizedEmail)) return true;
    const blockedKey = `${recipient.normalizedEmail}:suppressed`;
    if (!blockedKeys.has(blockedKey)) {
      blocked.push({
        email: recipient.email,
        normalizedEmail: recipient.normalizedEmail,
        reason: "suppressed",
      });
      blockedKeys.add(blockedKey);
    }
    return false;
  });

  return {
    count: sample.length,
    sample,
    blocked,
  };
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
    .limit(20);
  if (error) throw new Error(error.message);
  const emails = ((data ?? []) as Array<{ email?: string | null }>)
    .map((row) => (row.email ? normalizeEmail(row.email) : null))
    .filter((row): row is string => Boolean(row));
  const suppressedEmails = await listActiveSuppressedEmailSet(emails);
  const previewEmail = emails.find((email) => !suppressedEmails.has(email)) ?? null;
  if (!previewEmail) return null;
  return buildMinimalRecipient(previewEmail, "email_subscribers");
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

  const [waitlistPersonalizations, waitlistRecipients] = await Promise.all([
    listWaitlistPersonalizationsByEmail({
      emails: normalizedEmails,
      baseUrl: baseUrl(),
    }),
    listWaitlistRecipients({
      audienceScope: "selected_emails",
      dedupeMode: "one_per_email",
      baseUrl: baseUrl(),
      selectedEmailsText: normalizedEmails.join("\n"),
    }).catch(() => [] as CampaignRecipient[]),
  ]);
  const waitlistRecipientByEmail = new Map(
    waitlistRecipients.map((recipient) => [recipient.normalizedEmail, recipient]),
  );

  if (!hasSeriesSelection(series)) {
    return {
      count: normalizedEmails.length,
      sample: normalizedEmails.map((email) =>
        buildMinimalRecipient(
          email,
          "custom_emails",
          waitlistRecipientByEmail.get(email)?.sourceRowIds,
          waitlistRecipientByEmail.get(email)?.personalization ??
            waitlistPersonalizations.get(email) ??
            undefined,
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
        waitlistRecipientByEmail.get(email)?.sourceRowIds,
        waitlistRecipientByEmail.get(email)?.personalization ??
          waitlistPersonalizations.get(email) ??
          undefined,
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
    series: args?.series ?? (sourceKind === "zn_waitlist" ? WAITLIST_CAMPAIGN_SERIES : getDefaultCampaignSeries()),
    include_unsubscribe: args?.includeUnsubscribe ?? true,
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
    headingText: args?.draft?.headingText ?? null,
    showRelatedNamesFooter: args?.draft?.showRelatedNamesFooter ?? true,
  });
  const { error: draftError } = await db.from("campaign_drafts").insert({
    campaign_id: data.id,
    subject: normalizedDraft.subject,
    body_text: normalizedDraft.bodyText,
    heading_text: normalizedDraft.headingText ?? null,
    show_related_names_footer: normalizedDraft.showRelatedNamesFooter !== false,
    custom_emails_text: args?.customEmailsText?.trim() || null,
  });
  if (draftError) throw new Error(draftError.message);

  return data as CampaignRecord;
}

export async function duplicateCampaignDraft(campaignId: string): Promise<CampaignRecord> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");

  const draft = await getOrCreateCampaignDraft(campaignId);
  const duplicate = await createCampaignDraft({
    title: `${campaign.title.trim() || "Campaign"} (Copy)`,
    sourceKind: campaign.source_kind,
    series: campaign.series,
    includeUnsubscribe: campaign.include_unsubscribe,
    audienceScope: campaign.audience_scope,
    dedupeMode: campaign.dedupe_mode,
    personalizationMode: campaign.personalization_mode,
    customEmailsText: draft.custom_emails_text,
    draft: {
      subject: draft.subject,
      bodyText: draft.body_text,
      headingText: draft.heading_text,
      showRelatedNamesFooter: draft.show_related_names_footer,
    },
  });

  return duplicate;
}

export async function deleteCampaignDraftSafely(campaignId: string): Promise<void> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  if (campaign.status !== "draft") {
    throw new Error("Only unsent draft campaigns can be deleted.");
  }

  const [snapshotsResult, attemptsResult, batchesResult] = await Promise.all([
    db
      .from("campaign_recipient_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
    db
      .from("campaign_send_attempts")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
    db
      .from("campaign_delivery_batches")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId),
  ]);

  if (snapshotsResult.error) throw new Error(snapshotsResult.error.message);
  if (attemptsResult.error) throw new Error(attemptsResult.error.message);
  if (batchesResult.error) throw new Error(batchesResult.error.message);

  const snapshotCount = snapshotsResult.count ?? 0;
  const attemptCount = attemptsResult.count ?? 0;
  const batchCount = batchesResult.count ?? 0;
  if (snapshotCount > 0 || attemptCount > 0 || batchCount > 0) {
    throw new Error(
      "This campaign can no longer be deleted because delivery records already exist. Cancel or keep it as history instead.",
    );
  }

  const { error: draftError } = await db
    .from("campaign_drafts")
    .delete()
    .eq("campaign_id", campaignId);
  if (draftError) throw new Error(draftError.message);

  const { error: campaignError } = await db
    .from("campaigns")
    .delete()
    .eq("id", campaignId);
  if (campaignError) throw new Error(campaignError.message);
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
      heading_text: null,
      show_related_names_footer: true,
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
    const draftUpdate: Record<string, string | boolean | null> = {
      campaign_id: campaignId,
      subject: normalized?.subject ?? existingDraft.subject,
      body_text: normalized?.bodyText ?? existingDraft.body_text,
      heading_text:
        normalized?.headingText !== undefined
          ? normalized.headingText ?? null
          : existingDraft.heading_text,
      show_related_names_footer:
        normalized?.showRelatedNamesFooter !== undefined
          ? normalized.showRelatedNamesFooter !== false
          : existingDraft.show_related_names_footer,
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
  const draft = await getCampaignDraft(campaign.id);
  const betaTokenUsage = getCampaignBetaTokenUsage({
    subject: draft?.subject ?? defaultCampaignSubject(),
    bodyText: draft?.body_text ?? defaultCampaignBodyText(),
    headingText: draft?.heading_text ?? null,
  });
  const usesNameInterestCount = draft
    ? campaignTextUsesWaitlistNameInterestToken(draft.subject) ||
      campaignTextUsesWaitlistNameInterestToken(draft.body_text) ||
      campaignTextUsesWaitlistNameInterestToken(draft.heading_text ?? "")
    : false;
  if (campaign.source_kind === "zn_waitlist") {
    const waitlistEstimate = await estimateWaitlistRecipients({
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      baseUrl: baseUrl(),
      selectedEmailsText: draft?.custom_emails_text,
      series: waitlistDeliverySeries(),
    });
    const sampleWithConfirmUrl = waitlistEstimate.sample.map((recipient) => ({
      ...recipient,
      personalization: withWaitlistConfirmResponseUrl({
        personalization: recipient.personalization,
        normalizedEmail: recipient.normalizedEmail,
        campaignId: campaign.id,
      }),
    }));
    if (
      !betaTokenUsage.usesBetaDisplayName &&
      !betaTokenUsage.usesBetaInviteCode &&
      !betaTokenUsage.usesBetaInviteLink
    ) {
      const sample = usesNameInterestCount
        ? await enrichWaitlistNameInterestCounts(sampleWithConfirmUrl)
        : sampleWithConfirmUrl;
      return {
        ...waitlistEstimate,
        sample,
      };
    }

    const waitlistRecipients = await listWaitlistRecipients({
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      baseUrl: baseUrl(),
      selectedEmailsText: draft?.custom_emails_text,
      series: waitlistDeliverySeries(),
    });
    const waitlistEstimateWithBeta = await applyBetaInviteTokenRules({
      estimate: {
        count: waitlistRecipients.length,
        sample: waitlistRecipients.map((recipient) => ({
          ...recipient,
          personalization: withWaitlistConfirmResponseUrl({
            personalization: recipient.personalization,
            normalizedEmail: recipient.normalizedEmail,
            campaignId: campaign.id,
          }),
        })),
        blocked: waitlistEstimate.blocked,
      },
      betaTokenUsage,
      baseUrl: baseUrl(),
    });
    if (!usesNameInterestCount) return waitlistEstimateWithBeta;
    return {
      ...waitlistEstimateWithBeta,
      sample: await enrichWaitlistNameInterestCounts(waitlistEstimateWithBeta.sample),
    };
  }

  if (campaign.source_kind === "email_subscribers") {
    recipients = await resolveSubscriberRecipients(campaign.series.trim());
    const suppressedEstimate = await applySuppressionFilterToEstimate({
      count: recipients.length,
      sample: recipients,
      blocked: [],
    });
    return applyBetaInviteTokenRules({
      estimate: suppressedEstimate,
      betaTokenUsage,
      baseUrl: baseUrl(),
    });
  }

  const customEstimate = await resolveCustomEmailRecipients(
    campaign.series,
    draft?.custom_emails_text,
  );
  const filteredEstimate = await applySuppressionFilterToEstimate(customEstimate);
  recipients = filteredEstimate.sample;
  blocked = filteredEstimate.blocked;
  const sampleWithConfirmUrl = recipients.map((recipient) => ({
    ...recipient,
    personalization: withWaitlistConfirmResponseUrl({
      personalization: recipient.personalization,
      normalizedEmail: recipient.normalizedEmail,
      campaignId: campaign.id,
    }),
  }));
  const customEstimateWithBeta = await applyBetaInviteTokenRules({
    estimate: { count: recipients.length, sample: sampleWithConfirmUrl, blocked },
    betaTokenUsage,
    baseUrl: baseUrl(),
  });
  if (!usesNameInterestCount) return customEstimateWithBeta;
  return {
    ...customEstimateWithBeta,
    sample: await enrichWaitlistNameInterestCounts(customEstimateWithBeta.sample),
  };
}

async function resolveCampaignPreviewRecipient(
  campaign: CampaignRecord,
): Promise<CampaignRecipient | null> {
  const draft = await getCampaignDraft(campaign.id);
  const betaTokenUsage = getCampaignBetaTokenUsage({
    subject: draft?.subject ?? defaultCampaignSubject(),
    bodyText: draft?.body_text ?? defaultCampaignBodyText(),
    headingText: draft?.heading_text ?? null,
  });

  if (campaign.source_kind === "zn_waitlist") {
    const recipient = await getWaitlistRecipientSample({
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      baseUrl: baseUrl(),
      selectedEmailsText: draft?.custom_emails_text,
    });
    const withConfirmUrl = recipient
      ? {
          ...recipient,
          personalization: withWaitlistConfirmResponseUrl({
            personalization: recipient.personalization,
            normalizedEmail: recipient.normalizedEmail,
            campaignId: campaign.id,
            fallbackToSample: true,
          }),
        }
      : null;
    if (
      !withConfirmUrl ||
      (!betaTokenUsage.usesBetaDisplayName &&
        !betaTokenUsage.usesBetaInviteCode &&
        !betaTokenUsage.usesBetaInviteLink)
    ) return withConfirmUrl;
    const betaInviteByEmail = await getBetaInviteDataByEmail({
      emails: [withConfirmUrl.normalizedEmail],
      baseUrl: baseUrl(),
    });
    return {
      ...withConfirmUrl,
      personalization: withBetaInvitePersonalization(
        withConfirmUrl.personalization,
        betaInviteByEmail.get(withConfirmUrl.normalizedEmail) ?? null,
      ),
    };
  }

  if (campaign.source_kind === "email_subscribers") {
    if (!isSupportedCampaignSeries(campaign.series)) {
      throw new Error(`Unsupported campaign series: ${campaign.series}`);
    }
    const recipient = await resolveSubscriberPreviewRecipient(campaign.series.trim());
    if (
      !recipient ||
      (!betaTokenUsage.usesBetaDisplayName &&
        !betaTokenUsage.usesBetaInviteCode &&
        !betaTokenUsage.usesBetaInviteLink)
    ) return recipient;
    const betaInviteByEmail = await getBetaInviteDataByEmail({
      emails: [recipient.normalizedEmail],
      baseUrl: baseUrl(),
    });
    return {
      ...recipient,
      personalization: withBetaInvitePersonalization(
        recipient.personalization,
        betaInviteByEmail.get(recipient.normalizedEmail) ?? null,
      ),
    };
  }

  const estimate = await resolveCustomEmailRecipients(campaign.series, draft?.custom_emails_text);
  const filteredEstimate = await applySuppressionFilterToEstimate(estimate);
  const betaFilteredEstimate = await applyBetaInviteTokenRules({
    estimate: filteredEstimate,
    betaTokenUsage,
    baseUrl: baseUrl(),
  });
  const recipient = betaFilteredEstimate.sample[0] ?? null;
  return recipient
    ? {
        ...recipient,
        personalization: withWaitlistConfirmResponseUrl({
          personalization: recipient.personalization,
          normalizedEmail: recipient.normalizedEmail,
          campaignId: campaign.id,
          fallbackToSample: true,
        }),
      }
    : null;
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

async function listPendingSnapshotEmails(campaignId: string): Promise<string[]> {
  const emails: string[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("campaign_recipient_snapshots")
      .select("normalized_email")
      .eq("campaign_id", campaignId)
      .eq("send_status", "pending")
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) throw new Error(extractErrorMessage(error));
    const rows = (data ?? []) as Array<{ normalized_email?: string | null }>;
    for (const row of rows) {
      const email = row.normalized_email?.trim().toLowerCase();
      if (email) emails.push(email);
    }
    if (rows.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }
  return emails;
}

async function removeSuppressedPendingSnapshots(campaignId: string): Promise<void> {
  const pendingEmails = await listPendingSnapshotEmails(campaignId);
  if (pendingEmails.length === 0) return;

  const suppressedEmails = await listActiveSuppressedEmailSet(pendingEmails);
  if (suppressedEmails.size === 0) return;

  const normalizedEmails = [...suppressedEmails];
  for (let index = 0; index < normalizedEmails.length; index += IN_FILTER_CHUNK_SIZE) {
    const chunk = normalizedEmails.slice(index, index + IN_FILTER_CHUNK_SIZE);
    const { error: deleteError } = await db
      .from("campaign_recipient_snapshots")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("send_status", "pending")
      .in("normalized_email", chunk);
    if (deleteError) throw new Error(extractErrorMessage(deleteError));
  }

  const { count, error: countError } = await db
    .from("campaign_recipient_snapshots")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  if (countError) throw new Error(countError.message);

  const { error: campaignError } = await db
    .from("campaigns")
    .update({
      recipient_count: count ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);
  if (campaignError) throw new Error(campaignError.message);
}

export async function snapshotCampaignRecipients(campaignId: string): Promise<void> {
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
  } else {
    await snapshotNonWaitlistCampaignRecipientsViaRpc({
      campaignId,
      sourceKind: campaign.source_kind,
      series: campaign.series,
      customEmailsText: draft?.custom_emails_text,
    });
  }
  await enrichPendingSnapshotPersonalization(campaignId, draft);
  await removeSuppressedPendingSnapshots(campaignId);
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
        const providerSchedule = getProviderManagedScheduleState({
          hasDeliveryBatches: false,
          acceptedCount: scheduledAttempts.length,
          scheduledAt: scheduledAttempts[0]?.scheduled_for ?? campaign.scheduled_at ?? null,
          canceledAt: campaign.delivery_canceled_at,
        });
        if (!providerSchedule.cancelable) {
          if (providerSchedule.pastDue) {
            throw new Error(
              "Scheduled provider delivery can no longer be canceled because its scheduled send time has already passed.",
            );
          }
          throw new Error("Scheduled provider delivery cannot be canceled.");
        }

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

export async function requeueFailedCampaignRecipients(
  campaignId: string,
  options?: {
    startAt?: string | null;
    batchSize?: number;
    intervalMinutes?: number;
  },
): Promise<CampaignDeliveryBatchRecord[]> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");

  const retryAt = options?.startAt ?? new Date().toISOString();
  const resetAt = new Date().toISOString();
  const { data, error } = await db
    .from("campaign_recipient_snapshots")
    .update({
      send_status: "pending",
      sent_at: null,
      last_error: null,
      campaign_delivery_batch_id: null,
    })
    .eq("campaign_id", campaignId)
    .eq("send_status", "failed")
    .select("id");
  if (error) throw new Error(error.message);

  const retriedCount = (data ?? []).length;
  if (retriedCount === 0) {
    throw new Error("No failed recipients are available to retry.");
  }

  const { error: campaignError } = await db
    .from("campaigns")
    .update({
      delivery_paused_at: null,
      delivery_canceled_at: null,
      send_completed_at: null,
      scheduled_at: retryAt,
      updated_at: resetAt,
    })
    .eq("id", campaignId);
  if (campaignError) throw new Error(campaignError.message);

  return createCampaignDeliveryBatches(campaignId, {
    startAt: retryAt,
    batchSize: options?.batchSize,
    intervalMinutes: options?.intervalMinutes,
  });
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
  const betaTokenUsage = getCampaignBetaTokenUsage({
    subject: draft.subject,
    bodyText: draft.body_text,
    headingText: draft.heading_text,
  });
  const includeUnsubscribe = shouldIncludeUnsubscribe(
    campaign.source_kind,
    campaign.series,
    campaign.include_unsubscribe,
  );
  const deliverySeries =
    campaign.source_kind === "zn_waitlist" ? waitlistDeliverySeries() : campaign.series;
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
    const basePersonalization = withWaitlistConfirmResponseUrl({
      personalization: snapshot.personalization,
      normalizedEmail: snapshot.normalized_email,
      campaignId,
    });
    const personalization =
      campaign.source_kind === "zn_waitlist"
        ? withCampaignReferralStats(
            basePersonalization,
            snapshot.personalization.referralCode
              ? referralStatsContext?.get(snapshot.personalization.referralCode) ?? null
              : null,
          )
        : withCampaignReferralStats(basePersonalization, null);
    const tokenValidationError = validateRequiredCampaignTokens({
      sourceKind: campaign.source_kind,
      subject: draft.subject,
      bodyText: draft.body_text,
      headingText: draft.heading_text,
      betaTokenUsage,
      personalization,
    });
    if (tokenValidationError) {
      if (!firstError) firstError = tokenValidationError;
      await recordCampaignAttempt({
        campaignId,
        snapshotId: snapshot.id,
        email: snapshot.email,
        status: "failed",
        error: tokenValidationError,
        personalization,
      });
      failedCount += 1;
      continue;
    }

    try {
      const result = await sendCampaignEmail({
        to: snapshot.email,
        subject: draft.subject,
        bodyText: draft.body_text,
        headingText: draft.heading_text,
        showRelatedNamesFooter: draft.show_related_names_footer,
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
    const betaTokenUsage = getCampaignBetaTokenUsage({
      subject: draft.subject,
      bodyText: draft.body_text,
      headingText: draft.heading_text,
    });
    const includeUnsubscribe = shouldIncludeUnsubscribe(
      campaign.source_kind,
      campaign.series,
      campaign.include_unsubscribe,
    );
    const deliverySeries =
      campaign.source_kind === "zn_waitlist" ? waitlistDeliverySeries() : campaign.series;
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
    }> = [];

    for (const snapshot of snapshots) {
      const basePersonalization = withWaitlistConfirmResponseUrl({
        personalization: snapshot.personalization,
        normalizedEmail: snapshot.normalized_email,
        campaignId: batch.campaign_id,
      });
      const personalization =
        campaign.source_kind === "zn_waitlist"
          ? withCampaignReferralStats(
              basePersonalization,
              snapshot.personalization.referralCode
                ? referralStatsContext?.get(snapshot.personalization.referralCode) ?? null
                : null,
            )
          : withCampaignReferralStats(basePersonalization, null);
      const sendArgs: CampaignSendEmailArgs = {
        to: snapshot.email,
        subject: draft.subject,
        bodyText: draft.body_text,
        headingText: draft.heading_text,
        showRelatedNamesFooter: draft.show_related_names_footer,
        personalization,
        series: deliverySeries,
        includeUnsubscribe,
        skipConsentCheck,
      };
      const tokenValidationError = validateRequiredCampaignTokens({
        sourceKind: campaign.source_kind,
        subject: draft.subject,
        bodyText: draft.body_text,
        headingText: draft.heading_text,
        betaTokenUsage,
        personalization,
      });
      if (tokenValidationError) {
        await recordCampaignAttempt({
          campaignId: batch.campaign_id,
          snapshotId: snapshot.id,
          email: snapshot.email,
          status: "failed",
          error: tokenValidationError,
          personalization,
        });
        failedCount += 1;
        continue;
      }

      try {
        prepared.push({ snapshot, personalization, sendArgs });
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
        const message = extractErrorMessage(error).slice(0, 1000);
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
  const rows: Array<Record<string, unknown>> = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("campaign_recipient_snapshots")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) throw new Error(extractErrorMessage(error));
    const page = (data ?? []) as Array<Record<string, unknown>>;
    rows.push(...page);
    if (page.length < POSTGREST_PAGE_SIZE) break;
    from += POSTGREST_PAGE_SIZE;
  }
  return rows.map((row) => ({
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

function mapCampaignSendAttempt(
  row: Record<string, unknown>,
): CampaignSendAttemptRecord {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    recipient_snapshot_id: String(row.recipient_snapshot_id),
    email: String(row.email),
    status: String(row.status),
    provider_message_id: row.provider_message_id
      ? String(row.provider_message_id)
      : null,
    scheduled_for: row.scheduled_for ? String(row.scheduled_for) : null,
    error: row.error ? String(row.error) : null,
    attempted_at: String(row.attempted_at),
  };
}

export async function listCampaignAttempts(
  campaignId: string,
): Promise<CampaignSendAttemptRecord[]> {
  const { data, error } = await db
    .from("campaign_send_attempts")
    .select("id, campaign_id, recipient_snapshot_id, email, status, provider_message_id, scheduled_for, error, attempted_at")
    .eq("campaign_id", campaignId)
    .order("attempted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map(
    mapCampaignSendAttempt,
  );
}

export async function listCampaignAttemptsForCampaignIds(
  campaignIds: string[],
): Promise<CampaignSendAttemptRecord[]> {
  if (campaignIds.length === 0) return [];
  const { data, error } = await db
    .from("campaign_send_attempts")
    .select("id, campaign_id, recipient_snapshot_id, email, status, provider_message_id, scheduled_for, error, attempted_at")
    .in("campaign_id", campaignIds)
    .order("attempted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map(
    mapCampaignSendAttempt,
  );
}

export async function listCampaignDeliveryBatchesForCampaignIds(
  campaignIds: string[],
): Promise<CampaignDeliveryBatchRecord[]> {
  if (campaignIds.length === 0) return [];
  try {
    const { data, error } = await db
      .from("campaign_delivery_batches")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("campaign_id", { ascending: true })
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
