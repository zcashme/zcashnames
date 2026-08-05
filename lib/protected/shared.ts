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

export const PROTECTED_SUGGESTION_OPTION_LIMIT = 12;
