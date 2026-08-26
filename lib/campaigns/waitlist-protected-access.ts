import "server-only";

import { db } from "@/lib/db";
import type { ProtectedAccessRelationship } from "@/lib/protected/shared";
import type { ContactKind } from "@/lib/types";

export type WaitlistProtectedAccessStatus = "submitted" | "approved" | "denied";

export type WaitlistProtectedAccessRelationship = ProtectedAccessRelationship;

export type WaitlistProtectedContactMethod = {
  kind: ContactKind;
  value: string;
};

type ProtectedNameLookupRow = {
  name: string;
  normalized_name: string;
  category: string | null;
  redeemed: boolean | null;
  zm_priority_claim?: boolean | null;
  expires_at?: string | null;
};

type WaitlistProtectedAccessRequestRow = {
  id: string;
  waitlist_row_id: string | null;
  normalized_email: string;
  requested_name: string;
  status: WaitlistProtectedAccessStatus;
  contact_methods: unknown;
  preferred_contact_kind: ContactKind | null;
  preferred_contact_value: string | null;
  relationship: WaitlistProtectedAccessRelationship | null;
  supporting_link: string | null;
  additional_context: string | null;
  reference_number: string;
  submitted_at: string;
  updated_at: string;
  approved_at: string | null;
  denied_at: string | null;
};

export type ProtectedNameInfo = {
  name: string;
  category: string | null;
  redeemed: boolean;
  isProtected: boolean;
  zmPriorityClaim: boolean;
  expiresAt: string | null;
};

export type WaitlistProtectedAccessRequest = {
  id: string;
  waitlistRowId: string | null;
  normalizedEmail: string;
  requestedName: string;
  status: WaitlistProtectedAccessStatus;
  contactMethods: WaitlistProtectedContactMethod[];
  preferredContactKind: ContactKind | null;
  preferredContactValue: string | null;
  relationship: WaitlistProtectedAccessRelationship | null;
  supportingLink: string | null;
  additionalContext: string | null;
  referenceNumber: string;
  submittedAt: string;
  updatedAt: string;
  approvedAt: string | null;
  deniedAt: string | null;
};

function normalizeNameValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function parseContactMethods(value: unknown): WaitlistProtectedContactMethod[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const rawKind = "kind" in entry ? entry.kind : null;
      const rawValue = "value" in entry ? entry.value : null;
      if (typeof rawKind !== "string" || typeof rawValue !== "string") {
        return null;
      }

      const kind = rawKind.trim() as ContactKind;
      const contactValue = rawValue.trim();
      if (!kind || !contactValue) {
        return null;
      }

      return { kind, value: contactValue };
    })
    .filter((entry): entry is WaitlistProtectedContactMethod => Boolean(entry));
}

function mapRequestRow(
  row: WaitlistProtectedAccessRequestRow,
): WaitlistProtectedAccessRequest {
  return {
    id: row.id,
    waitlistRowId: row.waitlist_row_id,
    normalizedEmail: row.normalized_email,
    requestedName: row.requested_name,
    status: row.status,
    contactMethods: parseContactMethods(row.contact_methods),
    preferredContactKind: row.preferred_contact_kind,
    preferredContactValue: row.preferred_contact_value,
    relationship: row.relationship,
    supportingLink: row.supporting_link,
    additionalContext: row.additional_context,
    referenceNumber: row.reference_number,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    approvedAt: row.approved_at,
    deniedAt: row.denied_at,
  };
}

export async function getProtectedNameInfoByName(
  names: Array<string | null | undefined>,
): Promise<Map<string, ProtectedNameInfo>> {
  const normalizedNames = Array.from(
    new Set(names.map((name) => normalizeNameValue(name)).filter((name): name is string => Boolean(name))),
  );
  const protectedByName = new Map<string, ProtectedNameInfo>();

  if (normalizedNames.length === 0) {
    return protectedByName;
  }

  const selectWithPriority = "name, normalized_name, category, redeemed, zm_priority_claim, expires_at";
  const selectBasic = "name, normalized_name, category, redeemed";

  let { data, error } = await db
    .from("zn_protected_names")
    .select(selectWithPriority)
    .in("normalized_name", normalizedNames)
    .eq("status", "protected");

  if (
    error
    && (error.message.includes("zm_priority_claim") || error.message.includes("expires_at"))
  ) {
    const fallback = await db
      .from("zn_protected_names")
      .select(selectBasic)
      .in("normalized_name", normalizedNames)
      .eq("status", "protected");
    data = (fallback.data ?? null) as typeof data;
    error = fallback.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ProtectedNameLookupRow[]) {
    const normalizedName = normalizeNameValue(row.normalized_name) ?? normalizeNameValue(row.name);
    if (!normalizedName) continue;

    // Prefer keeping an unredeemed row if multiple match the same name.
    const existing = protectedByName.get(normalizedName);
    const redeemed = row.redeemed === true;
    if (existing && existing.isProtected && redeemed) {
      continue;
    }

    protectedByName.set(normalizedName, {
      name: row.name,
      category: row.category,
      redeemed,
      isProtected: !redeemed,
      zmPriorityClaim: row.zm_priority_claim === true,
      expiresAt: row.expires_at ?? null,
    });
  }

  return protectedByName;
}

export async function getLatestProtectedAccessRequestsByRowId(
  rowIds: string[],
): Promise<Map<string, WaitlistProtectedAccessRequest>> {
  const uniqueRowIds = Array.from(
    new Set(rowIds.map((rowId) => rowId.trim()).filter(Boolean)),
  );
  const requestByRowId = new Map<string, WaitlistProtectedAccessRequest>();

  if (uniqueRowIds.length === 0) {
    return requestByRowId;
  }

  const { data, error } = await db
    .from("waitlist_protected_name_access_requests")
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, status, contact_methods, preferred_contact_kind, preferred_contact_value, relationship, supporting_link, additional_context, reference_number, submitted_at, updated_at, approved_at, denied_at",
    )
    .in("waitlist_row_id", uniqueRowIds)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as WaitlistProtectedAccessRequestRow[]) {
    if (!row.waitlist_row_id || requestByRowId.has(row.waitlist_row_id)) {
      continue;
    }
    requestByRowId.set(row.waitlist_row_id, mapRequestRow(row));
  }

  return requestByRowId;
}

export async function getLatestProtectedAccessRequestForEmailAndName(args: {
  normalizedEmail: string;
  requestedName: string;
}): Promise<WaitlistProtectedAccessRequest | null> {
  const requestedName = normalizeNameValue(args.requestedName);
  if (!requestedName) return null;

  const { data, error } = await db
    .from("waitlist_protected_name_access_requests")
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, status, contact_methods, preferred_contact_kind, preferred_contact_value, relationship, supporting_link, additional_context, reference_number, submitted_at, updated_at, approved_at, denied_at",
    )
    .eq("normalized_email", args.normalizedEmail)
    .order("submitted_at", { ascending: false })
    .limit(40);

  if (error) {
    throw new Error(error.message);
  }

  const match = ((data ?? []) as WaitlistProtectedAccessRequestRow[]).find(
    (row) => normalizeNameValue(row.requested_name) === requestedName,
  );

  return match ? mapRequestRow(match) : null;
}

export async function getLatestProtectedAccessRequestForRow(args: {
  rowId: string;
  normalizedEmail: string;
}): Promise<WaitlistProtectedAccessRequest | null> {
  const { data, error } = await db
    .from("waitlist_protected_name_access_requests")
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, status, contact_methods, preferred_contact_kind, preferred_contact_value, relationship, supporting_link, additional_context, reference_number, submitted_at, updated_at, approved_at, denied_at",
    )
    .eq("waitlist_row_id", args.rowId)
    .eq("normalized_email", args.normalizedEmail)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRequestRow(data as WaitlistProtectedAccessRequestRow) : null;
}

export async function submitOrUpdateProtectedAccessRequest(args: {
  rowId: string | null;
  normalizedEmail: string;
  requestedName: string;
  contactMethods: WaitlistProtectedContactMethod[];
  preferredContactKind: ContactKind;
  preferredContactValue: string;
  relationship: WaitlistProtectedAccessRelationship;
  supportingLink: string | null;
  additionalContext: string | null;
}): Promise<WaitlistProtectedAccessRequest> {
  const existingByRow = args.rowId
    ? await getLatestProtectedAccessRequestForRow({
        rowId: args.rowId,
        normalizedEmail: args.normalizedEmail,
      })
    : null;
  const existingByName = await getLatestProtectedAccessRequestForEmailAndName({
    normalizedEmail: args.normalizedEmail,
    requestedName: args.requestedName,
  });
  const existing = existingByRow ?? existingByName;

  if (existing && (existing.status === "submitted" || existing.status === "approved")) {
    if (existing.status === "approved") {
      return existing;
    }

    const { data, error } = await db
      .from("waitlist_protected_name_access_requests")
      .update({
        waitlist_row_id: args.rowId ?? existing.waitlistRowId,
        requested_name: args.requestedName,
        contact_methods: args.contactMethods,
        preferred_contact_kind: args.preferredContactKind,
        preferred_contact_value: args.preferredContactValue,
        relationship: args.relationship,
        supporting_link: args.supportingLink,
        additional_context: args.additionalContext,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select(
        "id, waitlist_row_id, normalized_email, requested_name, status, contact_methods, preferred_contact_kind, preferred_contact_value, relationship, supporting_link, additional_context, reference_number, submitted_at, updated_at, approved_at, denied_at",
      )
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapRequestRow(data as WaitlistProtectedAccessRequestRow);
  }

  const { data, error } = await db
    .from("waitlist_protected_name_access_requests")
    .insert({
      waitlist_row_id: args.rowId,
      normalized_email: args.normalizedEmail,
      requested_name: args.requestedName,
      status: "submitted",
      contact_methods: args.contactMethods,
      preferred_contact_kind: args.preferredContactKind,
      preferred_contact_value: args.preferredContactValue,
      relationship: args.relationship,
      supporting_link: args.supportingLink,
      additional_context: args.additionalContext,
    })
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, status, contact_methods, preferred_contact_kind, preferred_contact_value, relationship, supporting_link, additional_context, reference_number, submitted_at, updated_at, approved_at, denied_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRequestRow(data as WaitlistProtectedAccessRequestRow);
}
