export const CAMPAIGN_SOURCE_KINDS = [
  "zn_waitlist",
  "email_subscribers",
  "custom_emails",
] as const;
export type CampaignSourceKind = (typeof CAMPAIGN_SOURCE_KINDS)[number];

export const CAMPAIGN_AUDIENCE_SCOPES = [
  "verified_only",
  "all_rows",
  "verified_newsletter",
  "selected_emails",
] as const;
export type CampaignAudienceScope = (typeof CAMPAIGN_AUDIENCE_SCOPES)[number];

export const CAMPAIGN_DEDUPE_MODES = ["one_per_email", "one_per_row"] as const;
export type CampaignDedupeMode = (typeof CAMPAIGN_DEDUPE_MODES)[number];

export const CAMPAIGN_PERSONALIZATION_MODES = ["light", "static"] as const;
export type CampaignPersonalizationMode =
  (typeof CAMPAIGN_PERSONALIZATION_MODES)[number];

export const CAMPAIGN_SERIES = ["general", "builders", "updates"] as const;
export type CampaignSeries = (typeof CAMPAIGN_SERIES)[number];
export type CampaignTargetSeries = string;

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "partial",
  "failed",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_DELIVERY_BATCH_STATUSES = [
  "pending",
  "sending",
  "sent",
  "failed",
  "canceled",
] as const;
export type CampaignDeliveryBatchStatus =
  (typeof CAMPAIGN_DELIVERY_BATCH_STATUSES)[number];

export interface CampaignDraftInput {
  subject: string;
  bodyText: string;
  headingText?: string | null;
  showRelatedNamesFooter?: boolean;
}

export interface CampaignRecord {
  id: string;
  title: string;
  source_kind: CampaignSourceKind;
  series: CampaignTargetSeries;
  include_unsubscribe: boolean;
  audience_scope: CampaignAudienceScope;
  dedupe_mode: CampaignDedupeMode;
  personalization_mode: CampaignPersonalizationMode;
  status: CampaignStatus;
  scheduled_at: string | null;
  recipient_count: number;
  recipient_snapshot_at: string | null;
  recipient_sample: Array<{
    email: string;
    name: string;
    names: string[];
  }> | null;
  recipient_blocked: Array<{
    email: string;
    reason: CampaignBlockedReason;
  }> | null;
  recipient_estimate_generated_at: string | null;
  recipient_estimate_cache_key: string | null;
  send_started_at: string | null;
  send_completed_at: string | null;
  delivery_paused_at: string | null;
  delivery_canceled_at: string | null;
  delivery_batch_size: number | null;
  delivery_batch_interval_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignDraftRecord {
  campaign_id: string;
  subject: string;
  body_text: string;
  heading_text: string | null;
  show_related_names_footer: boolean;
  custom_emails_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignReferralStats {
  directReferrals: number | null;
  indirectReferrals: number | null;
  attributedReferrals: number | null;
  referrals24hCount: number | null;
  referrals24hGrowthPct: number | null;
  referrals7dCount: number | null;
  referrals7dGrowthPct: number | null;
  referrals30dCount: number | null;
  referrals30dGrowthPct: number | null;
  depth1Referrals: number | null;
  depth2Referrals: number | null;
  depth3Referrals: number | null;
  leaderboardRank: number | null;
  waitlistPosition: number | null;
  waitlistTotal: number | null;
  maxReferralDepth: number | null;
  potentialRewards: number | null;
  rootBadge: "red" | "blue" | null;
  commissionUnlocked: boolean | null;
  referralsUnlocked: boolean | null;
}

export interface CampaignRecipientPersonalization {
  name: string;
  referralCode: string | null;
  referralUrl: string | null;
  dashboardUrl: string | null;
  humanReferralCode: string | null;
  humanReferralUrl: string | null;
  humanDashboardUrl: string | null;
  betaDisplayName: string | null;
  betaInviteCode: string | null;
  betaInviteLink: string | null;
  referralStats: CampaignReferralStats | null;
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

export const CAMPAIGN_BLOCK_REASONS = [
  "invalid_email",
  "not_subscribed",
  "unsubscribed",
  "unconfirmed",
  "not_on_waitlist",
  "suppressed",
  "missing_beta_invite",
] as const;
export type CampaignBlockedReason = (typeof CAMPAIGN_BLOCK_REASONS)[number];

export interface CampaignBlockedRecipient {
  email: string;
  normalizedEmail: string;
  reason: CampaignBlockedReason;
}

export interface CampaignRecipientEstimate {
  count: number;
  sample: CampaignRecipient[];
  blocked: CampaignBlockedRecipient[];
}

export interface CampaignRecipientSnapshotRecord {
  id: string;
  campaign_id: string;
  campaign_delivery_batch_id: string | null;
  recipient_key: string;
  email: string;
  normalized_email: string;
  source_kind: CampaignSourceKind;
  source_row_ids: string[];
  personalization: CampaignRecipientPersonalization;
  send_status: "pending" | "scheduled" | "sent" | "failed";
  sent_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface CampaignDeliveryBatchRecord {
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
}

export interface CampaignSendAttemptRecord {
  id: string;
  campaign_id: string;
  recipient_snapshot_id: string;
  email: string;
  status: string;
  provider_message_id: string | null;
  scheduled_for: string | null;
  error: string | null;
  attempted_at: string;
}
