import "server-only";

import {
  getLatestProtectedAccessRequestForEmailAndName,
  getProtectedNameInfoByName,
  submitOrUpdateProtectedAccessRequest,
  type WaitlistProtectedAccessRequest,
} from "@/lib/campaigns/waitlist-protected-access";
import {
  findWaitlistRowsByNormalizedEmail,
  normalizeWaitlistName,
} from "@/lib/campaigns/waitlist-verify";
import { db } from "@/lib/db";
import { getEmailAddressValidationMessage, normalizeEmailAddress } from "@/lib/email-address";
import {
  PROTECTED_ACCESS_RELATIONSHIPS,
  PROTECTED_NAME_CATEGORIES,
  PROTECTED_REQUEST_CONTACT_KINDS,
  PROTECTED_REQUEST_OPTION_LIMIT,
  normalizeEvidenceUrls,
  type ProtectedAccessRelationship,
  type ProtectedNameCategory,
  type ProtectedRequestContactKind,
  type ProtectedRequestContactMethod,
  type ProtectedRequestNameOption,
  type ProtectedRequestPayload,
} from "@/lib/protected/shared";

type ProtectedRequestNameRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  category: ProtectedNameCategory;
  status: string;
  reason: string;
  protected_at: string | null;
  redeemed: boolean | null;
  ens_priority_claim?: boolean | null;
  zm_priority_claim?: boolean | null;
  evidence?: unknown;
  created_at: string;
  updated_at: string | null;
};

const REQUEST_NAME_SELECT =
  "name, normalized_name, parent_name, category, status, reason, protected_at, redeemed, ens_priority_claim, zm_priority_claim, evidence, created_at, updated_at";

function isRequestContactKind(value: string): value is ProtectedRequestContactKind {
  return (PROTECTED_REQUEST_CONTACT_KINDS as readonly string[]).includes(value);
}

function normalizeRequestQuery(value: string | null | undefined): string {
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

function getRequestMatchScore(query: string, candidate: string): number {
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

function mapRequestNameRow(row: ProtectedRequestNameRow): ProtectedRequestNameOption | null {
  if (row.status !== "protected" || row.redeemed) {
    return null;
  }

  if (!PROTECTED_NAME_CATEGORIES.includes(row.category)) {
    return null;
  }

  return {
    value: row.name,
    label: row.name,
    normalizedName: row.normalized_name,
    parentName: row.parent_name,
    category: row.category,
    status: "protected",
    reason: row.reason,
    protectedAt: row.protected_at,
    redeemed: false,
    ensPriorityClaim: row.ens_priority_claim === true,
    zmPriorityClaim: row.zm_priority_claim === true,
    evidence: normalizeEvidenceUrls(row.evidence),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isValidProtectedRequestUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeContactMethods(value: ProtectedRequestContactMethod[]): {
  contactMethods: ProtectedRequestContactMethod[];
  preferredContactKind: ProtectedRequestContactKind | null;
  preferredContactValue: string | null;
  submittedByEmail: string | null;
  error: string | null;
} {
  const seenKinds = new Set<string>();
  const normalized: ProtectedRequestContactMethod[] = [];
  let preferredContactKind: ProtectedRequestContactKind | null = null;
  let preferredContactValue: string | null = null;

  for (const entry of value) {
    const kind = entry?.kind;
    const rawValue = entry?.value ?? "";
    const contactValue = rawValue.trim();
    const preferred = entry?.preferred === true;

    if (!isRequestContactKind(kind) || !contactValue) {
      continue;
    }

    if (seenKinds.has(kind)) {
      return {
        contactMethods: [],
        preferredContactKind: null,
        preferredContactValue: null,
        submittedByEmail: null,
        error: "Each contact method can only be listed once.",
      };
    }

    if (contactValue.length > 200) {
      return {
        contactMethods: [],
        preferredContactKind: null,
        preferredContactValue: null,
        submittedByEmail: null,
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
          submittedByEmail: null,
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
      submittedByEmail: null,
      error: "Add at least one contact method.",
    };
  }

  if (!preferredContactKind) {
    preferredContactKind = normalized[0]?.kind ?? null;
    preferredContactValue = normalized[0]?.value ?? null;
    normalized[0] = { ...normalized[0], preferred: true };
  }

  const submittedByEmail =
    (preferredContactKind === "email" ? preferredContactValue : null)
    ?? normalized.find((entry) => entry.kind === "email")?.value
    ?? null;

  if (!submittedByEmail) {
    return {
      contactMethods: [],
      preferredContactKind: null,
      preferredContactValue: null,
      submittedByEmail: null,
      error: "Add an email contact method so we can follow up.",
    };
  }

  return {
    contactMethods: normalized,
    preferredContactKind,
    preferredContactValue,
    submittedByEmail,
    error: null,
  };
}

export function validateProtectedRequestPayload(payload: ProtectedRequestPayload): {
  normalizedPayload: ProtectedRequestPayload & {
    submittedByEmail: string;
    preferredContactKind: ProtectedRequestContactKind;
    preferredContactValue: string;
    relationship: ProtectedAccessRelationship;
  };
  error: string | null;
} {
  const name = payload.name.trim();
  const normalizedName = payload.normalizedName.trim().toLowerCase() || name.toLowerCase();
  const relationship = payload.relationship;
  const supportingLink = payload.supportingLink?.trim() || null;
  const additionalContext = payload.additionalContext?.trim() || null;
  const {
    contactMethods,
    preferredContactKind,
    preferredContactValue,
    submittedByEmail,
    error: contactError,
  } = normalizeContactMethods(payload.contactMethods);

  if (!name || !normalizedName) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
        contactMethods,
        relationship,
        supportingLink,
        additionalContext,
        submittedByEmail: submittedByEmail ?? "",
        preferredContactKind: preferredContactKind ?? "email",
        preferredContactValue: preferredContactValue ?? "",
      },
      error: "Select a non-redeemed protected name to request.",
    };
  }

  if (!PROTECTED_ACCESS_RELATIONSHIPS.includes(relationship)) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
        contactMethods,
        relationship,
        supportingLink,
        additionalContext,
        submittedByEmail: submittedByEmail ?? "",
        preferredContactKind: preferredContactKind ?? "email",
        preferredContactValue: preferredContactValue ?? "",
      },
      error: "Choose how you are related to this name.",
    };
  }

  if (supportingLink && !isValidProtectedRequestUrl(supportingLink)) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
        contactMethods,
        relationship,
        supportingLink,
        additionalContext,
        submittedByEmail: submittedByEmail ?? "",
        preferredContactKind: preferredContactKind ?? "email",
        preferredContactValue: preferredContactValue ?? "",
      },
      error: "Supporting link must start with http:// or https://.",
    };
  }

  if ((additionalContext ?? "").length > 400) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
        contactMethods,
        relationship,
        supportingLink,
        additionalContext,
        submittedByEmail: submittedByEmail ?? "",
        preferredContactKind: preferredContactKind ?? "email",
        preferredContactValue: preferredContactValue ?? "",
      },
      error: "Additional context must be 400 characters or less.",
    };
  }

  if (contactError || !submittedByEmail || !preferredContactKind || !preferredContactValue) {
    return {
      normalizedPayload: {
        name,
        normalizedName,
        contactMethods,
        relationship,
        supportingLink,
        additionalContext,
        submittedByEmail: submittedByEmail ?? "",
        preferredContactKind: preferredContactKind ?? "email",
        preferredContactValue: preferredContactValue ?? "",
      },
      error: contactError ?? "Add at least one contact method.",
    };
  }

  return {
    normalizedPayload: {
      name,
      normalizedName,
      contactMethods,
      relationship,
      supportingLink,
      additionalContext,
      submittedByEmail,
      preferredContactKind,
      preferredContactValue,
    },
    error: null,
  };
}

export async function getProtectedRequestOptions(args: {
  query?: string | null;
}): Promise<ProtectedRequestNameOption[]> {
  const query = normalizeRequestQuery(args.query);

  let request = db
    .from("zn_protected_names")
    .select(REQUEST_NAME_SELECT)
    .eq("status", "protected")
    .eq("redeemed", false);

  if (!query) {
    request = request
      .order("normalized_name", { ascending: true })
      .limit(PROTECTED_REQUEST_OPTION_LIMIT);
  }

  const { data, error } = await request;
  if (error) {
    throw new Error(error.message);
  }

  const normalizedQuery = query.toLowerCase();
  const rows = ((data ?? []) as ProtectedRequestNameRow[])
    .map((row) => ({
      row,
      score: getRequestMatchScore(normalizedQuery, row.normalized_name.toLowerCase()),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.row.normalized_name.localeCompare(right.row.normalized_name);
    })
    .slice(0, PROTECTED_REQUEST_OPTION_LIMIT);

  return rows
    .map(({ row }) => mapRequestNameRow(row))
    .filter((entry): entry is ProtectedRequestNameOption => entry !== null);
}

export async function getRequestableProtectedNameByName(
  name: string,
): Promise<ProtectedRequestNameOption | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const byName = await db
    .from("zn_protected_names")
    .select(REQUEST_NAME_SELECT)
    .eq("name", trimmedName)
    .eq("status", "protected")
    .eq("redeemed", false)
    .limit(1)
    .maybeSingle();

  if (byName.error) {
    throw new Error(byName.error.message);
  }

  if (byName.data) {
    return mapRequestNameRow(byName.data as ProtectedRequestNameRow);
  }

  const byNormalized = await db
    .from("zn_protected_names")
    .select(REQUEST_NAME_SELECT)
    .eq("normalized_name", trimmedName.toLowerCase())
    .eq("status", "protected")
    .eq("redeemed", false)
    .limit(1)
    .maybeSingle();

  if (byNormalized.error) {
    throw new Error(byNormalized.error.message);
  }

  const row = byNormalized.data as ProtectedRequestNameRow | null;
  if (!row) return null;

  return mapRequestNameRow(row);
}

export async function submitPublicProtectedAccessRequest(
  payload: ProtectedRequestPayload & {
    submittedByEmail: string;
    preferredContactKind: ProtectedRequestContactKind;
    preferredContactValue: string;
  },
): Promise<WaitlistProtectedAccessRequest> {
  const requestableName = await getRequestableProtectedNameByName(payload.name);
  if (!requestableName) {
    throw new Error("Only non-redeemed protected names can be requested.");
  }

  if (requestableName.zmPriorityClaim) {
    throw new Error("Zcash.me priority names do not require this form.");
  }

  const protectedNames = await getProtectedNameInfoByName([requestableName.normalizedName]);
  const protectedName = protectedNames.get(requestableName.normalizedName);
  if (!protectedName?.isProtected) {
    throw new Error("This name is not currently protected.");
  }

  const waitlistRows = await findWaitlistRowsByNormalizedEmail(payload.submittedByEmail);
  const matchingWaitlistRow =
    waitlistRows.find(
      (row) => normalizeWaitlistName(row.name) === requestableName.normalizedName,
    ) ?? null;

  if (!matchingWaitlistRow) {
    const existing = await getLatestProtectedAccessRequestForEmailAndName({
      normalizedEmail: payload.submittedByEmail,
      requestedName: requestableName.value,
    });
    if (existing?.status === "approved") {
      return existing;
    }
  }

  return submitOrUpdateProtectedAccessRequest({
    rowId: matchingWaitlistRow?.id ?? null,
    normalizedEmail: payload.submittedByEmail,
    requestedName: requestableName.value,
    contactMethods: payload.contactMethods.map((contact) => ({
      kind: contact.kind,
      value: contact.value,
    })),
    preferredContactKind: payload.preferredContactKind,
    preferredContactValue: payload.preferredContactValue,
    relationship: payload.relationship,
    supportingLink: payload.supportingLink,
    additionalContext: payload.additionalContext,
  });
}
