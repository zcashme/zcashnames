import "server-only";

import { db } from "@/lib/db";

const PROTECTED_VIEW_SELECT =
  "name, normalized_name, parent_name, category, status, redeemed, protected_at, expires_at, rejected_at, rejected_reason, updated_at, created_at, reason, evidence";

const PROTECTED_VIEW_SELECT_WITHOUT_EXPIRES =
  "name, normalized_name, parent_name, category, status, redeemed, protected_at, rejected_at, rejected_reason, updated_at, created_at, reason, evidence";

const PROTECTED_VIEW_SELECT_MINIMAL =
  "name, normalized_name, parent_name, category, status, redeemed, protected_at, rejected_at, rejected_reason, updated_at, created_at, reason";

export const PROTECTED_VIEW_PAGE_SIZE = 25;

export type ProtectedViewSortDirection = "asc" | "desc";
export type ProtectedViewSearchMode = "contains" | "exact";

export type ProtectedViewSortKey =
  | "normalized_name"
  | "parent_name"
  | "category"
  | "status"
  | "redeemed"
  | "protected_at"
  | "expires_at"
  | "updated_at"
  | "created_at";

/** Dispute review_status values stored in zn_protected_names_disputes. */
export type ProtectedViewDisputeReviewStatus =
  | "under_review"
  | "accepted"
  | "dismissed"
  | string;

export type ProtectedViewDispute = {
  id: string;
  protected_name: string;
  normalized_name: string;
  review_status: ProtectedViewDisputeReviewStatus;
  reason: string;
  category: string;
  parent_name: string | null;
  evidence: string[];
  name_status_at_submission: string;
  created_at: string;
};

export type ProtectedViewRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  category: string;
  status: string;
  redeemed: boolean;
  protected_at: string | null;
  expires_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  updated_at: string | null;
  created_at: string;
  reason: string;
  evidence: string[];
  disputes: ProtectedViewDispute[];
};

type ProtectedNameDbRow = Omit<ProtectedViewRow, "evidence" | "disputes" | "expires_at"> & {
  evidence?: unknown;
  expires_at?: string | null;
};

type ProtectedDisputeDbRow = {
  id: string;
  protected_name: string;
  normalized_name: string;
  review_status: string;
  reason: string;
  category: string;
  parent_name: string | null;
  evidence: unknown;
  name_status_at_submission: string;
  created_at: string;
};

export type ProtectedViewData = {
  rows: ProtectedViewRow[];
  allCount: number;
  redeemedCount: number;
  underReviewCount: number;
  rejectedCount: number;
  heroAllCount: number;
  heroUnderReviewCount: number;
  heroRejectedCount: number;
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  sortKey: ProtectedViewSortKey;
  sortDirection: ProtectedViewSortDirection;
  searchQuery: string;
  searchMode: ProtectedViewSearchMode;
  redeemedOnly: boolean;
  underReviewOnly: boolean;
  rejectedOnly: boolean;
};

function sanitizeSortKey(value: string | null | undefined): ProtectedViewSortKey {
  switch (value) {
    case "parent_name":
    case "category":
    case "status":
    case "redeemed":
    case "protected_at":
    case "expires_at":
    case "updated_at":
    case "created_at":
      return value;
    default:
      return "normalized_name";
  }
}

function sanitizeSortDirection(value: string | null | undefined): ProtectedViewSortDirection {
  return value === "desc" ? "desc" : "asc";
}

function sanitizeSearchMode(value: string | null | undefined): ProtectedViewSearchMode {
  return value === "exact" ? "exact" : "contains";
}

function sanitizePage(value: number | string | null | undefined): number {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(numericValue) || numericValue < 1) return 1;
  return Math.floor(numericValue);
}

function sanitizePageSize(value: number | string | null | undefined): number {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(numericValue)) return PROTECTED_VIEW_PAGE_SIZE;
  return Math.max(1, Math.min(200, Math.floor(numericValue)));
}

function sanitizeBooleanFlag(value: boolean | string | null | undefined): boolean {
  return value === true || value === "true";
}

function normalizeEvidenceUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

async function loadDisputesByProtectedNames(
  names: string[],
): Promise<Map<string, ProtectedViewDispute[]>> {
  const map = new Map<string, ProtectedViewDispute[]>();
  if (names.length === 0) return map;

  const { data, error } = await db
    .from("zn_protected_names_disputes")
    .select(
      "id, protected_name, normalized_name, review_status, reason, category, parent_name, evidence, name_status_at_submission, created_at",
    )
    .in("protected_name", names)
    .order("created_at", { ascending: false });

  if (error) {
    // Disputes table may not exist yet in some environments; fail soft.
    if (
      error.message.includes("zn_protected_names_disputes")
      || error.message.includes("does not exist")
      || error.code === "42P01"
    ) {
      return map;
    }
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ProtectedDisputeDbRow[]) {
    const dispute: ProtectedViewDispute = {
      id: row.id,
      protected_name: row.protected_name,
      normalized_name: row.normalized_name,
      review_status: row.review_status,
      reason: row.reason,
      category: row.category,
      parent_name: row.parent_name,
      evidence: normalizeEvidenceUrls(row.evidence),
      name_status_at_submission: row.name_status_at_submission,
      created_at: row.created_at,
    };
    const existing = map.get(row.protected_name) ?? [];
    existing.push(dispute);
    map.set(row.protected_name, existing);
  }

  return map;
}

function applySearch(query: any, searchQuery: string, searchMode: ProtectedViewSearchMode) {
  if (!searchQuery) return query;

  if (searchMode === "exact") {
    return query.eq("normalized_name", searchQuery);
  }

  return query.like("normalized_name", `%${searchQuery}%`);
}

function applyViewFilters(
  query: any,
  args: { redeemedOnly: boolean; underReviewOnly: boolean; rejectedOnly: boolean },
) {
  if (args.redeemedOnly) {
    return query.eq("redeemed", true);
  }

  if (args.underReviewOnly) {
    return query.eq("status", "under_review");
  }

  if (args.rejectedOnly) {
    return query.eq("status", "rejected");
  }

  return query;
}

function applyPrimaryOrder(
  query: any,
  sortKey: ProtectedViewSortKey,
  sortDirection: ProtectedViewSortDirection,
) {
  if (sortKey === "redeemed") {
    return query.order(sortKey, { ascending: sortDirection === "asc" });
  }

  return query.order(sortKey, {
    ascending: sortDirection === "asc",
    nullsFirst: false,
  });
}

export async function getProtectedViewData(args?: {
  page?: number | string | null;
  pageSize?: number | string | null;
  sortKey?: string | null;
  sortDirection?: string | null;
  searchQuery?: string | null;
  searchMode?: string | null;
  redeemedOnly?: boolean | string | null;
  underReviewOnly?: boolean | string | null;
  rejectedOnly?: boolean | string | null;
}): Promise<ProtectedViewData> {
  const page = sanitizePage(args?.page ?? 1);
  const pageSize = sanitizePageSize(args?.pageSize ?? PROTECTED_VIEW_PAGE_SIZE);
  const sortKey = sanitizeSortKey(args?.sortKey);
  const sortDirection = sanitizeSortDirection(args?.sortDirection);
  const searchQuery = args?.searchQuery?.trim().toLowerCase() ?? "";
  const searchMode = sanitizeSearchMode(args?.searchMode);
  const redeemedOnly = sanitizeBooleanFlag(args?.redeemedOnly);
  const underReviewOnly = redeemedOnly ? false : sanitizeBooleanFlag(args?.underReviewOnly);
  const rejectedOnly =
    redeemedOnly || underReviewOnly ? false : sanitizeBooleanFlag(args?.rejectedOnly);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db.from("zn_protected_names").select(PROTECTED_VIEW_SELECT, { count: "exact" });
  query = applySearch(query, searchQuery, searchMode);
  query = applyViewFilters(query, { redeemedOnly, underReviewOnly, rejectedOnly });
  query = applyPrimaryOrder(query, sortKey, sortDirection).order("name", { ascending: true });

  const allCountQuery = applySearch(
    db.from("zn_protected_names").select("name", { count: "exact", head: true }),
    searchQuery,
    searchMode,
  );
  const redeemedCountQuery = applyViewFilters(
    applySearch(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      searchQuery,
      searchMode,
    ),
    { redeemedOnly: true, underReviewOnly: false, rejectedOnly: false },
  );
  const underReviewCountQuery = applyViewFilters(
    applySearch(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      searchQuery,
      searchMode,
    ),
    { redeemedOnly: false, underReviewOnly: true, rejectedOnly: false },
  );
  const rejectedCountQuery = applyViewFilters(
    applySearch(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      searchQuery,
      searchMode,
    ),
    { redeemedOnly: false, underReviewOnly: false, rejectedOnly: true },
  );
  const heroAllCountQuery = db
    .from("zn_protected_names")
    .select("name", { count: "exact", head: true });
  const heroUnderReviewCountQuery = db
    .from("zn_protected_names")
    .select("name", { count: "exact", head: true })
    .eq("status", "under_review");
  const heroRejectedCountQuery = db
    .from("zn_protected_names")
    .select("name", { count: "exact", head: true })
    .eq("status", "rejected");

  const [
    primaryResult,
    { count: allCount, error: allCountError },
    { count: redeemedCount, error: redeemedCountError },
    { count: underReviewCount, error: underReviewCountError },
    { count: rejectedCount, error: rejectedCountError },
    { count: heroAllCount, error: heroAllCountError },
    { count: heroUnderReviewCount, error: heroUnderReviewCountError },
    { count: heroRejectedCount, error: heroRejectedCountError },
  ] = await Promise.all([
    query.range(from, to),
    allCountQuery,
    redeemedCountQuery,
    underReviewCountQuery,
    rejectedCountQuery,
    heroAllCountQuery,
    heroUnderReviewCountQuery,
    heroRejectedCountQuery,
  ]);

  let pageData = primaryResult.data as ProtectedNameDbRow[] | null;
  let pageError = primaryResult.error;
  let pageCount = primaryResult.count;

  // Graceful fallback when newer columns are not migrated yet.
  const needsFallback =
    pageError?.message?.includes("expires_at")
    || pageError?.message?.includes("evidence");
  if (needsFallback) {
    const selectColumns = pageError?.message?.includes("evidence")
      ? PROTECTED_VIEW_SELECT_MINIMAL
      : PROTECTED_VIEW_SELECT_WITHOUT_EXPIRES;
    // expires_at sort requires the column; fall back to protected_at.
    const fallbackSortKey =
      sortKey === "expires_at" && pageError?.message?.includes("expires_at")
        ? "protected_at"
        : sortKey;

    let fallbackQuery = db
      .from("zn_protected_names")
      .select(selectColumns, { count: "exact" });
    fallbackQuery = applySearch(fallbackQuery, searchQuery, searchMode);
    fallbackQuery = applyViewFilters(fallbackQuery, {
      redeemedOnly,
      underReviewOnly,
      rejectedOnly,
    });
    fallbackQuery = applyPrimaryOrder(fallbackQuery, fallbackSortKey, sortDirection).order(
      "name",
      { ascending: true },
    );
    const fallback = await fallbackQuery.range(from, to);
    pageData = (fallback.data ?? null) as ProtectedNameDbRow[] | null;
    pageError = fallback.error;
    pageCount = fallback.count;
  }

  if (pageError) {
    throw new Error(pageError.message);
  }
  if (allCountError) throw new Error(allCountError.message);
  if (redeemedCountError) throw new Error(redeemedCountError.message);
  if (underReviewCountError) throw new Error(underReviewCountError.message);
  if (rejectedCountError) throw new Error(rejectedCountError.message);
  if (heroAllCountError) throw new Error(heroAllCountError.message);
  if (heroUnderReviewCountError) throw new Error(heroUnderReviewCountError.message);
  if (heroRejectedCountError) throw new Error(heroRejectedCountError.message);

  const rawRows = pageData ?? [];
  const disputeMap = await loadDisputesByProtectedNames(rawRows.map((row) => row.name));
  const rows: ProtectedViewRow[] = rawRows.map((row) => ({
    ...row,
    expires_at: row.expires_at ?? null,
    evidence: normalizeEvidenceUrls(row.evidence),
    disputes: disputeMap.get(row.name) ?? [],
  }));

  return {
    rows,
    allCount: allCount ?? 0,
    redeemedCount: redeemedCount ?? 0,
    underReviewCount: underReviewCount ?? 0,
    rejectedCount: rejectedCount ?? 0,
    heroAllCount: heroAllCount ?? 0,
    heroUnderReviewCount: heroUnderReviewCount ?? 0,
    heroRejectedCount: heroRejectedCount ?? 0,
    totalCount: pageCount ?? 0,
    page,
    pageSize,
    hasMore: from + rows.length < (pageCount ?? 0),
    sortKey,
    sortDirection,
    searchQuery,
    searchMode,
    redeemedOnly,
    underReviewOnly,
    rejectedOnly,
  };
}
