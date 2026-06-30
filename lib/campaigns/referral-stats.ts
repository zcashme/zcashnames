import "server-only";

import { db } from "@/lib/db";
import type {
  CampaignRecipientPersonalization,
  CampaignReferralStats,
} from "@/lib/campaigns/types";

const REFERRAL_STATS_CACHE_TTL_MS = 60 * 1000;
const REFERRAL_STATS_PAGE_SIZE = 1000;

type CampaignReferralStatsRow = {
  referral_code: string;
  direct_referrals: number | null;
  indirect_referrals: number | null;
  attributed_referrals: number | null;
  referrals_24h_count: number | null;
  referrals_24h_growth_pct: number | null;
  referrals_7d_count: number | null;
  referrals_7d_growth_pct: number | null;
  referrals_30d_count: number | null;
  referrals_30d_growth_pct: number | null;
  depth_1_referrals: number | null;
  depth_2_referrals: number | null;
  depth_3_referrals: number | null;
  leaderboard_rank: number | null;
  waitlist_position: number | null;
  waitlist_total: number | null;
  max_referral_depth: number | null;
  potential_rewards: number | string | null;
  root_badge: string | null;
  commission_unlocked: boolean | null;
  referrals_unlocked: boolean | null;
  refreshed_at: string | null;
};

let referralStatsCache:
  | {
      index: Map<string, CampaignReferralStats>;
      expiresAt: number;
      refreshedAt: string | null;
    }
  | null = null;

function mapRowToCampaignReferralStats(row: CampaignReferralStatsRow): CampaignReferralStats {
  const potentialRewards =
    typeof row.potential_rewards === "number"
      ? row.potential_rewards
      : typeof row.potential_rewards === "string"
        ? Number(row.potential_rewards)
        : null;

  return {
    directReferrals: row.direct_referrals,
    indirectReferrals: row.indirect_referrals,
    attributedReferrals: row.attributed_referrals,
    referrals24hCount: row.referrals_24h_count,
    referrals24hGrowthPct: row.referrals_24h_growth_pct,
    referrals7dCount: row.referrals_7d_count,
    referrals7dGrowthPct: row.referrals_7d_growth_pct,
    referrals30dCount: row.referrals_30d_count,
    referrals30dGrowthPct: row.referrals_30d_growth_pct,
    depth1Referrals: row.depth_1_referrals,
    depth2Referrals: row.depth_2_referrals,
    depth3Referrals: row.depth_3_referrals,
    leaderboardRank: row.leaderboard_rank,
    waitlistPosition: row.waitlist_position,
    waitlistTotal: row.waitlist_total,
    maxReferralDepth: row.max_referral_depth,
    potentialRewards: Number.isFinite(potentialRewards) ? potentialRewards : null,
    rootBadge: row.root_badge === "red" || row.root_badge === "blue" ? row.root_badge : null,
    commissionUnlocked: row.commission_unlocked,
    referralsUnlocked: row.referrals_unlocked,
  };
}

function buildReferralStatsFailure(args: {
  referralCode?: string;
  reason: string;
  details?: string;
  hint?: string;
}): Error {
  const parts = [
    `[campaign-referral-stats] ${args.reason}`,
    args.referralCode ? `referralCode=${args.referralCode}` : null,
    args.details ? `details=${args.details}` : null,
    args.hint ? `hint=${args.hint}` : null,
  ].filter(Boolean);
  return new Error(parts.join(" | "));
}

async function fetchReferralStatsRows(): Promise<CampaignReferralStatsRow[]> {
  const selectClause = [
    "referral_code",
    "direct_referrals",
    "indirect_referrals",
    "attributed_referrals",
    "referrals_24h_count",
    "referrals_24h_growth_pct",
    "referrals_7d_count",
    "referrals_7d_growth_pct",
    "referrals_30d_count",
    "referrals_30d_growth_pct",
    "depth_1_referrals",
    "depth_2_referrals",
    "depth_3_referrals",
    "leaderboard_rank",
    "waitlist_position",
    "waitlist_total",
    "max_referral_depth",
    "potential_rewards",
    "root_badge",
    "commission_unlocked",
    "referrals_unlocked",
    "refreshed_at",
  ].join(", ");

  const rows: CampaignReferralStatsRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db
      .from("waitlist_referral_stats")
      .select(selectClause)
      .order("referral_code", { ascending: true })
      .range(offset, offset + REFERRAL_STATS_PAGE_SIZE - 1);

    if (error) {
      throw buildReferralStatsFailure({
        reason: "waitlist_referral_stats query failed",
        details: error.message,
        hint:
          "Run the waitlist_referral_stats migration in Supabase and confirm the service role has access to the table.",
      });
    }

    const pageRows = ((data ?? []) as unknown) as CampaignReferralStatsRow[];
    if (pageRows.length === 0) break;

    rows.push(...pageRows);
    if (pageRows.length < REFERRAL_STATS_PAGE_SIZE) break;
    offset += REFERRAL_STATS_PAGE_SIZE;
  }

  if (rows.length === 0) {
    throw buildReferralStatsFailure({
      reason: "waitlist_referral_stats returned zero rows",
      hint:
        "Run select public.refresh_waitlist_referral_stats(); in Supabase so the derived stats table is populated.",
    });
  }

  return rows;
}

async function getReferralStatsIndex(): Promise<{
  index: Map<string, CampaignReferralStats>;
  refreshedAt: string | null;
}> {
  const now = Date.now();
  if (referralStatsCache && referralStatsCache.expiresAt > now) {
    return {
      index: referralStatsCache.index,
      refreshedAt: referralStatsCache.refreshedAt,
    };
  }

  const rows = await fetchReferralStatsRows();
  const index = new Map<string, CampaignReferralStats>();
  let refreshedAt: string | null = null;

  for (const row of rows) {
    index.set(row.referral_code, mapRowToCampaignReferralStats(row));
    if (!refreshedAt && row.refreshed_at) refreshedAt = row.refreshed_at;
  }

  referralStatsCache = {
    index,
    refreshedAt,
    expiresAt: now + REFERRAL_STATS_CACHE_TTL_MS,
  };

  return { index, refreshedAt };
}

export async function getCampaignReferralStats(
  canonicalReferralCode: string,
): Promise<CampaignReferralStats | null> {
  const normalizedCode = canonicalReferralCode.trim();
  if (!normalizedCode) return null;

  const { index, refreshedAt } = await getReferralStatsIndex();
  const stats = index.get(normalizedCode);
  if (!stats) {
    throw buildReferralStatsFailure({
      referralCode: normalizedCode,
      reason: "referral code not found in waitlist_referral_stats",
      details: `cachedRows=${index.size}${refreshedAt ? `, refreshedAt=${refreshedAt}` : ""}`,
      hint:
        "Confirm the referral code exists in zn_waitlist and rerun public.refresh_waitlist_referral_stats().",
    });
  }

  return stats;
}

export async function buildCampaignReferralStatsContext(): Promise<Map<string, CampaignReferralStats>> {
  const { index } = await getReferralStatsIndex();
  return index;
}

export function withCampaignReferralStats(
  personalization: CampaignRecipientPersonalization,
  referralStats: CampaignReferralStats | null,
): CampaignRecipientPersonalization {
  return {
    ...personalization,
    referralStats,
  };
}
