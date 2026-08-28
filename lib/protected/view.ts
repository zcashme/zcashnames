import "server-only";

import { db } from "@/lib/db";
import {
  PROTECTED_NAME_CATEGORIES,
  normalizeEvidenceUrls,
  type ProtectedNameCategory,
} from "@/lib/protected/shared";
import { expireProtectedNames } from "@/lib/zns/protected-claim";

const PROTECTED_VIEW_SELECT =
  "name, normalized_name, parent_name, category, status, redeemed, ens_priority_claim, zm_priority_claim, protected_at, expires_at, rejected_at, rejected_reason, updated_at, created_at, reason, evidence";

const PROTECTED_VIEW_SELECT_WITHOUT_PRIORITY =
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
  decision: {
    outcome: string;
    reason: string;
    decided_at: string;
  } | null;
};

export type ProtectedViewRow = {
  name: string;
  normalized_name: string;
  parent_name: string | null;
  /** Normalized names of variants when this row is a parent/canonical. Empty for variants. */
  variant_names: string[];
  category: string;
  status: string;
  redeemed: boolean;
  ens_priority_claim: boolean;
  zm_priority_claim: boolean;
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

type ProtectedNameDbRow = Omit<
  ProtectedViewRow,
  | "evidence"
  | "disputes"
  | "expires_at"
  | "variant_names"
  | "ens_priority_claim"
  | "zm_priority_claim"
> & {
  evidence?: unknown;
  expires_at?: string | null;
  ens_priority_claim?: boolean | null;
  zm_priority_claim?: boolean | null;
};

type ProtectedViewFilterFlags = {
  redeemedOnly: boolean;
  underReviewOnly: boolean;
  rejectedOnly: boolean;
  disputedOnly: boolean;
  /** When set, filter to this protected-name category. */
  categoryOnly: string | null;
  ensOnly: boolean;
  zmOnly: boolean;
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

type ProtectedDisputeDecisionDbRow = {
  source_id: string;
  decision: string;
  reason: string;
  decided_at: string;
};

export type ProtectedViewData = {
  rows: ProtectedViewRow[];
  allCount: number;
  redeemedCount: number;
  underReviewCount: number;
  rejectedCount: number;
  disputedCount: number;
  /** Counts keyed by protected-name category (all known categories present). */
  categoryCounts: Record<ProtectedNameCategory, number>;
  ensCount: number;
  zmCount: number;
  heroAllCount: number;
  heroUnderReviewCount: number;
  heroDisputedCount: number;
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
  disputedOnly: boolean;
  categoryOnly: string | null;
  ensOnly: boolean;
  zmOnly: boolean;
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

function isMissingDisputesTableError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  return (
    !!error.message?.includes("zn_protected_names_disputes")
    || !!error.message?.includes("does not exist")
    || error.code === "42P01"
  );
}

function isMissingDecisionsTableError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  return (
    !!error.message?.includes("zn_protected_name_decisions")
    || !!error.message?.includes("does not exist")
    || error.code === "42P01"
  );
}

async function loadDisputeDecisions(
  disputeIds: string[],
): Promise<Map<string, ProtectedViewDispute["decision"]>> {
  const map = new Map<string, ProtectedViewDispute["decision"]>();
  if (disputeIds.length === 0) return map;

  const { data, error } = await db
    .from("zn_protected_name_decisions")
    .select("source_id, decision, reason, decided_at")
    .eq("workflow", "dispute")
    .in("source_id", disputeIds);

  if (error) {
    // Public view remains available before the decision-audit migration is applied.
    if (isMissingDecisionsTableError(error)) return map;
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as ProtectedDisputeDecisionDbRow[]) {
    map.set(row.source_id, {
      outcome: row.decision,
      reason: row.reason,
      decided_at: row.decided_at,
    });
  }

  return map;
}

/**
 * Distinct protected names that have at least one dispute row.
 * Soft-fails to [] when the disputes table is missing.
 */
async function loadDisputedProtectedNames(): Promise<string[]> {
  const { data, error } = await db
    .from("zn_protected_names_disputes")
    .select("protected_name");

  if (error) {
    if (isMissingDisputesTableError(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  const names = new Set<string>();
  for (const row of (data ?? []) as Array<{ protected_name: string | null }>) {
    if (row.protected_name) names.add(row.protected_name);
  }
  return Array.from(names);
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
    if (isMissingDisputesTableError(error)) {
      return map;
    }
    throw new Error(error.message);
  }

  const disputeRows = (data ?? []) as ProtectedDisputeDbRow[];
  const decisions = await loadDisputeDecisions(disputeRows.map((row) => row.id));

  for (const row of disputeRows) {
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
      decision: decisions.get(row.id) ?? null,
    };
    const existing = map.get(row.protected_name) ?? [];
    existing.push(dispute);
    map.set(row.protected_name, existing);
  }

  return map;
}

/**
 * Load normalized variant names keyed by parent `name`.
 * Used so parent detail views can list their variants.
 */
async function loadVariantNamesByParentNames(
  parentNames: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (parentNames.length === 0) return map;

  const { data, error } = await db
    .from("zn_protected_names")
    .select("parent_name, normalized_name")
    .in("parent_name", parentNames)
    .order("normalized_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as Array<{ parent_name: string | null; normalized_name: string }>) {
    if (!row.parent_name) continue;
    const existing = map.get(row.parent_name) ?? [];
    existing.push(row.normalized_name);
    map.set(row.parent_name, existing);
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

/**
 * When a search hits a variant, include its parent (and sibling variants).
 * When a search hits a parent, include its variants.
 * Returns family root names to match via name / parent_name, or null when no search.
 */
async function resolveSearchFamilyRoots(
  searchQuery: string,
  searchMode: ProtectedViewSearchMode,
): Promise<string[] | null> {
  if (!searchQuery) return null;

  let seedQuery = db.from("zn_protected_names").select("name, parent_name");
  seedQuery = applySearch(seedQuery, searchQuery, searchMode);
  const { data, error } = await seedQuery;

  if (error) {
    throw new Error(error.message);
  }

  const roots = new Set<string>();
  for (const row of (data ?? []) as Array<{ name: string; parent_name: string | null }>) {
    if (row.parent_name) {
      roots.add(row.parent_name);
    } else if (row.name) {
      roots.add(row.name);
    }
  }

  return Array.from(roots);
}

/**
 * Restrict results to entire parent/variant families for the given roots.
 * Empty roots means the original search matched nothing → force empty result.
 */
function applyFamilyFilter(query: any, familyRoots: string[] | null) {
  if (familyRoots === null) return query;

  if (familyRoots.length === 0) {
    // No seed matches: keep empty without changing schema assumptions.
    return query.eq("name", "");
  }

  // Names are letters/numbers only in this product, so quoting is unnecessary.
  // Match parents (name in roots) and all variants (parent_name in roots).
  const list = familyRoots.join(",");
  return query.or(`name.in.(${list}),parent_name.in.(${list})`);
}

function applyViewFilters(
  query: any,
  args: ProtectedViewFilterFlags,
  disputedNames: string[] = [],
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

  if (args.disputedOnly) {
    if (disputedNames.length === 0) {
      return query.eq("name", "");
    }
    return query.in("name", disputedNames);
  }

  if (args.categoryOnly) {
    return query.eq("category", args.categoryOnly);
  }

  if (args.ensOnly) {
    return query.eq("ens_priority_claim", true);
  }

  if (args.zmOnly) {
    return query.eq("zm_priority_claim", true);
  }

  return query;
}

const EMPTY_TAB_FILTERS: ProtectedViewFilterFlags = {
  redeemedOnly: false,
  underReviewOnly: false,
  rejectedOnly: false,
  disputedOnly: false,
  categoryOnly: null,
  ensOnly: false,
  zmOnly: false,
};

function emptyCategoryCounts(): Record<ProtectedNameCategory, number> {
  return {
    person: 0,
    organization: 0,
    brand: 0,
    technology: 0,
    community: 0,
    abuse: 0,
    other: 0,
  };
}

function sanitizeCategoryOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!PROTECTED_NAME_CATEGORIES.includes(normalized as ProtectedNameCategory)) {
    return null;
  }
  return normalized;
}

function isMissingColumnError(error: { message?: string } | null | undefined, column: string) {
  return !!error?.message?.includes(column);
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
  disputedOnly?: boolean | string | null;
  categoryOnly?: string | null;
  ensOnly?: boolean | string | null;
  zmOnly?: boolean | string | null;
}): Promise<ProtectedViewData> {
  // Flip past-due unclaimed protection to rejected so this view (and /protected)
  // reflects reality before we read rows. Fail soft: never block the table.
  try {
    await expireProtectedNames();
  } catch {
    // expire helper already degrades when column/RPC missing; ignore other errors.
  }

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
  const disputedOnly =
    redeemedOnly || underReviewOnly || rejectedOnly
      ? false
      : sanitizeBooleanFlag(args?.disputedOnly);
  const categoryOnly =
    redeemedOnly || underReviewOnly || rejectedOnly || disputedOnly
      ? null
      : sanitizeCategoryOnly(args?.categoryOnly);
  const ensOnly =
    redeemedOnly || underReviewOnly || rejectedOnly || disputedOnly || !!categoryOnly
      ? false
      : sanitizeBooleanFlag(args?.ensOnly);
  const zmOnly =
    redeemedOnly
    || underReviewOnly
    || rejectedOnly
    || disputedOnly
    || !!categoryOnly
    || ensOnly
      ? false
      : sanitizeBooleanFlag(args?.zmOnly);
  const filterFlags: ProtectedViewFilterFlags = {
    redeemedOnly,
    underReviewOnly,
    rejectedOnly,
    disputedOnly,
    categoryOnly,
    ensOnly,
    zmOnly,
  };
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Expand search hits to full parent↔variant families; resolve disputed names for the tab.
  const [familyRoots, disputedNames] = await Promise.all([
    resolveSearchFamilyRoots(searchQuery, searchMode),
    loadDisputedProtectedNames(),
  ]);

  let query = db.from("zn_protected_names").select(PROTECTED_VIEW_SELECT, { count: "exact" });
  query = applyFamilyFilter(query, familyRoots);
  query = applyViewFilters(query, filterFlags, disputedNames);
  query = applyPrimaryOrder(query, sortKey, sortDirection).order("name", { ascending: true });

  const allCountQuery = applyFamilyFilter(
    db.from("zn_protected_names").select("name", { count: "exact", head: true }),
    familyRoots,
  );
  const redeemedCountQuery = applyViewFilters(
    applyFamilyFilter(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      familyRoots,
    ),
    { ...EMPTY_TAB_FILTERS, redeemedOnly: true },
    disputedNames,
  );
  const underReviewCountQuery = applyViewFilters(
    applyFamilyFilter(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      familyRoots,
    ),
    { ...EMPTY_TAB_FILTERS, underReviewOnly: true },
    disputedNames,
  );
  const rejectedCountQuery = applyViewFilters(
    applyFamilyFilter(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      familyRoots,
    ),
    { ...EMPTY_TAB_FILTERS, rejectedOnly: true },
    disputedNames,
  );
  const disputedCountQuery = applyViewFilters(
    applyFamilyFilter(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      familyRoots,
    ),
    { ...EMPTY_TAB_FILTERS, disputedOnly: true },
    disputedNames,
  );
  const ensCountQuery = applyViewFilters(
    applyFamilyFilter(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      familyRoots,
    ),
    { ...EMPTY_TAB_FILTERS, ensOnly: true },
    disputedNames,
  );
  const zmCountQuery = applyViewFilters(
    applyFamilyFilter(
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      familyRoots,
    ),
    { ...EMPTY_TAB_FILTERS, zmOnly: true },
    disputedNames,
  );
  const categoryCountQueries = PROTECTED_NAME_CATEGORIES.map((category) =>
    applyViewFilters(
      applyFamilyFilter(
        db.from("zn_protected_names").select("name", { count: "exact", head: true }),
        familyRoots,
      ),
      { ...EMPTY_TAB_FILTERS, categoryOnly: category },
      disputedNames,
    ),
  );
  const heroAllCountQuery = db
    .from("zn_protected_names")
    .select("name", { count: "exact", head: true });
  const heroUnderReviewCountQuery = db
    .from("zn_protected_names")
    .select("name", { count: "exact", head: true })
    .eq("status", "under_review");

  const [
    primaryResult,
    { count: allCount, error: allCountError },
    { count: redeemedCount, error: redeemedCountError },
    { count: underReviewCount, error: underReviewCountError },
    { count: rejectedCount, error: rejectedCountError },
    { count: disputedCount, error: disputedCountError },
    ensCountResult,
    zmCountResult,
    categoryCountResults,
    { count: heroAllCount, error: heroAllCountError },
    { count: heroUnderReviewCount, error: heroUnderReviewCountError },
  ] = await Promise.all([
    query.range(from, to),
    allCountQuery,
    redeemedCountQuery,
    underReviewCountQuery,
    rejectedCountQuery,
    disputedCountQuery,
    ensCountQuery,
    zmCountQuery,
    Promise.all(categoryCountQueries),
    heroAllCountQuery,
    heroUnderReviewCountQuery,
  ]);

  let pageData = primaryResult.data as ProtectedNameDbRow[] | null;
  let pageError = primaryResult.error;
  let pageCount = primaryResult.count;
  let priorityColumnsAvailable = true;

  // Graceful fallback when newer columns are not migrated yet.
  const missingPriorityColumns =
    isMissingColumnError(pageError, "ens_priority_claim")
    || isMissingColumnError(pageError, "zm_priority_claim");
  const needsFallback =
    missingPriorityColumns
    || isMissingColumnError(pageError, "expires_at")
    || isMissingColumnError(pageError, "evidence");

  if (needsFallback) {
    if (missingPriorityColumns) {
      priorityColumnsAvailable = false;
    }

    let selectColumns = PROTECTED_VIEW_SELECT;
    if (isMissingColumnError(pageError, "evidence")) {
      selectColumns = PROTECTED_VIEW_SELECT_MINIMAL;
      priorityColumnsAvailable = false;
    } else if (isMissingColumnError(pageError, "expires_at")) {
      selectColumns = PROTECTED_VIEW_SELECT_WITHOUT_EXPIRES;
      priorityColumnsAvailable = false;
    } else if (missingPriorityColumns) {
      selectColumns = PROTECTED_VIEW_SELECT_WITHOUT_PRIORITY;
    }

    // expires_at sort requires the column; fall back to protected_at.
    const fallbackSortKey =
      sortKey === "expires_at" && isMissingColumnError(pageError, "expires_at")
        ? "protected_at"
        : sortKey;

    // If priority columns are missing, drop ENS/ZM-only filters so the table still loads.
    const fallbackFilters: ProtectedViewFilterFlags = priorityColumnsAvailable
      ? filterFlags
      : {
          ...filterFlags,
          ensOnly: false,
          zmOnly: false,
        };

    let fallbackQuery = db
      .from("zn_protected_names")
      .select(selectColumns, { count: "exact" });
    fallbackQuery = applyFamilyFilter(fallbackQuery, familyRoots);
    fallbackQuery = applyViewFilters(fallbackQuery, fallbackFilters, disputedNames);
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
  if (disputedCountError) throw new Error(disputedCountError.message);
  if (heroAllCountError) throw new Error(heroAllCountError.message);
  if (heroUnderReviewCountError) throw new Error(heroUnderReviewCountError.message);

  // Soft-fail ENS/ZM counts when columns are not migrated yet.
  let ensCount = ensCountResult.count ?? 0;
  let zmCount = zmCountResult.count ?? 0;
  if (
    isMissingColumnError(ensCountResult.error, "ens_priority_claim")
    || isMissingColumnError(ensCountResult.error, "zm_priority_claim")
  ) {
    ensCount = 0;
    priorityColumnsAvailable = false;
  } else if (ensCountResult.error) {
    throw new Error(ensCountResult.error.message);
  }
  if (
    isMissingColumnError(zmCountResult.error, "ens_priority_claim")
    || isMissingColumnError(zmCountResult.error, "zm_priority_claim")
  ) {
    zmCount = 0;
    priorityColumnsAvailable = false;
  } else if (zmCountResult.error) {
    throw new Error(zmCountResult.error.message);
  }

  const categoryCounts = emptyCategoryCounts();
  for (let index = 0; index < PROTECTED_NAME_CATEGORIES.length; index += 1) {
    const category = PROTECTED_NAME_CATEGORIES[index];
    const result = categoryCountResults[index] as {
      count: number | null;
      error: { message?: string } | null;
    };
    if (result.error) {
      throw new Error(result.error.message);
    }
    categoryCounts[category] = result.count ?? 0;
  }

  const rawRows = pageData ?? [];
  const parentNamesOnPage = rawRows
    .filter((row) => !row.parent_name)
    .map((row) => row.name);
  const [disputeMap, variantMap] = await Promise.all([
    loadDisputesByProtectedNames(rawRows.map((row) => row.name)),
    loadVariantNamesByParentNames(parentNamesOnPage),
  ]);
  const rows: ProtectedViewRow[] = rawRows.map((row) => ({
    ...row,
    expires_at: row.expires_at ?? null,
    ens_priority_claim: priorityColumnsAvailable ? !!row.ens_priority_claim : false,
    zm_priority_claim: priorityColumnsAvailable ? !!row.zm_priority_claim : false,
    evidence: normalizeEvidenceUrls(row.evidence),
    variant_names: row.parent_name ? [] : (variantMap.get(row.name) ?? []),
    disputes: disputeMap.get(row.name) ?? [],
  }));

  return {
    rows,
    allCount: allCount ?? 0,
    redeemedCount: redeemedCount ?? 0,
    underReviewCount: underReviewCount ?? 0,
    rejectedCount: rejectedCount ?? 0,
    disputedCount: disputedCount ?? 0,
    categoryCounts,
    ensCount,
    zmCount,
    heroAllCount: heroAllCount ?? 0,
    heroUnderReviewCount: heroUnderReviewCount ?? 0,
    // Global count of distinct names with at least one dispute (unscoped by search).
    heroDisputedCount: disputedNames.length,
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
    disputedOnly,
    categoryOnly,
    ensOnly: priorityColumnsAvailable ? ensOnly : false,
    zmOnly: priorityColumnsAvailable ? zmOnly : false,
  };
}
