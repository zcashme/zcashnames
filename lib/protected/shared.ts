import type { ContactKind } from "@/lib/types";

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
export type ProtectedSuggestionType = "canonical" | "variant";
export type ProtectedSuggestionOptionKind = "canonical";
export type ProtectedSuggestionOption = {
  value: string;
  label: string;
  category?: ProtectedNameCategory;
};

export type ProtectedSuggestionContactMethod = {
  kind: ContactKind;
  value: string;
  preferred?: boolean;
};

export type ProtectedSuggestionPayload = {
  suggestionType: ProtectedSuggestionType;
  name: string;
  parentName: string | null;
  category: string;
  reason: string;
  evidenceLinks: string[];
  contactMethods: ProtectedSuggestionContactMethod[];
  unifiedAddress: string | null;
};

export type ProtectedDisputeNameStatus = "protected" | "rejected";

export type ProtectedDisputeNameOption = {
  value: string;
  label: string;
  normalizedName: string;
  parentName: string | null;
  category: ProtectedNameCategory;
  status: ProtectedDisputeNameStatus;
  reason: string;
  protectedAt: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  redeemed: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type ProtectedDisputePayload = {
  name: string;
  normalizedName: string;
  category: string;
  parentName: string | null;
  reason: string;
  evidenceLinks: string[];
  contactMethods: ProtectedSuggestionContactMethod[];
  unifiedAddress: string | null;
};

export const PROTECTED_SUGGESTION_OPTION_LIMIT = 12;
export const PROTECTED_DISPUTE_OPTION_LIMIT = 12;
export const PROTECTED_REQUEST_OPTION_LIMIT = 12;

export const PROTECTED_ACCESS_RELATIONSHIPS = [
  "personal_or_public_name",
  "represent_person",
  "represent_organization",
  "manage_brand_or_project",
  "other",
] as const;

export type ProtectedAccessRelationship = (typeof PROTECTED_ACCESS_RELATIONSHIPS)[number];

export const PROTECTED_ACCESS_RELATIONSHIP_OPTIONS: Array<{
  value: ProtectedAccessRelationship;
  label: string;
}> = [
  { value: "personal_or_public_name", label: "This is my personal or public name" },
  { value: "represent_person", label: "I represent this person" },
  { value: "represent_organization", label: "I represent this organization" },
  { value: "manage_brand_or_project", label: "I manage this brand or project" },
  { value: "other", label: "Other" },
];

export const PROTECTED_ACCESS_RELATIONSHIP_LABEL: Record<ProtectedAccessRelationship, string> = {
  personal_or_public_name: "This is my personal or public name",
  represent_person: "I represent this person",
  represent_organization: "I represent this organization",
  manage_brand_or_project: "I manage this brand or project",
  other: "Other",
};

export type ProtectedRequestNameOption = {
  value: string;
  label: string;
  normalizedName: string;
  parentName: string | null;
  category: ProtectedNameCategory;
  status: "protected";
  reason: string;
  protectedAt: string | null;
  redeemed: boolean;
  ensPriorityClaim: boolean;
  zmPriorityClaim: boolean;
  evidence: string[];
  createdAt: string;
  updatedAt: string | null;
};

export const PROTECTED_REQUEST_CONTACT_KINDS = [
  "email",
  "signal",
  "discord",
  "x",
  "telegram",
  "forum",
  "other",
] as const;

export type ProtectedRequestContactKind = (typeof PROTECTED_REQUEST_CONTACT_KINDS)[number];

export const PROTECTED_REQUEST_CONTACT_LABEL: Record<ProtectedRequestContactKind, string> = {
  email: "Email",
  signal: "Signal",
  discord: "Discord",
  x: "X / Twitter",
  telegram: "Telegram",
  forum: "Zcash Community Forum",
  other: "Other",
};

export const PROTECTED_REQUEST_CONTACT_PLACEHOLDER: Record<ProtectedRequestContactKind, string> = {
  email: "you@example.com",
  signal: "@yourhandle or signal username",
  discord: "@yourhandle",
  x: "@yourhandle",
  telegram: "@yourhandle",
  forum: "@username on forum.zcashcommunity.com",
  other: "How should we reach you?",
};

export type ProtectedRequestContactMethod = {
  kind: ProtectedRequestContactKind;
  value: string;
  preferred?: boolean;
};

export type ProtectedRequestPayload = {
  name: string;
  normalizedName: string;
  contactMethods: ProtectedRequestContactMethod[];
  relationship: ProtectedAccessRelationship;
  supportingLink: string | null;
  additionalContext: string | null;
};

export function extractZcashMeProfileHref(evidence: string[]): string | null {
  for (const entry of evidence) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const match = trimmed.match(
      /^(?:https?:\/\/)?(?:www\.)?(zcash\.me\/[A-Za-z0-9._~-]+)/i,
    );
    if (match?.[1]) {
      return `https://${match[1].replace(/\/+$/, "")}`;
    }
  }

  return null;
}

export function extractXUsernameFromEvidence(evidence: string[]): string | null {
  for (const entry of evidence) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const urlMatch = trimmed.match(
      /^(?:https?:\/\/)?(?:www\.)?(?:x\.com|twitter\.com)\/@?([A-Za-z0-9_]+)/i,
    );
    if (urlMatch?.[1]) {
      return `@${urlMatch[1]}`;
    }

    const handleMatch = trimmed.match(/^@([A-Za-z0-9_]+)$/);
    if (handleMatch?.[1]) {
      return `@${handleMatch[1]}`;
    }
  }

  return null;
}
