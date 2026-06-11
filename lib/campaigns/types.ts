export const CAMPAIGN_SOURCE_KINDS = ["zn_waitlist"] as const;
export type CampaignSourceKind = (typeof CAMPAIGN_SOURCE_KINDS)[number];

export const CAMPAIGN_AUDIENCE_SCOPES = [
  "verified_only",
  "all_rows",
  "contactable_only",
] as const;
export type CampaignAudienceScope = (typeof CAMPAIGN_AUDIENCE_SCOPES)[number];

export const CAMPAIGN_DEDUPE_MODES = ["one_per_email", "one_per_row"] as const;
export type CampaignDedupeMode = (typeof CAMPAIGN_DEDUPE_MODES)[number];

export const CAMPAIGN_PERSONALIZATION_MODES = ["light", "static"] as const;
export type CampaignPersonalizationMode =
  (typeof CAMPAIGN_PERSONALIZATION_MODES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "partial",
  "failed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface CampaignDraftInput {
  subject: string;
  bodyText: string;
}

export interface CampaignRecord {
  id: string;
  title: string;
  source_kind: CampaignSourceKind;
  audience_scope: CampaignAudienceScope;
  dedupe_mode: CampaignDedupeMode;
  personalization_mode: CampaignPersonalizationMode;
  status: CampaignStatus;
  scheduled_at: string | null;
  recipient_count: number;
  recipient_snapshot_at: string | null;
  send_started_at: string | null;
  send_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignDraftRecord {
  campaign_id: string;
  subject: string;
  body_text: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipientPersonalization {
  name: string;
  referralCode: string | null;
  referralUrl: string | null;
  dashboardUrl: string | null;
  relatedNames: string[];
}

export interface CampaignRecipient {
  recipientKey: string;
  email: string;
  normalizedEmail: string;
  sourceKind: CampaignSourceKind;
  sourceRowIds: string[];
  personalization: CampaignRecipientPersonalization;
}

export interface CampaignRecipientSnapshotRecord {
  id: string;
  campaign_id: string;
  recipient_key: string;
  email: string;
  normalized_email: string;
  source_kind: CampaignSourceKind;
  source_row_ids: string[];
  personalization: CampaignRecipientPersonalization;
  send_status: "pending" | "sent" | "failed";
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
}
