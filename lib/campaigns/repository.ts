import "server-only";

import { db } from "@/lib/db";
import {
  defaultCampaignBodyText,
  defaultCampaignSubject,
  defaultCampaignTitle,
} from "@/lib/campaigns/content";
import { listWaitlistRecipients } from "@/lib/campaigns/waitlist";
import type {
  CampaignAudienceScope,
  CampaignDedupeMode,
  CampaignDraftInput,
  CampaignDraftRecord,
  CampaignPersonalizationMode,
  CampaignRecipient,
  CampaignRecipientSnapshotRecord,
  CampaignRecord,
  CampaignSourceKind,
  CampaignStatus,
} from "@/lib/campaigns/types";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://zcashnames.com";
}

function normalizeDraftInput(draft: CampaignDraftInput): CampaignDraftInput {
  return {
    subject: draft.subject.trim(),
    bodyText: draft.bodyText.replace(/\r\n?/g, "\n").trim(),
  };
}

export async function createCampaignDraft(args?: {
  title?: string;
  sourceKind?: CampaignSourceKind;
  audienceScope?: CampaignAudienceScope;
  dedupeMode?: CampaignDedupeMode;
  personalizationMode?: CampaignPersonalizationMode;
  draft?: Partial<CampaignDraftInput>;
}): Promise<CampaignRecord> {
  const insert = {
    title: args?.title?.trim() || defaultCampaignTitle(),
    source_kind: args?.sourceKind ?? "zn_waitlist",
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
    audienceScope?: CampaignAudienceScope;
    dedupeMode?: CampaignDedupeMode;
    personalizationMode?: CampaignPersonalizationMode;
    draft?: CampaignDraftInput;
  },
): Promise<void> {
  const updates: Record<string, string> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) updates.title = patch.title.trim();
  if (patch.sourceKind !== undefined) updates.source_kind = patch.sourceKind;
  if (patch.audienceScope !== undefined) updates.audience_scope = patch.audienceScope;
  if (patch.dedupeMode !== undefined) updates.dedupe_mode = patch.dedupeMode;
  if (patch.personalizationMode !== undefined) updates.personalization_mode = patch.personalizationMode;
  const { error } = await db.from("campaigns").update(updates).eq("id", campaignId);
  if (error) throw new Error(error.message);

  if (patch.draft) {
    const normalized = normalizeDraftInput(patch.draft);
    const { error: draftError } = await db.from("campaign_drafts").upsert({
      campaign_id: campaignId,
      subject: normalized.subject,
      body_text: normalized.bodyText,
      updated_at: new Date().toISOString(),
    });
    if (draftError) throw new Error(draftError.message);
  }
}

export async function resolveCampaignRecipients(campaign: CampaignRecord): Promise<CampaignRecipient[]> {
  if (campaign.source_kind === "zn_waitlist") {
    return listWaitlistRecipients({
      sourceKind: campaign.source_kind,
      audienceScope: campaign.audience_scope,
      dedupeMode: campaign.dedupe_mode,
      baseUrl: baseUrl(),
    });
  }
  return [];
}

export async function estimateCampaignRecipients(campaignId: string): Promise<{
  count: number;
  sample: CampaignRecipient[];
}> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  const recipients = await resolveCampaignRecipients(campaign);
  const { error } = await db
    .from("campaigns")
    .update({
      recipient_count: recipients.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);
  if (error) throw new Error(error.message);
  return {
    count: recipients.length,
    sample: recipients.slice(0, 5),
  };
}

export async function snapshotCampaignRecipients(campaignId: string): Promise<CampaignRecipientSnapshotRecord[]> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  const recipients = await resolveCampaignRecipients(campaign);
  const nowIso = new Date().toISOString();

  const { error: deleteError } = await db
    .from("campaign_recipient_snapshots")
    .delete()
    .eq("campaign_id", campaignId)
    .neq("send_status", "sent");
  if (deleteError) throw new Error(deleteError.message);

  const { data: existingData, error: existingError } = await db
    .from("campaign_recipient_snapshots")
    .select("recipient_key")
    .eq("campaign_id", campaignId)
    .eq("send_status", "sent");
  if (existingError) throw new Error(existingError.message);
  const existingSentKeys = new Set((existingData ?? []).map((row) => String(row.recipient_key)));

  const pendingRows = recipients
    .filter((recipient) => !existingSentKeys.has(recipient.recipientKey))
    .map((recipient) => ({
      campaign_id: campaignId,
      recipient_key: recipient.recipientKey,
      email: recipient.email,
      normalized_email: recipient.normalizedEmail,
      source_kind: recipient.sourceKind,
      source_row_ids: recipient.sourceRowIds,
      personalization: recipient.personalization,
      send_status: "pending",
      last_error: null,
    }));

  if (pendingRows.length > 0) {
    const { error: insertError } = await db
      .from("campaign_recipient_snapshots")
      .upsert(pendingRows, { onConflict: "campaign_id,recipient_key" });
    if (insertError) throw new Error(insertError.message);
  }

  const { error: campaignError } = await db
    .from("campaigns")
    .update({
      recipient_count: recipients.length,
      recipient_snapshot_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", campaignId);
  if (campaignError) throw new Error(campaignError.message);

  return listCampaignRecipientSnapshots(campaignId);
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
    })
    .eq("id", args.snapshotId);
  if (snapshotError) throw new Error(snapshotError.message);
}

export async function listCampaignAttempts(campaignId: string): Promise<
  Array<{
    id: string;
    email: string;
    status: string;
    provider_message_id: string | null;
    error: string | null;
    attempted_at: string;
  }>
> {
  const { data, error } = await db
    .from("campaign_send_attempts")
    .select("id, email, status, provider_message_id, error, attempted_at")
    .eq("campaign_id", campaignId)
    .order("attempted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<{
    id: string;
    email: string;
    status: string;
    provider_message_id: string | null;
    error: string | null;
    attempted_at: string;
  }>;
}
