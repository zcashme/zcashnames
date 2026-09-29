/** Level I ZEC baked into `public.refresh_waitlist_referral_stats()` (`sql/2026-06-22-waitlist-referral-stats.sql`). */
export const WAITLIST_REFERRAL_STATS_SQL_LEVEL_ONE_ZEC = 0.05;

export function convertSqlPotentialRewardsToQuote(
  sqlPotentialRewards: number | null,
  levelOneRewardZec: number | null,
): number | null {
  if (sqlPotentialRewards == null || !Number.isFinite(sqlPotentialRewards)) return null;
  if (levelOneRewardZec == null || !Number.isFinite(levelOneRewardZec) || levelOneRewardZec <= 0) return null;
  return Math.round(
    sqlPotentialRewards * (levelOneRewardZec / WAITLIST_REFERRAL_STATS_SQL_LEVEL_ONE_ZEC) * 10000,
  ) / 10000;
}
