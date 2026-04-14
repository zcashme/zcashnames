export type ReferralScope = "all" | "confirmed";

export type NameLengthBucket = "1" | "2" | "3" | "4" | "5" | "6" | "7+";

export type ProjectionModel = "fixed" | "commission";

export interface WaitlistReferralRow {
  name: string;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  email_verified: boolean;
  cabal: boolean;
}

export interface ReferralTreeEntry extends WaitlistReferralRow {
  depth: number;
  initiated_referrals: number;
}

export interface DirectReferralEntry extends ReferralTreeEntry {
  depth: 1;
}

export interface ReferralDashboardData {
  root: WaitlistReferralRow | null;
  referralCode: string;
  waitlistPosition: number | null;
  rootBadge: "red" | "blue" | null;
  directReferrals: DirectReferralEntry[];
  descendants: ReferralTreeEntry[];
  depthCounts: Array<{ depth: number; count: number }>;
  totalAttributedReferrals: number;
  maxDepth: number;
}

export type PriceByBucket = Record<NameLengthBucket, number>;
export type ConversionByBucket = Record<NameLengthBucket, number>;

export interface ReferralProjection {
  model: ProjectionModel;
  projectedPayout: number;
  projectedRevenue: number;
  projectedConversions: number;
  commissionRate: number;
  rows: Array<{
    bucket: NameLengthBucket;
    count: number;
    price: number;
    conversionRate: number;
    projectedConversions: number;
    projectedRevenue: number;
    projectedFixedPayout: number;
  }>;
}

export const NAME_LENGTH_BUCKETS: NameLengthBucket[] = ["1", "2", "3", "4", "5", "6", "7+"];

export const DEFAULT_PRICE_BY_BUCKET: PriceByBucket = {
  "1": 6,
  "2": 4.25,
  "3": 3,
  "4": 1.5,
  "5": 0.75,
  "6": 0.5,
  "7+": 0.25,
};

export const DEFAULT_CONVERSION_BY_BUCKET: ConversionByBucket = {
  "1": 100,
  "2": 100,
  "3": 100,
  "4": 100,
  "5": 100,
  "6": 100,
  "7+": 100,
};

export function getNameLengthBucket(name: string): NameLengthBucket {
  const length = name.trim().replace(/\.(zcash|zec)$/i, "").length;
  if (length <= 1) return "1";
  if (length === 2) return "2";
  if (length === 3) return "3";
  if (length === 4) return "4";
  if (length === 5) return "5";
  if (length === 6) return "6";
  return "7+";
}

export function fixedRewardForDepth(depth: number): number {
  if (depth <= 0) return 0;
  return 0.05 / 2 ** (depth - 1);
}

export function commissionRateForAttributedReferrals(totalAttributedReferrals: number): number {
  if (totalAttributedReferrals >= 5000) return 0.3;
  if (totalAttributedReferrals >= 3000) return 0.25;
  if (totalAttributedReferrals >= 1500) return 0.2;
  if (totalAttributedReferrals >= 500) return 0.18;
  return 0.15;
}

export function buildReferralDashboard(
  referralCode: string,
  rows: WaitlistReferralRow[],
  scope: ReferralScope = "all",
): ReferralDashboardData {
  const normalizedCode = referralCode.trim();
  const eligibleRows = rows.filter((row) => scope === "all" || row.email_verified);
  const root = rows.find((row) => row.referral_code === normalizedCode) ?? null;
  const waitlistPosition = root
    ? [...rows]
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .findIndex((row) => row.referral_code === normalizedCode) + 1
    : null;
  const childrenByParent = new Map<string, WaitlistReferralRow[]>();

  for (const row of eligibleRows) {
    if (!row.referred_by) continue;
    const children = childrenByParent.get(row.referred_by) ?? [];
    children.push(row);
    childrenByParent.set(row.referred_by, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const descendants: ReferralTreeEntry[] = [];
  const queue: Array<{ row: WaitlistReferralRow; depth: number; path: Set<string> }> = (
    childrenByParent.get(normalizedCode) ?? []
  ).map((row) => ({ row, depth: 1, path: new Set([normalizedCode]) }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;

    const rowCode = next.row.referral_code;
    if (!rowCode || visited.has(rowCode) || next.path.has(rowCode)) continue;
    visited.add(rowCode);

    const children = childrenByParent.get(rowCode) ?? [];
    descendants.push({
      ...next.row,
      depth: next.depth,
      initiated_referrals: children.length,
    });

    const childPath = new Set(next.path);
    childPath.add(rowCode);

    for (const child of children) {
      queue.push({ row: child, depth: next.depth + 1, path: childPath });
    }
  }

  const depthCountMap = new Map<number, number>();
  for (const descendant of descendants) {
    depthCountMap.set(descendant.depth, (depthCountMap.get(descendant.depth) ?? 0) + 1);
  }

  const depthCounts = Array.from(depthCountMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([depth, count]) => ({ depth, count }));

  return {
    root,
    referralCode: normalizedCode,
    waitlistPosition: waitlistPosition && waitlistPosition > 0 ? waitlistPosition : null,
    rootBadge: resolveReferralBadge(normalizedCode, eligibleRows),
    directReferrals: descendants.filter((entry): entry is DirectReferralEntry => entry.depth === 1),
    descendants,
    depthCounts,
    totalAttributedReferrals: descendants.length,
    maxDepth: depthCounts.at(-1)?.depth ?? 0,
  };
}

function resolveReferralBadge(referralCode: string, rows: WaitlistReferralRow[]): "red" | "blue" | null {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const cutoff = now.getTime() - 24 * 60 * 60 * 1000;
  const todayCounts: Record<string, number> = {};
  const yesterdayCounts: Record<string, number> = {};
  const recentCounts: Record<string, number> = {};

  for (const row of rows) {
    const code = row.referred_by;
    if (!code) continue;
    const createdAt = new Date(row.created_at);
    const time = createdAt.getTime();
    const date = row.created_at.slice(0, 10);

    if (date === today) todayCounts[code] = (todayCounts[code] || 0) + 1;
    if (date === yesterday) yesterdayCounts[code] = (yesterdayCounts[code] || 0) + 1;
    if (Number.isFinite(time) && time >= cutoff) recentCounts[code] = (recentCounts[code] || 0) + 1;
  }

  const topToday = topReferralCode(todayCounts);
  const topYesterday = topReferralCode(yesterdayCounts);
  const streakCode = topToday && topToday === topYesterday ? topToday : null;
  const topRecentCode = topReferralCode(recentCounts);

  if (referralCode === streakCode) return "red";
  if (referralCode === topRecentCode) return "blue";
  return null;
}

function topReferralCode(counts: Record<string, number>): string | null {
  return Object.entries(counts).sort(([codeA, countA], [codeB, countB]) => {
    if (countB !== countA) return countB - countA;
    return codeA.localeCompare(codeB);
  })[0]?.[0] ?? null;
}

export function calculateReferralProjection({
  data,
  model,
  prices,
  conversions,
}: {
  data: ReferralDashboardData;
  model: ProjectionModel;
  prices: PriceByBucket;
  conversions: ConversionByBucket;
}): ReferralProjection {
  const rows = NAME_LENGTH_BUCKETS.map((bucket) => {
    const bucketEntries = data.descendants.filter((entry) => getNameLengthBucket(entry.name) === bucket);
    const count = bucketEntries.length;
    const price = sanitizeNumber(prices[bucket]);
    const conversionRate = Math.max(0, sanitizeNumber(conversions[bucket])) / 100;
    const projectedConversions = count * conversionRate;
    const projectedRevenue = projectedConversions * price;
    const projectedFixedPayout = bucketEntries.reduce(
      (total, entry) => total + conversionRate * fixedRewardForDepth(entry.depth),
      0,
    );

    return {
      bucket,
      count,
      price,
      conversionRate,
      projectedConversions,
      projectedRevenue,
      projectedFixedPayout,
    };
  });

  const projectedRevenue = rows.reduce((total, row) => total + row.projectedRevenue, 0);
  const projectedConversions = rows.reduce((total, row) => total + row.projectedConversions, 0);
  const commissionRate = commissionRateForAttributedReferrals(data.totalAttributedReferrals);
  const fixedPayout = rows.reduce((total, row) => total + row.projectedFixedPayout, 0);

  return {
    model,
    projectedPayout: model === "commission" ? projectedRevenue * commissionRate : fixedPayout,
    projectedRevenue,
    projectedConversions,
    commissionRate,
    rows,
  };
}

function sanitizeNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
