export const PROTECTED_NAME_CATEGORIES = [
  "person",
  "organization",
  "brand",
  "technology",
  "community",
  "abuse",
  "other",
] as const;

export type ProtectedNameCategory = (typeof PROTECTED_NAME_CATEGORIES)[number];

export const PROTECTED_NAME_STATUSES = [
  "under_review",
  "protected",
  "rejected",
] as const;

export type ProtectedNameStatus = (typeof PROTECTED_NAME_STATUSES)[number];

export const DISPUTE_REVIEW_STATUSES = [
  "under_review",
  "accepted",
  "dismissed",
] as const;

export type DisputeReviewStatus = (typeof DISPUTE_REVIEW_STATUSES)[number];

export const CONTACT_KINDS = [
  "email",
  "signal",
  "discord",
  "x",
  "telegram",
  "forum",
] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number];

export type EvidenceItem = {
  id: string;
  title: string;
  url: string;
  publisher: string | null;
  sourceType: string | null;
  summary: string | null;
  publishedAt: string | null;
  retrievedAt: string | null;
};

export type ContactMethod = {
  kind: ContactKind | string;
  value: string;
  preferred?: boolean;
};

export type ProtectedNameWorkflow = "suggestion" | "dispute" | "access_request";

export type DecisionNotificationStatus = "pending" | "sent" | "failed" | string;

export type ProtectedNameDecisionAmendment = {
  id: string;
  decision_id: string;
  reason: string;
  corrected_decision: "approved" | "denied" | null;
  created_at: string;
};

export type ProtectedNameDecisionEmailAttempt = {
  id: string;
  decision_id: string;
  amendment_id: string | null;
  source_attempt_id: string | null;
  send_kind: "initial" | "resend" | "retry" | "correction" | "legacy" | string;
  recipient_email: string;
  subject: string | null;
  html: string | null;
  delivery_status: DecisionNotificationStatus;
  attempted_at: string;
  sent_at: string | null;
  provider_id: string | null;
  error: string | null;
  created_at: string;
};

export type ProtectedNameDecision = {
  id: string;
  workflow: ProtectedNameWorkflow | string;
  source_id: string;
  protected_name: string;
  decision: "approved" | "denied" | string;
  reason: string;
  recipient_email: string | null;
  contact_methods: ContactMethod[];
  preferred_contact_kind: string | null;
  preferred_contact_value: string | null;
  decided_at: string;
  notification_status: DecisionNotificationStatus;
  notification_attempted_at: string | null;
  notification_sent_at: string | null;
  notification_error: string | null;
  notification_provider_id: string | null;
  name_status: string | null;
  name_did_transition: boolean | null;
  submitted_reason: string | null;
  amendments: ProtectedNameDecisionAmendment[];
  email_attempts: ProtectedNameDecisionEmailAttempt[];
  effective_reason: string;
  effective_decision: "approved" | "denied" | string;
  source_href: string;
};

export type ProtectedNameDecisionHistoryFilters = {
  workflow: ProtectedNameWorkflow | "all";
  delivery: DecisionNotificationStatus | "all";
  q: string;
  page: number;
  pageSize: number;
};

export type ProtectedNameDecisionHistoryResult = {
  decisions: ProtectedNameDecision[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filters: ProtectedNameDecisionHistoryFilters;
};

export type ProtectedNameAccessRequest = {
  id: string;
  waitlist_row_id: string | null;
  normalized_email: string;
  requested_name: string;
  status: string;
  contact_methods: ContactMethod[];
  preferred_contact_kind: string | null;
  preferred_contact_value: string | null;
  relationship: string | null;
  supporting_link: string | null;
  additional_context: string | null;
  reference_number: string;
  submitted_at: string;
  updated_at: string;
  approved_at: string | null;
  denied_at: string | null;
};

export type ProtectedNameRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  category: string;
  status: ProtectedNameStatus | string;
  reason: string;
  submitted_by_email: string | null;
  redeemed: boolean;
  redeemed_at: string | null;
  expires_at: string | null;
  ens_priority_claim: boolean;
  zm_priority_claim: boolean;
  protected_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  updated_at: string | null;
  created_at: string;
  contact_methods: ContactMethod[];
  preferred_contact_kind: string | null;
  preferred_contact_value: string | null;
  zcash_unified_address: string | null;
  evidence: EvidenceItem[];
};

export type ProtectedNameQueueRow = ProtectedNameRow & {
  evidenceCount: number;
  openDisputeCount: number;
  hasOpenDisputes: boolean;
};

export type ProtectedNameDispute = {
  id: string;
  protected_name: string;
  normalized_name: string;
  name_status_at_submission: "protected" | "rejected" | string;
  category: string;
  parent_name: string | null;
  reason: string;
  evidence: EvidenceItem[];
  contact_methods: ContactMethod[];
  preferred_contact_kind: string | null;
  preferred_contact_value: string | null;
  zcash_unified_address: string | null;
  submitted_by_email: string | null;
  review_status: DisputeReviewStatus | string;
  created_at: string;
  updated_at: string;
};

export type ProtectedNameDetail = ProtectedNameRow & {
  openDisputes: ProtectedNameDispute[];
  pastDisputes: ProtectedNameDispute[];
  variants: Array<{
    name: string;
    status: string;
    redeemed: boolean;
    category: string;
    created_at: string;
  }>;
};

export type QueueDisputeFilter = "any" | "has_open" | "no_open";
export type QueueRedeemedFilter = "any" | "redeemed" | "not_redeemed";

/** Default queue view: under_review OR at least one open dispute. */
export type QueueStatusFilter = ProtectedNameStatus | "all" | "needs_attention";

export type ProtectedNameQueueFilters = {
  status: QueueStatusFilter;
  dispute: QueueDisputeFilter;
  redeemed: QueueRedeemedFilter;
  category: ProtectedNameCategory | "all";
  q: string;
  createdFrom: string | null;
  createdTo: string | null;
  page: number;
  pageSize: number;
};

export type ProtectedNameQueueResult = {
  rows: ProtectedNameQueueRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filters: ProtectedNameQueueFilters;
};

export type ActionErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "CONCURRENCY"
  | "UNKNOWN";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; code: ActionErrorCode; message: string };

export type NameMutationResult = {
  name: string;
  status: string;
  redeemed?: boolean;
  updated_at?: string | null;
  protected_at?: string | null;
  rejected_at?: string | null;
  rejected_reason?: string | null;
  redeemed_at?: string | null;
};

export type DisputeAcceptResult = {
  id: string;
  protected_name: string;
  review_status: string;
  name_status?: string;
  did_transition?: boolean;
  changedDescendants: string[];
  skippedDescendants: string[];
  updated_at?: string;
};

export type DecisionMutationResult = {
  decisionId: string;
  protectedName: string;
  workflow: ProtectedNameWorkflow | string;
  decision: string;
  sourceStatus: string;
  recipientEmail: string | null;
  notificationStatus: DecisionNotificationStatus;
  notificationError?: string | null;
  didTransition?: boolean;
  changedDescendants?: string[];
  skippedDescendants?: string[];
  submittedReason?: string | null;
};

export type EvidenceMutationResult = {
  updated_at: string;
  evidence: EvidenceItem[];
  name?: string;
  id?: string;
  protected_name?: string;
};

export type MetadataUpdateInput = {
  category: string;
  parentName: string | null;
  reason: string;
  contactMethods: ContactMethod[];
  preferredContactKind: string | null;
  preferredContactValue: string | null;
  zcashUnifiedAddress: string | null;
  expectedUpdatedAt: string | null;
};

export type EvidenceInput = {
  title: string;
  url: string;
  publisher?: string | null;
  sourceType?: string | null;
  summary?: string | null;
  publishedAt?: string | null;
  retrievedAt?: string | null;
};
