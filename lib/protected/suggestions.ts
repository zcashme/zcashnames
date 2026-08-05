import "server-only";

import { db } from "@/lib/db";
import { getEmailAddressValidationMessage, normalizeEmailAddress } from "@/lib/email-address";
import {
  PROTECTED_NAME_CATEGORIES,
  PROTECTED_SUGGESTION_OPTION_LIMIT,
  type ProtectedNameCategory,
  type ProtectedSuggestionContactMethod,
  type ProtectedSuggestionOption,
  type ProtectedSuggestionOptionKind,
  type ProtectedSuggestionPayload,
} from "@/lib/protected/shared";
import { validateAddress } from "@/lib/zns/address-validation";
import { CONTACT_KINDS, type ContactKind } from "@/lib/types";

type ProtectedNameOptionRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  category: ProtectedNameCategory;
  status: string;
};

export type ProtectedSuggestionRpcResult = {
  name: string;
  normalized_name: string;
  status: string;
};
const PROTECTED_SUGGESTION_NAME_PATTERN = /^[A-Za-z0-9]+$/;

function normalizeContactMethods(value: ProtectedSuggestionContactMethod[]): {
  contactMethods: ProtectedSuggestionContactMethod[];
  preferredContactKind: ContactKind | null;
  preferredContactValue: string | null;
  error: string | null;
} {
  const seenKinds = new Set<string>();
  const normalized: ProtectedSuggestionContactMethod[] = [];
  let preferredContactKind: ContactKind | null = null;
  let preferredContactValue: string | null = null;

  for (const entry of value) {
    const kind = entry?.kind;
    const rawValue = entry?.value ?? "";
    const contactValue = rawValue.trim();
    const preferred = entry?.preferred === true;

    if (!CONTACT_KINDS.includes(kind)) {
      continue;
    }

    if (!contactValue) {
      continue;
    }

    if (seenKinds.has(kind)) {
      return {
        contactMethods: [],
        preferredContactKind: null,
        preferredContactValue: null,
        error: "Each contact method can only be listed once.",
      };
    }

    if (contactValue.length > 200) {
      return {
        contactMethods: [],
        preferredContactKind: null,
        preferredContactValue: null,
        error: "Contact details must be 200 characters or less.",
      };
    }

    const normalizedValue =
      kind === "email" ? normalizeEmailAddress(contactValue) : contactValue;
    if (kind === "email") {
      const emailValidationMessage = getEmailAddressValidationMessage(normalizedValue);
      if (emailValidationMessage) {
        return {
          contactMethods: [],
          preferredContactKind: null,
          preferredContactValue: null,
          error: emailValidationMessage,
        };
      }
    }

    seenKinds.add(kind);
    normalized.push({ kind, value: normalizedValue, preferred });

    if (preferred) {
      preferredContactKind = kind;
      preferredContactValue = normalizedValue;
    }
  }

  if (normalized.length === 0) {
    return {
      contactMethods: [],
      preferredContactKind: null,
      preferredContactValue: null,
      error: null,
    };
  }

  if (!preferredContactKind) {
    preferredContactKind = normalized[0]?.kind ?? null;
    preferredContactValue = normalized[0]?.value ?? null;
    normalized[0] = { ...normalized[0], preferred: true };
  }

  return {
    contactMethods: normalized,
    preferredContactKind,
    preferredContactValue,
    error: null,
  };
}

function normalizeSuggestionQuery(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function sharedPrefixLength(left: string, right: string): number {
  const maxLength = Math.min(left.length, right.length);
  let index = 0;

  while (index < maxLength && left[index] === right[index]) {
    index += 1;
  }

  return index;
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return true;

  let needleIndex = 0;
  for (const character of haystack) {
    if (character === needle[needleIndex]) {
      needleIndex += 1;
      if (needleIndex === needle.length) {
        return true;
      }
    }
  }

  return false;
}

function getSuggestionMatchScore(query: string, candidate: string): number {
  if (!query) return 1;

  if (candidate === query) {
    return 500;
  }

  if (query.includes(candidate)) {
    return 400 + Math.min(candidate.length, 99);
  }

  if (candidate.includes(query)) {
    return 300 + Math.min(query.length, 99);
  }

  const prefixLength = sharedPrefixLength(query, candidate);
  if (prefixLength < 4) {
    return 0;
  }

  const queryRemainder = query.slice(prefixLength);
  const candidateRemainder = candidate.slice(prefixLength);
  if (!queryRemainder || !candidateRemainder) {
    return 0;
  }

  const [shorterRemainder, longerRemainder] =
    queryRemainder.length <= candidateRemainder.length
      ? [queryRemainder, candidateRemainder]
      : [candidateRemainder, queryRemainder];

  if (!isSubsequence(shorterRemainder, longerRemainder)) {
    return 0;
  }

  return 200 + prefixLength * 10 - Math.abs(queryRemainder.length - candidateRemainder.length);
}

export function isValidProtectedSuggestionName(value: string): boolean {
  return PROTECTED_SUGGESTION_NAME_PATTERN.test(value.trim());
}

export function isValidProtectedSuggestionUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateProtectedSuggestionPayload(payload: ProtectedSuggestionPayload): {
  normalizedPayload: ProtectedSuggestionPayload & {
    submittedByEmail: string | null;
    preferredContactKind: ContactKind | null;
    preferredContactValue: string | null;
  };
  error: string | null;
} {
  const suggestionType =
    payload.suggestionType === "variant" ? "variant" : "canonical";
  const name = payload.name.trim();
  const parentName = payload.parentName?.trim() || null;
  const category = payload.category.trim();
  const reason = payload.reason.trim();
  const { contactMethods, preferredContactKind, preferredContactValue, error: contactError } =
    normalizeContactMethods(payload.contactMethods);
  const unifiedAddress = payload.unifiedAddress?.trim() || null;
  const submittedByEmail =
    (preferredContactKind === "email" ? preferredContactValue : null)
    ?? contactMethods.find((entry) => entry.kind === "email")?.value
    ?? null;
  const evidenceLinks = payload.evidenceLinks
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!name) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: "Enter a name to review.",
    };
  }

  if (!isValidProtectedSuggestionName(name)) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: "Use letters and numbers only.",
    };
  }

  if (suggestionType === "variant" && !parentName) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: "The parent name must be submitted before its variants.",
    };
  }

  if (!PROTECTED_NAME_CATEGORIES.includes(category as ProtectedNameCategory)) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: "Select a valid category.",
    };
  }

  if (!reason) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: "Explain why this name should be protected.",
    };
  }

  if (contactError) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: contactError,
    };
  }

  if (unifiedAddress) {
    const addressValidation = validateAddress(unifiedAddress);
    if (addressValidation.status !== "unified") {
      return {
        normalizedPayload: {
          suggestionType,
          name,
          parentName,
          category,
          reason,
          evidenceLinks,
          contactMethods,
          unifiedAddress,
          submittedByEmail,
          preferredContactKind,
          preferredContactValue,
        },
        error: addressValidation.warning || "Enter a valid Zcash Unified Address.",
      };
    }
  }

  const invalidEvidenceLink = evidenceLinks.find(
    (entry) => !isValidProtectedSuggestionUrl(entry),
  );
  if (invalidEvidenceLink) {
    return {
      normalizedPayload: {
        suggestionType,
        name,
        parentName,
        category,
        reason,
        evidenceLinks,
        contactMethods,
        unifiedAddress,
        submittedByEmail,
        preferredContactKind,
        preferredContactValue,
      },
      error: "Evidence links must start with http:// or https://.",
    };
  }

  return {
    normalizedPayload: {
      suggestionType,
      name,
      parentName: suggestionType === "canonical" ? null : parentName,
      category,
      reason,
      evidenceLinks,
      contactMethods,
      unifiedAddress,
      submittedByEmail,
      preferredContactKind,
      preferredContactValue,
    },
    error: null,
  };
}

export async function getProtectedSuggestionOptions(args: {
  kind: ProtectedSuggestionOptionKind;
  query?: string | null;
}): Promise<ProtectedSuggestionOption[]> {
  const query = normalizeSuggestionQuery(args.query);

  let request = db
    .from("zn_protected_names")
    .select("name, normalized_name, parent_name, category, status")
    .is("parent_name", null)
    .neq("status", "rejected");

  if (!query) {
    request = request
      .order("normalized_name", { ascending: true })
      .limit(PROTECTED_SUGGESTION_OPTION_LIMIT);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = query.toLowerCase();
  const rows = ((data ?? []) as ProtectedNameOptionRow[])
    .map((row) => ({
      row,
      score: getSuggestionMatchScore(normalizedQuery, row.normalized_name.toLowerCase()),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.row.normalized_name.localeCompare(right.row.normalized_name);
    })
    .slice(0, PROTECTED_SUGGESTION_OPTION_LIMIT);

  return rows.map(({ row }) => ({
    value: row.name,
    label: row.name,
    category: row.category,
  }));
}

export async function protectedSuggestionNameExists(name: string): Promise<boolean> {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return false;

  const { data, error } = await db
    .from("zn_protected_names")
    .select("name")
    .eq("normalized_name", normalizedName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getCanonicalProtectedNameByName(
  name: string,
): Promise<ProtectedSuggestionOption | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const { data, error } = await db
    .from("zn_protected_names")
    .select("name, normalized_name, parent_name, category, status")
    .eq("name", trimmedName)
    .is("parent_name", null)
    .neq("status", "rejected")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as ProtectedNameOptionRow | null;
  if (!row) return null;

  return {
    value: row.name,
    label: row.name,
    category: row.category,
  };
}

export async function submitProtectedNameSuggestion(
  payload: ProtectedSuggestionPayload & {
    submittedByEmail: string | null;
    preferredContactKind: ContactKind | null;
    preferredContactValue: string | null;
  },
): Promise<ProtectedSuggestionRpcResult> {
  const { data, error } = await db.rpc("submit_protected_name_suggestion", {
    submitted_name: payload.name,
    submitted_parent_name: payload.parentName,
    submitted_category: payload.category,
    submitted_reason: payload.reason,
    submitted_by_email: payload.submittedByEmail,
    submitted_contact_methods: payload.contactMethods,
    submitted_preferred_contact_kind: payload.preferredContactKind,
    submitted_preferred_contact_value: payload.preferredContactValue,
    submitted_zcash_unified_address: payload.unifiedAddress,
    submitted_evidence_urls: payload.evidenceLinks,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ProtectedSuggestionRpcResult;
}
