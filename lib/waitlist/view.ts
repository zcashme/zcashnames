import "server-only";

import { NETWORKS } from "zcashname-sdk";
import { db } from "@/lib/db";
import { fetchAllSupabaseRows } from "@/lib/supabase/fetch-all";
import { syncWaitlistReservationFieldsFromReserves } from "@/lib/waitlist/reserves";

export const WAITLIST_VIEW_EARLY_ACCESS_START_AT = "2026-08-15T16:00:00.000Z";
export const WAITLIST_VIEW_EARLY_ACCESS_LABEL = "August 15, 2026 at 12:00 PM Eastern";
export const WAITLIST_VIEW_ADMIN_WALLET_UIVK = NETWORKS.mainnet.uivk;
export const WAITLIST_VIEW_REFERRALS_PER_SPOT = 3;
export const WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT = 9;
export const WAITLIST_VIEW_PAGE_SIZE = 10;
const WAITLIST_VIEW_SOURCE_BATCH_SIZE = 1000;
const WAITLIST_VIEW_SNAPSHOT_WRITE_BATCH_SIZE = 500;
let publicWaitlistSnapshotRefreshPromise: Promise<void> | null = null;

type WaitlistViewDbRow = {
  id: string;
  name: string | null;
  created_at: string;
  email_verified: boolean | null;
  referral_code: string | null;
  referred_by: string | null;
  name_reserved: boolean | null;
  name_reserved_at: string | null;
  name_reserved_txid: string | null;
  campaign_email_confirm_response: boolean | null;
};

type ReservedNameRow = {
  name: string | null;
};

type PublicWaitlistViewSnapshotRow = {
  source_waitlist_id: string;
  name: string;
  normalized_name: string;
  source_created_at: string;
  base_position: number;
  adjusted_position: number;
  interest_count: number;
  is_protected: boolean;
  is_reserved: boolean;
  direct_referrals: number;
  reserved_referrals: number;
  indirect_referrals: number;
  display_referral_code: string | null;
  canonical_referral_code: string | null;
  updated_at: string;
};

export type WaitlistViewSortDirection = "asc" | "desc";
export type WaitlistViewSearchMode = "contains" | "exact";

export type WaitlistViewSortKey =
  | "line"
  | "name"
  | "interest"
  | "protected"
  | "reserved"
  | "directReferrals"
  | "reservedReferrals"
  | "indirectReferrals";

export interface PublicWaitlistViewRow {
  id: string;
  name: string;
  createdAt: string;
  basePosition: number;
  adjustedLineNumber: number;
  reservedPosition: number | null;
  interestCount: number;
  rankPosition: number;
  rankTotal: number;
  protected: boolean;
  reserved: boolean;
  directReferrals: number;
  reservedReferrals: number;
  indirectReferrals: number;
  displayReferralCode: string | null;
  leaderHref: string | null;
  adjustedPosition: number;
}

export interface PublicWaitlistViewData {
  rows: PublicWaitlistViewRow[];
  allCount: number;
  totalCount: number;
  reservedOnlyCount: number;
  protectedOnlyCount: number;
  heroAllCount: number;
  heroReservedCount: number;
  heroProtectedCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  sortKey: WaitlistViewSortKey;
  sortDirection: WaitlistViewSortDirection;
  searchQuery: string;
  searchMode: WaitlistViewSearchMode;
  earlyAccessStartAt: string;
  earlyAccessLabel: string;
  adminWalletUivk: string;
  referralsPerSpot: number;
}

type RankPeerSnapshotRow = Pick<
  PublicWaitlistViewSnapshotRow,
  "source_waitlist_id" | "normalized_name" | "base_position" | "direct_referrals" | "indirect_referrals"
>;

function displayName(name: string | null, id: string): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : `unnamed-${id.slice(0, 8)}`;
}

function normalizeName(name: string | null): string | null {
  const trimmed = name?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function compareByCreatedAtThenId(
  a: Pick<WaitlistViewDbRow, "created_at" | "id">,
  b: Pick<WaitlistViewDbRow, "created_at" | "id">,
): number {
  const aTime = new Date(a.created_at).getTime();
  const bTime = new Date(b.created_at).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

function sanitizeSortKey(value: string | null | undefined): WaitlistViewSortKey {
  switch (value) {
    case "name":
    case "interest":
    case "protected":
    case "reserved":
    case "directReferrals":
    case "reservedReferrals":
    case "indirectReferrals":
      return value;
    default:
      return "line";
  }
}

function sanitizeSortDirection(value: string | null | undefined): WaitlistViewSortDirection {
  return value === "desc" ? "desc" : "asc";
}

function sanitizeSearchMode(value: string | null | undefined): WaitlistViewSearchMode {
  return value === "exact" ? "exact" : "contains";
}

function sanitizePage(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

function sanitizePageSize(value: number | null | undefined): number {
  if (!value || !Number.isFinite(value)) return WAITLIST_VIEW_PAGE_SIZE;
  return Math.max(1, Math.min(200, Math.floor(value)));
}

async function fetchAllWaitlistRows(): Promise<WaitlistViewDbRow[]> {
  const rows = await fetchAllSupabaseRows<WaitlistViewDbRow>({
    pageSize: WAITLIST_VIEW_SOURCE_BATCH_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist")
        .select(
          "id, name, created_at, email_verified, referral_code, referred_by, name_reserved, name_reserved_at, name_reserved_txid, campaign_email_confirm_response",
        )
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  });

  return rows.sort(compareByCreatedAtThenId);
}

async function fetchAllReservedNames(): Promise<ReservedNameRow[]> {
  return fetchAllSupabaseRows<ReservedNameRow>({
    pageSize: WAITLIST_VIEW_SOURCE_BATCH_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_reserved_names")
        .select("name")
        .order("name", { ascending: true })
        .range(from, to),
  });
}

async function fetchAllSnapshotIds(): Promise<string[]> {
  const rows = await fetchAllSupabaseRows<{ source_waitlist_id: string }>({
    pageSize: WAITLIST_VIEW_SOURCE_BATCH_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("public_waitlist_view_snapshots")
        .select("source_waitlist_id")
        .order("base_position", { ascending: true })
        .order("source_waitlist_id", { ascending: true })
        .range(from, to),
  });

  return rows.map((row) => row.source_waitlist_id);
}

async function fetchRankPeerRows(normalizedNames: string[]): Promise<RankPeerSnapshotRow[]> {
  const uniqueNames = [...new Set(normalizedNames.filter(Boolean))];
  if (uniqueNames.length === 0) return [];

  return fetchAllSupabaseRows<RankPeerSnapshotRow>({
    pageSize: WAITLIST_VIEW_SOURCE_BATCH_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("public_waitlist_view_snapshots")
        .select("source_waitlist_id, normalized_name, base_position, direct_referrals, indirect_referrals")
        .in("normalized_name", uniqueNames)
        .order("normalized_name", { ascending: true })
        .order("base_position", { ascending: true })
        .order("source_waitlist_id", { ascending: true })
        .range(from, to),
  });
}

function buildSnapshotRows(args: {
  waitlistRows: WaitlistViewDbRow[];
  reservedNames: ReservedNameRow[];
}): PublicWaitlistViewSnapshotRow[] {
  const allRows = args.waitlistRows;
  const verifiedRows = allRows.filter((row) => row.email_verified === true);
  const reservedVerifiedRows = verifiedRows.filter(
    (row) => row.name_reserved === true,
  );
  const reservedVerifiedIds = new Set(reservedVerifiedRows.map((row) => row.id));
  const nameCounts = new Map<string, number>();
  const reservedNames = new Set(
    args.reservedNames
      .map((row) => normalizeName(row.name))
      .filter((value): value is string => Boolean(value)),
  );
  const reservedChildrenByParent = new Map<string, WaitlistViewDbRow[]>();
  const reservedReferralSummaryByCode = new Map<
    string,
    { direct: number; reserved: number; indirect: number }
  >();

  for (const row of allRows) {
    const normalizedName = normalizeName(row.name);
    if (normalizedName) {
      nameCounts.set(normalizedName, (nameCounts.get(normalizedName) ?? 0) + 1);
    }
  }

  for (const row of reservedVerifiedRows) {
    const referredBy = row.referred_by?.trim();
    if (!referredBy) continue;
    const children = reservedChildrenByParent.get(referredBy) ?? [];
    children.push(row);
    reservedChildrenByParent.set(referredBy, children);
  }

  function summarizeReservedReferrals(referralCode: string): {
    direct: number;
    reserved: number;
    indirect: number;
  } {
    const cached = reservedReferralSummaryByCode.get(referralCode);
    if (cached) return cached;

    const directChildren = reservedChildrenByParent.get(referralCode) ?? [];
    const direct = directChildren.length;
    let reserved = 0;
    const visitedIds = new Set<string>();
    const queue: Array<{ row: WaitlistViewDbRow; path: Set<string> }> = directChildren.map((row) => ({
      row,
      path: new Set([referralCode]),
    }));

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      if (visitedIds.has(next.row.id)) continue;
      visitedIds.add(next.row.id);
      reserved += 1;

      const nextCode = next.row.referral_code?.trim();
      if (!nextCode || next.path.has(nextCode)) continue;

      const childPath = new Set(next.path);
      childPath.add(nextCode);

      for (const child of reservedChildrenByParent.get(nextCode) ?? []) {
        queue.push({ row: child, path: childPath });
      }
    }

    const summary = {
      direct,
      reserved,
      indirect: Math.max(0, reserved - direct),
    };
    reservedReferralSummaryByCode.set(referralCode, summary);
    return summary;
  }

  const enriched = verifiedRows.map((row, index) => {
    const referralCode = row.referral_code?.trim() ?? "";
    const normalizedName = normalizeName(row.name) ?? row.id.toLowerCase();
    const referralSummary = referralCode
      ? summarizeReservedReferrals(referralCode)
      : { direct: 0, reserved: 0, indirect: 0 };
    const directReferrals = referralSummary.direct;
    const reservedReferrals = referralSummary.reserved;
    const indirectReferrals = referralSummary.indirect;
    const interestCount = nameCounts.get(normalizedName) ?? 0;
    const basePosition = index + 1;

    return {
      source_waitlist_id: row.id,
      name: displayName(row.name, row.id),
      normalized_name: normalizedName,
      source_created_at: row.created_at,
      base_position: basePosition,
      interest_count: interestCount,
      is_protected: reservedNames.has(normalizedName),
      direct_referrals: directReferrals,
      reserved_referrals: reservedReferrals,
      indirect_referrals: indirectReferrals,
      display_referral_code: referralCode || null,
      canonical_referral_code: referralCode || null,
      is_reserved: reservedVerifiedIds.has(row.id),
    };
  });

  const reservedEnriched = enriched
    .filter((row) => row.is_reserved)
    .sort((a, b) => {
      if (a.base_position !== b.base_position) return a.base_position - b.base_position;
      return a.source_waitlist_id.localeCompare(b.source_waitlist_id);
    })
    .map((row, index) => ({
      ...row,
      reservedBasePosition: index + 1,
      reservedAdjustment:
        Math.floor(row.direct_referrals / WAITLIST_VIEW_REFERRALS_PER_SPOT)
        + Math.floor(row.indirect_referrals / WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT),
    }));

  const adjustedOrder = [...reservedEnriched].sort((a, b) => {
    const aAdjustedScore = Math.max(1, a.reservedBasePosition - a.reservedAdjustment);
    const bAdjustedScore = Math.max(1, b.reservedBasePosition - b.reservedAdjustment);
    if (aAdjustedScore !== bAdjustedScore) return aAdjustedScore - bAdjustedScore;
    if (a.reservedBasePosition !== b.reservedBasePosition) {
      return a.reservedBasePosition - b.reservedBasePosition;
    }
    if (a.base_position !== b.base_position) return a.base_position - b.base_position;
    return a.source_waitlist_id.localeCompare(b.source_waitlist_id);
  });
  const adjustedPositionById = new Map(
    adjustedOrder.map((row, index) => [row.source_waitlist_id, index + 1] as const),
  );
  const nowIso = new Date().toISOString();

  return enriched.map((row) => ({
    source_waitlist_id: row.source_waitlist_id,
    name: row.name,
    normalized_name: row.normalized_name,
    source_created_at: row.source_created_at,
    base_position: row.base_position,
    adjusted_position: adjustedPositionById.get(row.source_waitlist_id) ?? 0,
    interest_count: row.interest_count,
    is_protected: row.is_protected,
    is_reserved: row.is_reserved,
    direct_referrals: row.direct_referrals,
    reserved_referrals: row.reserved_referrals,
    indirect_referrals: row.indirect_referrals,
    display_referral_code: row.display_referral_code,
    canonical_referral_code: row.canonical_referral_code,
    updated_at: nowIso,
  }));
}

export async function rebuildPublicWaitlistViewSnapshot(): Promise<{ rowCount: number }> {
  const [, waitlistRows, reservedNames, existingSnapshotIds] = await Promise.all([
    syncWaitlistReservationFieldsFromReserves(),
    fetchAllWaitlistRows(),
    fetchAllReservedNames(),
    fetchAllSnapshotIds(),
  ]);
  const snapshotRows = buildSnapshotRows({ waitlistRows, reservedNames });
  const currentIds = new Set(snapshotRows.map((row) => row.source_waitlist_id));

  for (let start = 0; start < snapshotRows.length; start += WAITLIST_VIEW_SNAPSHOT_WRITE_BATCH_SIZE) {
    const batch = snapshotRows.slice(start, start + WAITLIST_VIEW_SNAPSHOT_WRITE_BATCH_SIZE);
    if (batch.length === 0) continue;

    const { error } = await db
      .from("public_waitlist_view_snapshots")
      .upsert(batch, { onConflict: "source_waitlist_id" });
    if (error) {
      if (
        error.message.includes("indirect_referrals")
        || error.message.includes("is_reserved")
      ) {
        throw new Error(
          "The public_waitlist_view_snapshots table is missing newer columns. Apply the 2026-07-12 indirect-referrals and is-reserved snapshot migrations, then rebuild the snapshot.",
        );
      }
      throw new Error(error.message);
    }
  }

  const staleIds = existingSnapshotIds.filter((id) => !currentIds.has(id));
  for (let start = 0; start < staleIds.length; start += WAITLIST_VIEW_SNAPSHOT_WRITE_BATCH_SIZE) {
    const batch = staleIds.slice(start, start + WAITLIST_VIEW_SNAPSHOT_WRITE_BATCH_SIZE);
    if (batch.length === 0) continue;

    const { error } = await db
      .from("public_waitlist_view_snapshots")
      .delete()
      .in("source_waitlist_id", batch);
    if (error) throw new Error(error.message);
  }

  return { rowCount: snapshotRows.length };
}

async function ensurePublicWaitlistViewSnapshot(): Promise<void> {
  const { count, error } = await db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;
  await rebuildPublicWaitlistViewSnapshot();
}

async function ensurePublicWaitlistViewSnapshotFresh(): Promise<void> {
  if (!publicWaitlistSnapshotRefreshPromise) {
    publicWaitlistSnapshotRefreshPromise = (async () => {
      await rebuildPublicWaitlistViewSnapshot();
    })().finally(() => {
      publicWaitlistSnapshotRefreshPromise = null;
    });
  }

  await publicWaitlistSnapshotRefreshPromise;
}

function triggerPublicWaitlistViewSnapshotRefresh(): void {
  if (publicWaitlistSnapshotRefreshPromise) return;

  publicWaitlistSnapshotRefreshPromise = (async () => {
    await rebuildPublicWaitlistViewSnapshot();
  })()
    .catch((error) => {
      console.error("[public-waitlist-view-snapshot] background refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      publicWaitlistSnapshotRefreshPromise = null;
    });
}

export async function refreshPublicWaitlistViewSnapshotSafe(): Promise<void> {
  try {
    await rebuildPublicWaitlistViewSnapshot();
  } catch (error) {
    console.error("[public-waitlist-view-snapshot] refresh failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getPublicWaitlistViewData(args?: {
  page?: number | null;
  pageSize?: number | null;
  sortKey?: string | null;
  sortDirection?: string | null;
  searchQuery?: string | null;
  searchMode?: string | null;
  reservedOnly?: boolean | null;
  protectedOnly?: boolean | null;
}): Promise<PublicWaitlistViewData> {
  await ensurePublicWaitlistViewSnapshot();
  triggerPublicWaitlistViewSnapshotRefresh();

  const page = sanitizePage(args?.page ?? 1);
  const pageSize = sanitizePageSize(args?.pageSize ?? WAITLIST_VIEW_PAGE_SIZE);
  const sortKey = sanitizeSortKey(args?.sortKey);
  const sortDirection = sanitizeSortDirection(args?.sortDirection);
  const searchQuery = args?.searchQuery?.trim().toLowerCase() ?? "";
  const searchMode = sanitizeSearchMode(args?.searchMode);
  const reservedOnly = args?.reservedOnly === true;
  const protectedOnly = args?.protectedOnly === true;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("public_waitlist_view_snapshots")
    .select("*", { count: "exact" });
  let allCountQuery = db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true });
  let reservedCountQuery = db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true })
    .eq("is_reserved", true);
  let protectedCountQuery = db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true })
    .eq("is_protected", true);
  const heroAllCountQuery = db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true });
  const heroReservedCountQuery = db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true })
    .eq("is_reserved", true);
  const heroProtectedCountQuery = db
    .from("public_waitlist_view_snapshots")
    .select("source_waitlist_id", { count: "exact", head: true })
    .eq("is_protected", true);

  if (searchQuery) {
    if (searchMode === "exact") {
      query = query.eq("normalized_name", searchQuery);
      allCountQuery = allCountQuery.eq("normalized_name", searchQuery);
      reservedCountQuery = reservedCountQuery.eq("normalized_name", searchQuery);
      protectedCountQuery = protectedCountQuery.eq("normalized_name", searchQuery);
    } else {
      query = query.like("normalized_name", `%${searchQuery}%`);
      allCountQuery = allCountQuery.like("normalized_name", `%${searchQuery}%`);
      reservedCountQuery = reservedCountQuery.like("normalized_name", `%${searchQuery}%`);
      protectedCountQuery = protectedCountQuery.like("normalized_name", `%${searchQuery}%`);
    }
  }

  if (reservedOnly) {
    query = query.eq("is_reserved", true);
    reservedCountQuery = reservedCountQuery.eq("is_reserved", true);
    protectedCountQuery = protectedCountQuery.eq("is_reserved", true);
  }

  if (protectedOnly) {
    query = query.eq("is_protected", true);
    reservedCountQuery = reservedCountQuery.eq("is_protected", true);
    protectedCountQuery = protectedCountQuery.eq("is_protected", true);
  }

  if (sortKey === "line") {
    query = query
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else if (sortKey === "name") {
    query = query
      .order("normalized_name", { ascending: sortDirection === "asc" })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else if (sortKey === "interest") {
    query = query
      .order("interest_count", { ascending: sortDirection === "asc" })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else if (sortKey === "protected") {
    query = query
      .order("is_protected", { ascending: false })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else if (sortKey === "reserved") {
    query = query
      .order("is_reserved", { ascending: false })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else if (sortKey === "directReferrals") {
    query = query
      .order("direct_referrals", { ascending: sortDirection === "asc" })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else if (sortKey === "indirectReferrals") {
    query = query
      .order("indirect_referrals", { ascending: sortDirection === "asc" })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  } else {
    query = query
      .order("reserved_referrals", { ascending: sortDirection === "asc" })
      .order("base_position", { ascending: true })
      .order("source_waitlist_id", { ascending: true });
  }

  const [
    { count: allCount, error: allCountError },
    { data, error, count },
    { count: reservedOnlyCount, error: reservedCountError },
    { count: protectedOnlyCount, error: protectedCountError },
    { count: heroAllCount, error: heroAllCountError },
    { count: heroReservedCount, error: heroReservedCountError },
    { count: heroProtectedCount, error: heroProtectedCountError },
  ] = await Promise.all([
    allCountQuery,
    query.range(from, to),
    reservedCountQuery,
    protectedCountQuery,
    heroAllCountQuery,
    heroReservedCountQuery,
    heroProtectedCountQuery,
  ]);
  if (allCountError) throw new Error(allCountError.message);
  if (error) throw new Error(error.message);
  if (reservedCountError) throw new Error(reservedCountError.message);
  if (protectedCountError) throw new Error(protectedCountError.message);
  if (heroAllCountError) throw new Error(heroAllCountError.message);
  if (heroReservedCountError) throw new Error(heroReservedCountError.message);
  if (heroProtectedCountError) throw new Error(heroProtectedCountError.message);

  const snapshotRows = (data ?? []) as PublicWaitlistViewSnapshotRow[];
  const rankPeers = await fetchRankPeerRows(snapshotRows.map((row) => row.normalized_name));
  const rankById = new Map<string, { position: number; total: number }>();
  const peersByName = new Map<string, RankPeerSnapshotRow[]>();

  for (const peer of rankPeers) {
    const peers = peersByName.get(peer.normalized_name) ?? [];
    peers.push(peer);
    peersByName.set(peer.normalized_name, peers);
  }

  for (const peers of peersByName.values()) {
    const orderedPeers = [...peers].sort((a, b) => {
      const aAdjusted =
        a.base_position
        - Math.floor(a.direct_referrals / WAITLIST_VIEW_REFERRALS_PER_SPOT)
        - Math.floor(a.indirect_referrals / WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT);
      const bAdjusted =
        b.base_position
        - Math.floor(b.direct_referrals / WAITLIST_VIEW_REFERRALS_PER_SPOT)
        - Math.floor(b.indirect_referrals / WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT);
      if (aAdjusted !== bAdjusted) return aAdjusted - bAdjusted;
      if (a.base_position !== b.base_position) return a.base_position - b.base_position;
      return a.source_waitlist_id.localeCompare(b.source_waitlist_id);
    });

    orderedPeers.forEach((peer, index) => {
      rankById.set(peer.source_waitlist_id, { position: index + 1, total: orderedPeers.length });
    });
  }

  const rows = snapshotRows.map((row) => {
    const adjustedLineNumber =
      row.base_position
      - Math.floor(row.direct_referrals / WAITLIST_VIEW_REFERRALS_PER_SPOT)
      - Math.floor(row.indirect_referrals / WAITLIST_VIEW_INDIRECT_REFERRALS_PER_SPOT);

    return {
      id: row.source_waitlist_id,
      name: row.name,
      createdAt: row.source_created_at,
      basePosition: row.base_position,
      adjustedLineNumber,
      reservedPosition: row.is_reserved ? row.adjusted_position : null,
      interestCount: row.interest_count,
      rankPosition: rankById.get(row.source_waitlist_id)?.position ?? 1,
      rankTotal: rankById.get(row.source_waitlist_id)?.total ?? 1,
      protected: row.is_protected,
      reserved: row.is_reserved,
      directReferrals: row.direct_referrals,
      reservedReferrals: row.reserved_referrals,
      indirectReferrals: row.indirect_referrals,
      displayReferralCode: row.display_referral_code,
      leaderHref: row.canonical_referral_code
        ? `/leaders/ref/${encodeURIComponent(row.canonical_referral_code)}`
        : null,
      adjustedPosition: row.adjusted_position,
    };
  });

  return {
    rows,
    allCount: allCount ?? 0,
    totalCount: count ?? 0,
    reservedOnlyCount: reservedOnlyCount ?? 0,
    protectedOnlyCount: protectedOnlyCount ?? 0,
    heroAllCount: heroAllCount ?? 0,
    heroReservedCount: heroReservedCount ?? 0,
    heroProtectedCount: heroProtectedCount ?? 0,
    page,
    pageSize,
    hasMore: from + rows.length < (count ?? 0),
    sortKey,
    sortDirection,
    searchQuery,
    searchMode,
    earlyAccessStartAt: WAITLIST_VIEW_EARLY_ACCESS_START_AT,
    earlyAccessLabel: WAITLIST_VIEW_EARLY_ACCESS_LABEL,
    adminWalletUivk: WAITLIST_VIEW_ADMIN_WALLET_UIVK,
    referralsPerSpot: WAITLIST_VIEW_REFERRALS_PER_SPOT,
  };
}
