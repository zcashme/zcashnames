import "server-only";

import { db } from "@/lib/db";
import { getEmailAddressValidationMessage, normalizeEmailAddress } from "@/lib/email-address";
import {
  PROTECTED_DISPUTE_OPTION_LIMIT,
  PROTECTED_NAME_CATEGORIES,
  type ProtectedDisputeNameOption,
  type ProtectedDisputeNameStatus,
  type ProtectedDisputePayload,
  type ProtectedNameCategory,
  type ProtectedSuggestionContactMethod,
} from "@/lib/protected/shared";
import { validateAddress } from "@/lib/zns/address-validation";
import { CONTACT_KINDS, type ContactKind } from "@/lib/types";

type ProtectedDisputeNameRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  category: ProtectedNameCategory;
  status: string;
  reason: string;
  protected_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  redeemed: boolean | null;
  created_at: string;
  updated_at: string | null;
};

export type ProtectedDisputeRpcResult = {
  id: string;
  protected_name: string;
  normalized_name: string;
  name_status_at_submission: ProtectedDisputeNameStatus;
  review_status: string;
};

const DISPUTABLE_STATUSES: ProtectedDisputeNameStatus[] = ["protected", "rejected"];

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

function normalizeDisputeQuery(value: string | null | undefined): string {
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

function getDisputeMatchScore(query: string, candidate: string): number {
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
  if (prefixLength < 2) {
    return 0;
  }

  const queryRemainder = query.slice(prefixLength);
  const candidateRemainder = candidate.slice(prefixLength);
  if (!queryRemainder || !candidateRemainder) {
    return 100 + prefixLength * 10;
  }

  const [shorterRemainder, longerRemainder] =
    queryRemainder.length <= candidateRemainder.length
      ? [queryRemainder, candidateRemainder]
      : [candidateRemainder, queryRemainder];

  if (!isSubsequence(shorterRemainder, longerRemainder)) {
    return prefixLength >= 4 ? 50 + prefixLength * 5 : 0;
  }

  return 200 + prefixLength * 10 - Math.abs(queryRemainder.length - candidateRemainder.length);
}

function isDisputableStatus(status: string): status is ProtectedDisputeNameStatus {
  return DISPUTABLE_STATUSES.includes(status as ProtectedDisputeNameStatus);
}

function mapDisputeNameRow(row: ProtectedDisputeNameRow): ProtectedDisputeNameOption | null {
  if (!isDisputableStatus(row.status)) {
    return null;
  }

  // Redeemed names are locked in and cannot be disputed.
  if (row.redeemed) {
    return null;
  }

  return {
    value: row.name,
    label: row.name,
    normalizedName: row.normalized_name,
    parentName: row.parent_name,
    category: row.category,
    status: row.status,
    reason: row.reason,
    protectedAt: row.protected_at,
    rejectedAt: row.rejected_at,
    rejectedReason: row.rejected_reason,
    redeemed: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isValidProtectedDisputeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateProtectedDisputePayload(payload: ProtectedDisputePayload): {
  normalizedPayload: ProtectedDisputePayload & {
    submittedByEmail: string | null;
    preferredContactKind: ContactKind | null;
    preferredContactValue: string | null;
  };
  error: string | null;
} {
  const name = payload.name.trim();
  const normalizedName = payload.normalizedName.trim().toLowerCase() || name.toLowerCase();
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
        name,
        normalizedName,
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
      error: "Select a non-redeemed protected or rejected name to dispute.",
    };
  }

  if (!PROTECTED_NAME_CATEGORIES.includes(category as ProtectedNameCategory)) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
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
        name,
        normalizedName,
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
      error: "Explain your dispute reason.",
    };
  }

  if (contactError) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
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
          name,
          normalizedName,
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
    (entry) => !isValidProtectedDisputeUrl(entry),
  );
  if (invalidEvidenceLink) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
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
      name,
      normalizedName,
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
    error: null,
  };
}

const DISPUTE_NAME_SELECT =
  "name, normalized_name, parent_name, category, status, reason, protected_at, rejected_at, rejected_reason, redeemed, created_at, updated_at";

export async function getProtectedDisputeOptions(args: {
  query?: string | null;
}): Promise<ProtectedDisputeNameOption[]> {
  const query = normalizeDisputeQuery(args.query);

  let request = db
    .from("zn_protected_names")
    .select(DISPUTE_NAME_SELECT)
    .in("status", DISPUTABLE_STATUSES)
    .eq("redeemed", false);

  if (!query) {
    request = request
      .order("normalized_name", { ascending: true })
      .limit(PROTECTED_DISPUTE_OPTION_LIMIT);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = query.toLowerCase();
  const rows = ((data ?? []) as ProtectedDisputeNameRow[])
    .map((row) => ({
      row,
      score: getDisputeMatchScore(normalizedQuery, row.normalized_name.toLowerCase()),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.row.normalized_name.localeCompare(right.row.normalized_name);
    })
    .slice(0, PROTECTED_DISPUTE_OPTION_LIMIT);

  return rows
    .map(({ row }) => mapDisputeNameRow(row))
    .filter((entry): entry is ProtectedDisputeNameOption => entry !== null);
}

export async function getDisputableProtectedNameByName(
  name: string,
): Promise<ProtectedDisputeNameOption | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const byName = await db
    .from("zn_protected_names")
    .select(DISPUTE_NAME_SELECT)
    .eq("name", trimmedName)
    .in("status", DISPUTABLE_STATUSES)
    .eq("redeemed", false)
    .limit(1)
    .maybeSingle();

  if (byName.error) {
    throw new Error(byName.error.message);
  }

  if (byName.data) {
    return mapDisputeNameRow(byName.data as ProtectedDisputeNameRow);
  }

  const byNormalized = await db
    .from("zn_protected_names")
    .select(DISPUTE_NAME_SELECT)
    .eq("normalized_name", trimmedName.toLowerCase())
    .in("status", DISPUTABLE_STATUSES)
    .eq("redeemed", false)
    .limit(1)
    .maybeSingle();

  if (byNormalized.error) {
    throw new Error(byNormalized.error.message);
  }

  const row = byNormalized.data as ProtectedDisputeNameRow | null;
  if (!row) return null;

  return mapDisputeNameRow(row);
}

export async function submitProtectedNameDispute(
  payload: ProtectedDisputePayload & {
    submittedByEmail: string | null;
    preferredContactKind: ContactKind | null;
    preferredContactValue: string | null;
  },
): Promise<ProtectedDisputeRpcResult> {
  const { data, error } = await db.rpc("submit_protected_name_dispute", {
    submitted_name: payload.name,
    submitted_category: payload.category,
    submitted_parent_name: payload.parentName,
    submitted_reason: payload.reason,
    submitted_by_email: payload.submittedByEmail,
    submitted_contact_methods: payload.contactMethods,
    submitted_preferred_contact_kind: payload.preferredContactKind,
    submitted_preferred_contact_value: payload.preferredContactValue,
    submitted_zcash_unified_address: payload.unifiedAddress,
    submitted_evidence: payload.evidenceLinks,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as ProtectedDisputeRpcResult;
}
