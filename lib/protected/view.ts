import "server-only";

import { db } from "@/lib/db";

const PROTECTED_VIEW_SELECT =
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
  | "updated_at"
  | "created_at";

export type ProtectedViewRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  category: string;
  status: string;
  redeemed: boolean;
  protected_at: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  updated_at: string | null;
  created_at: string;
  reason: string;
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
    { data, error, count },
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

  if (error) {
    throw new Error(error.message);
  }
  if (allCountError) throw new Error(allCountError.message);
  if (redeemedCountError) throw new Error(redeemedCountError.message);
  if (underReviewCountError) throw new Error(underReviewCountError.message);
  if (rejectedCountError) throw new Error(rejectedCountError.message);
  if (heroAllCountError) throw new Error(heroAllCountError.message);
  if (heroUnderReviewCountError) throw new Error(heroUnderReviewCountError.message);
  if (heroRejectedCountError) throw new Error(heroRejectedCountError.message);

  const rows = (data ?? []) as ProtectedViewRow[];

  return {
    rows,
    allCount: allCount ?? 0,
    redeemedCount: redeemedCount ?? 0,
    underReviewCount: underReviewCount ?? 0,
    rejectedCount: rejectedCount ?? 0,
    heroAllCount: heroAllCount ?? 0,
    heroUnderReviewCount: heroUnderReviewCount ?? 0,
    heroRejectedCount: heroRejectedCount ?? 0,
    totalCount: count ?? 0,
    page,
    pageSize,
    hasMore: from + rows.length < (count ?? 0),
    sortKey,
    sortDirection,
    searchQuery,
    searchMode,
    redeemedOnly,
    underReviewOnly,
    rejectedOnly,
  };
}
