import "server-only";

import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { normalizeEvidenceArray } from "@/lib/protected-names/evidence";
import type {
  ContactMethod,
  EvidenceItem,
  ProtectedNameDetail,
  ProtectedNameDecision,
  ProtectedNameDispute,
  ProtectedNameAccessRequest,
  ProtectedNameQueueFilters,
  ProtectedNameQueueResult,
  ProtectedNameQueueRow,
  ProtectedNameRow,
  ProtectedNameStatus,
} from "@/lib/protected-names/types";
import {
  PROTECTED_NAME_CATEGORIES,
  PROTECTED_NAME_STATUSES,
} from "@/lib/protected-names/types";

const NAME_SELECT = [
  "name",
  "normalized_name",
  "parent_name",
  "category",
  "status",
  "reason",
  "submitted_by_email",
  "redeemed",
  "redeemed_at",
  "protected_at",
  "rejected_at",
  "rejected_reason",
  "updated_at",
  "created_at",
  "contact_methods",
  "preferred_contact_kind",
  "preferred_contact_value",
  "zcash_unified_address",
  "evidence",
].join(", ");

const DISPUTE_SELECT = [
  "id",
  "protected_name",
  "normalized_name",
  "name_status_at_submission",
  "category",
  "parent_name",
  "reason",
  "evidence",
  "contact_methods",
  "preferred_contact_kind",
  "preferred_contact_value",
  "zcash_unified_address",
  "submitted_by_email",
  "review_status",
  "created_at",
  "updated_at",
].join(", ");

const DEFAULT_PAGE_SIZE = 40;

type RawNameRow = Omit<ProtectedNameRow, "evidence" | "contact_methods"> & {
  evidence?: unknown;
  contact_methods?: unknown;
  redeemed?: boolean | null;
};

type RawDisputeRow = Omit<ProtectedNameDispute, "evidence" | "contact_methods"> & {
  evidence?: unknown;
  contact_methods?: unknown;
};

function normalizeContactMethods(value: unknown): ContactMethod[] {
  if (!Array.isArray(value)) return [];
  const methods: ContactMethod[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const kind = typeof record.kind === "string" ? record.kind : "";
    const contactValue = typeof record.value === "string" ? record.value : "";
    if (!kind || !contactValue) continue;
    methods.push({
      kind,
      value: contactValue,
      preferred: record.preferred === true,
    });
  }
  return methods;
}

function mapDecisionRow(row: Record<string, unknown>): ProtectedNameDecision {
  return {
    id: String(row.id), workflow: String(row.workflow), source_id: String(row.source_id),
    protected_name: String(row.protected_name), decision: String(row.decision), reason: String(row.reason),
    recipient_email: typeof row.recipient_email === "string" ? row.recipient_email : null,
    contact_methods: normalizeContactMethods(row.contact_methods),
    preferred_contact_kind: typeof row.preferred_contact_kind === "string" ? row.preferred_contact_kind : null,
    preferred_contact_value: typeof row.preferred_contact_value === "string" ? row.preferred_contact_value : null,
    decided_at: String(row.decided_at), notification_status: String(row.notification_status ?? "pending"),
    notification_attempted_at: typeof row.notification_attempted_at === "string" ? row.notification_attempted_at : null,
    notification_sent_at: typeof row.notification_sent_at === "string" ? row.notification_sent_at : null,
    notification_error: typeof row.notification_error === "string" ? row.notification_error : null,
    notification_provider_id: typeof row.notification_provider_id === "string" ? row.notification_provider_id : null,
    name_status: typeof row.name_status === "string" ? row.name_status : null,
    name_did_transition: typeof row.name_did_transition === "boolean" ? row.name_did_transition : null,
    submitted_reason: typeof row.submitted_reason === "string" ? row.submitted_reason : null,
  };
}

function mapAccessRequest(row: Record<string, unknown>): ProtectedNameAccessRequest {
  return {
    id: String(row.id), waitlist_row_id: typeof row.waitlist_row_id === "string" ? row.waitlist_row_id : null,
    normalized_email: String(row.normalized_email), requested_name: String(row.requested_name), status: String(row.status),
    contact_methods: normalizeContactMethods(row.contact_methods),
    preferred_contact_kind: typeof row.preferred_contact_kind === "string" ? row.preferred_contact_kind : null,
    preferred_contact_value: typeof row.preferred_contact_value === "string" ? row.preferred_contact_value : null,
    relationship: typeof row.relationship === "string" ? row.relationship : null,
    supporting_link: typeof row.supporting_link === "string" ? row.supporting_link : null,
    additional_context: typeof row.additional_context === "string" ? row.additional_context : null,
    reference_number: String(row.reference_number), submitted_at: String(row.submitted_at), updated_at: String(row.updated_at),
    approved_at: typeof row.approved_at === "string" ? row.approved_at : null,
    denied_at: typeof row.denied_at === "string" ? row.denied_at : null,
  };
}

function mapNameRow(row: RawNameRow): ProtectedNameRow {
  const evidence = normalizeEvidenceArray(row.evidence);
  return {
    name: row.name,
    normalized_name: row.normalized_name,
    parent_name: row.parent_name,
    category: row.category,
    status: row.status,
    reason: row.reason,
    submitted_by_email: row.submitted_by_email,
    redeemed: row.redeemed === true,
    redeemed_at: row.redeemed_at,
    protected_at: row.protected_at,
    rejected_at: row.rejected_at,
    rejected_reason: row.rejected_reason,
    updated_at: row.updated_at,
    created_at: row.created_at,
    contact_methods: normalizeContactMethods(row.contact_methods),
    preferred_contact_kind: row.preferred_contact_kind,
    preferred_contact_value: row.preferred_contact_value,
    zcash_unified_address: row.zcash_unified_address,
    evidence,
  };
}

function mapDisputeRow(row: RawDisputeRow): ProtectedNameDispute {
  return {
    id: row.id,
    protected_name: row.protected_name,
    normalized_name: row.normalized_name,
    name_status_at_submission: row.name_status_at_submission,
    category: row.category,
    parent_name: row.parent_name,
    reason: row.reason,
    evidence: normalizeEvidenceArray(row.evidence),
    contact_methods: normalizeContactMethods(row.contact_methods),
    preferred_contact_kind: row.preferred_contact_kind,
    preferred_contact_value: row.preferred_contact_value,
    zcash_unified_address: row.zcash_unified_address,
    submitted_by_email: row.submitted_by_email,
    review_status: row.review_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function parseQueueFilters(
  searchParams: Record<string, string | string[] | undefined>,
): ProtectedNameQueueFilters {
  const get = (key: string): string | null => {
    const value = searchParams[key];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  const statusRaw = get("status");
  let status: ProtectedNameQueueFilters["status"] = "needs_attention";
  if (statusRaw === "all" || statusRaw === "needs_attention") {
    status = statusRaw;
  } else if (
    statusRaw
    && PROTECTED_NAME_STATUSES.includes(statusRaw as ProtectedNameStatus)
  ) {
    status = statusRaw as ProtectedNameStatus;
  }

  const disputeRaw = get("dispute");
  const dispute =
    disputeRaw === "has_open" || disputeRaw === "no_open" ? disputeRaw : "any";

  const redeemedRaw = get("redeemed");
  const redeemed =
    redeemedRaw === "redeemed" || redeemedRaw === "not_redeemed"
      ? redeemedRaw
      : "any";

  const categoryRaw = get("category");
  const category =
    categoryRaw
    && PROTECTED_NAME_CATEGORIES.includes(
      categoryRaw as (typeof PROTECTED_NAME_CATEGORIES)[number],
    )
      ? (categoryRaw as (typeof PROTECTED_NAME_CATEGORIES)[number])
      : "all";

  const pageRaw = Number.parseInt(get("page") ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSizeRaw = Number.parseInt(get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = Number.isFinite(pageSizeRaw)
    ? Math.max(10, Math.min(100, pageSizeRaw))
    : DEFAULT_PAGE_SIZE;

  return {
    status,
    dispute,
    redeemed,
    category,
    q: (get("q") ?? "").trim(),
    createdFrom: get("createdFrom"),
    createdTo: get("createdTo"),
    page,
    pageSize,
  };
}

async function loadOpenDisputeCounts(
  names: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (names.length === 0) return map;

  const { data, error } = await db
    .from("zn_protected_names_disputes")
    .select("protected_name")
    .in("protected_name", names)
    .eq("review_status", "under_review");

  if (error) {
    if (
      error.message.includes("zn_protected_names_disputes")
      || error.code === "42P01"
    ) {
      return map;
    }
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const name = (row as { protected_name: string }).protected_name;
    map.set(name, (map.get(name) ?? 0) + 1);
  }

  return map;
}

/** Distinct protected names that currently have at least one open dispute. */
async function listNamesWithOpenDisputes(): Promise<string[]> {
  const { data, error } = await db
    .from("zn_protected_names_disputes")
    .select("protected_name")
    .eq("review_status", "under_review");

  if (error) {
    if (
      error.message.includes("zn_protected_names_disputes")
      || error.code === "42P01"
    ) {
      return [];
    }
    throw new Error(error.message);
  }

  const names = new Set<string>();
  for (const row of data ?? []) {
    const name = (row as { protected_name: string }).protected_name;
    if (name) names.add(name);
  }
  return [...names];
}

function applySharedQueueFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: ProtectedNameQueueFilters,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (filters.redeemed === "redeemed") {
    query = query.eq("redeemed", true);
  } else if (filters.redeemed === "not_redeemed") {
    query = query.eq("redeemed", false);
  }

  if (filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  if (filters.q) {
    const escaped = filters.q.replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${escaped}%,normalized_name.ilike.%${escaped}%`,
    );
  }

  if (filters.createdFrom) {
    query = query.gte("created_at", filters.createdFrom);
  }
  if (filters.createdTo) {
    query = query.lte("created_at", filters.createdTo);
  }

  return query;
}

export async function listProtectedNamesQueue(
  filters: ProtectedNameQueueFilters,
): Promise<ProtectedNameQueueResult> {
  let query = db
    .from("zn_protected_names")
    .select(NAME_SELECT, { count: "exact" });

  // Default / needs_attention: under_review OR has open disputes.
  if (filters.status === "needs_attention") {
    const openDisputeNames = await listNamesWithOpenDisputes();
    if (openDisputeNames.length === 0) {
      query = query.eq("status", "under_review");
    } else {
      // Names are constrained to [A-Za-z0-9]+ so they are safe in .in.(...).
      const inList = openDisputeNames.join(",");
      query = query.or(`status.eq.under_review,name.in.(${inList})`);
    }
  } else if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  query = applySharedQueueFilters(query, filters);

  // Dispute filter requires post-filter when we cannot express anti-join easily.
  // Fetch a wider page when filtering by dispute state, then slice.
  const needsDisputeFilter = filters.dispute !== "any";
  const from = (filters.page - 1) * filters.pageSize;
  const to = needsDisputeFilter
    ? from + filters.pageSize * 5 - 1
    : from + filters.pageSize - 1;

  query = query
    .order("created_at", { ascending: false })
    .range(from, Math.min(to, from + 499));

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const mapped = ((data ?? []) as unknown as RawNameRow[]).map(mapNameRow);
  const openCounts = await loadOpenDisputeCounts(mapped.map((row) => row.name));

  let rows: ProtectedNameQueueRow[] = mapped.map((row) => {
    const openDisputeCount = openCounts.get(row.name) ?? 0;
    return {
      ...row,
      evidenceCount: row.evidence.length,
      openDisputeCount,
      hasOpenDisputes: openDisputeCount > 0,
    };
  });

  if (filters.dispute === "has_open") {
    rows = rows.filter((row) => row.hasOpenDisputes);
  } else if (filters.dispute === "no_open") {
    rows = rows.filter((row) => !row.hasOpenDisputes);
  }

  if (needsDisputeFilter) {
    rows = rows.slice(0, filters.pageSize);
  }

  const totalCount = needsDisputeFilter ? rows.length : (count ?? rows.length);

  return {
    rows,
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    hasMore: needsDisputeFilter
      ? false
      : from + rows.length < (count ?? 0),
    filters,
  };
}

export async function getProtectedNameDetail(
  name: string,
): Promise<ProtectedNameDetail | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data, error } = await db
    .from("zn_protected_names")
    .select(NAME_SELECT)
    .eq("name", trimmed)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    // Try normalized match
    const byNormalized = await db
      .from("zn_protected_names")
      .select(NAME_SELECT)
      .eq("normalized_name", trimmed.toLowerCase())
      .maybeSingle();

    if (byNormalized.error) {
      throw new Error(byNormalized.error.message);
    }
    if (!byNormalized.data) return null;

    const raw = byNormalized.data as unknown as RawNameRow;
    return buildDetail(mapNameRow(raw), raw.evidence);
  }

  const raw = data as unknown as RawNameRow;
  return buildDetail(mapNameRow(raw), raw.evidence);
}

function evidenceNeedsUpgrade(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  return raw.some((entry) => typeof entry === "string");
}

function upgradeEvidenceItems(raw: unknown): EvidenceItem[] {
  return normalizeEvidenceArray(raw).map((item) => ({
    ...item,
    // Replace synthetic legacy-* ids with real UUIDs so admin CRUD can target them.
    id: item.id.startsWith("legacy-") ? randomUUID() : item.id,
  }));
}

/**
 * Public forms historically stored evidence as bare URL strings.
 * When an admin opens a record, upgrade those entries to structured objects in-place
 * so evidence add/patch/remove RPCs can address them by id.
 */
async function upgradeLegacyNameEvidenceIfNeeded(
  row: ProtectedNameRow,
  rawEvidence: unknown,
): Promise<ProtectedNameRow> {
  if (!evidenceNeedsUpgrade(rawEvidence)) return row;

  const upgraded = upgradeEvidenceItems(rawEvidence);
  const nextUpdatedAt = new Date().toISOString();
  const { error } = await db
    .from("zn_protected_names")
    .update({
      evidence: upgraded,
      updated_at: nextUpdatedAt,
    })
    .eq("name", row.name);

  if (error) {
    // Non-fatal: still show coerced evidence in UI; edits may fail until SQL migrate.
    console.warn("Failed to upgrade legacy name evidence:", error.message);
    return row;
  }

  return {
    ...row,
    evidence: upgraded,
    updated_at: nextUpdatedAt,
  };
}

async function upgradeLegacyDisputeEvidenceIfNeeded(
  dispute: ProtectedNameDispute,
  rawEvidence: unknown,
): Promise<ProtectedNameDispute> {
  if (!evidenceNeedsUpgrade(rawEvidence)) return dispute;

  const upgraded = upgradeEvidenceItems(rawEvidence);
  const nextUpdatedAt = new Date().toISOString();
  const { error } = await db
    .from("zn_protected_names_disputes")
    .update({
      evidence: upgraded,
      updated_at: nextUpdatedAt,
    })
    .eq("id", dispute.id);

  if (error) {
    console.warn("Failed to upgrade legacy dispute evidence:", error.message);
    return dispute;
  }

  return {
    ...dispute,
    evidence: upgraded,
    updated_at: nextUpdatedAt,
  };
}

async function buildDetail(
  row: ProtectedNameRow,
  rawEvidence: unknown,
): Promise<ProtectedNameDetail> {
  const upgradedRow = await upgradeLegacyNameEvidenceIfNeeded(row, rawEvidence);

  const [disputesResult, variantsResult] = await Promise.all([
    db
      .from("zn_protected_names_disputes")
      .select(DISPUTE_SELECT)
      .eq("protected_name", upgradedRow.name)
      .order("created_at", { ascending: false }),
    db
      .from("zn_protected_names")
      .select("name, status, redeemed, category, created_at")
      .eq("parent_name", upgradedRow.name)
      .order("normalized_name", { ascending: true }),
  ]);

  if (disputesResult.error) {
    if (
      !disputesResult.error.message.includes("zn_protected_names_disputes")
      && disputesResult.error.code !== "42P01"
    ) {
      throw new Error(disputesResult.error.message);
    }
  }

  if (variantsResult.error) {
    throw new Error(variantsResult.error.message);
  }

  const disputes = await Promise.all(
    ((disputesResult.data ?? []) as unknown as RawDisputeRow[]).map(
      async (raw) => {
        const mapped = mapDisputeRow(raw);
        return upgradeLegacyDisputeEvidenceIfNeeded(mapped, raw.evidence);
      },
    ),
  );

  return {
    ...upgradedRow,
    openDisputes: disputes.filter((d) => d.review_status === "under_review"),
    pastDisputes: disputes.filter((d) => d.review_status !== "under_review"),
    variants: ((variantsResult.data ?? []) as Array<{
      name: string;
      status: string;
      redeemed: boolean | null;
      category: string;
      created_at: string;
    }>).map((v) => ({
      name: v.name,
      status: v.status,
      redeemed: v.redeemed === true,
      category: v.category,
      created_at: v.created_at,
    })),
  };
}

export async function getProtectedNameDispute(
  disputeId: string,
): Promise<{ dispute: ProtectedNameDispute; name: ProtectedNameRow } | null> {
  const { data, error } = await db
    .from("zn_protected_names_disputes")
    .select(DISPUTE_SELECT)
    .eq("id", disputeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;

  const raw = data as unknown as RawDisputeRow;
  const dispute = await upgradeLegacyDisputeEvidenceIfNeeded(
    mapDisputeRow(raw),
    raw.evidence,
  );
  const detail = await getProtectedNameDetail(dispute.protected_name);
  if (!detail) return null;

  return { dispute, name: detail };
}

export async function listProtectedNameDisputes(): Promise<ProtectedNameDispute[]> {
  const { data, error } = await db
    .from("zn_protected_names_disputes")
    .select(DISPUTE_SELECT)
    .eq("review_status", "under_review")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawDisputeRow[]).map(mapDisputeRow);
}

export async function listProtectedNameAccessRequests(): Promise<ProtectedNameAccessRequest[]> {
  const { data, error } = await db
    .from("waitlist_protected_name_access_requests")
    .select("*")
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapAccessRequest);
}

export async function getProtectedNameAccessRequest(id: string): Promise<ProtectedNameAccessRequest | null> {
  const { data, error } = await db
    .from("waitlist_protected_name_access_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAccessRequest(data as Record<string, unknown>) : null;
}

export async function listProtectedNameDecisions(
  workflow: ProtectedNameDecision["workflow"], sourceId: string,
): Promise<ProtectedNameDecision[]> {
  const { data, error } = await db
    .from("zn_protected_name_decisions")
    .select("*")
    .eq("workflow", workflow)
    .eq("source_id", sourceId)
    .order("decided_at", { ascending: false });
  if (error) {
    if (error.code === "42P01" || error.message.includes("zn_protected_name_decisions")) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as Record<string, unknown>[]).map(mapDecisionRow);
}
