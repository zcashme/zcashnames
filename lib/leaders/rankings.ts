import type { WaitlistReferralRow } from "./referral-dashboard";

export interface RankingEntry {
  referral_code: string;
  name: string;
  count: number;
  payout: number;
}

export interface DailyRow {
  date: string;
  totalCount: number;
  totalGrowthPct: number;
  daily: [RankingEntry?, RankingEntry?, RankingEntry?];
  allTime: [RankingEntry?, RankingEntry?, RankingEntry?];
  topBadge?: "red" | "blue" | null;
}

export interface WeeklyRow {
  week: string;
  weekStart: string;
  weekEnd: string;
  totalCount: number;
  totalGrowthPct: number;
  weekly: [RankingEntry?, RankingEntry?, RankingEntry?];
  allTime: [RankingEntry?, RankingEntry?, RankingEntry?];
}

type ReferralScope = "all" | "confirmed";

function buildTopThreeEntries(
  counts: Record<string, number>,
  nameMap: Record<string, string>,
): [RankingEntry?, RankingEntry?, RankingEntry?] {
  const ranked = Object.entries(counts)
    .sort(([codeA, countA], [codeB, countB]) => {
      if (countB !== countA) return countB - countA;
      return codeA.localeCompare(codeB);
    })
    .slice(0, 3)
    .map(([code, count]) => ({
      referral_code: code,
      name: nameMap[code] || code,
      count,
      payout: Math.round(count * 0.05 * 1000) / 1000,
    }));

  return [ranked[0], ranked[1], ranked[2]];
}

function buildNameMap(rows: WaitlistReferralRow[]): Record<string, string> {
  const nameMap: Record<string, string> = {};

  for (const row of rows) {
    if (row.referral_code && row.name && !nameMap[row.referral_code]) {
      nameMap[row.referral_code] = row.name;
    }
  }

  return nameMap;
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getUtcWeekRange(dateString: string): { weekStart: string; weekEnd: string; week: string } {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  const dayOffset = (date.getUTCDay() + 6) % 7;
  const start = new Date(date.getTime() - dayOffset * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const weekStart = formatUtcDate(start);
  const weekEnd = formatUtcDate(end);

  return {
    weekStart,
    weekEnd,
    week: `${weekStart} to ${weekEnd}`,
  };
}

function calculateGrowthPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildDailyRankingsFromRows(
  rows: WaitlistReferralRow[],
  scope: ReferralScope = "all",
): DailyRow[] {
  if (rows.length === 0) return [];

  const nameMap = buildNameMap(rows);
  const dailyCountsByDate: Record<string, Record<string, number>> = {};
  const dates: string[] = [];
  const seenDates = new Set<string>();

  for (const row of rows) {
    const date = row.created_at.slice(0, 10);

    if (!seenDates.has(date)) {
      seenDates.add(date);
      dates.push(date);
    }

    if (!row.referred_by) continue;
    if (scope === "confirmed" && !row.email_verified) continue;

    if (!dailyCountsByDate[date]) dailyCountsByDate[date] = {};
    dailyCountsByDate[date][row.referred_by] = (dailyCountsByDate[date][row.referred_by] || 0) + 1;
  }

  const cumulativeCounts: Record<string, number> = {};
  let previousTotalCount = 0;

  return dates.map((date) => {
    const dailyCounts = dailyCountsByDate[date] || {};
    const dailyTop = buildTopThreeEntries(dailyCounts, nameMap);
    const totalCount = Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);

    for (const [code, count] of Object.entries(dailyCounts)) {
      cumulativeCounts[code] = (cumulativeCounts[code] || 0) + count;
    }

    const totalGrowthPct = calculateGrowthPct(totalCount, previousTotalCount);
    previousTotalCount = totalCount;

    return {
      date,
      totalCount,
      totalGrowthPct,
      daily: dailyTop,
      allTime: buildTopThreeEntries(cumulativeCounts, nameMap),
    };
  });
}

export function buildWeeklyRankingsFromRows(
  rows: WaitlistReferralRow[],
  scope: ReferralScope = "all",
): WeeklyRow[] {
  if (rows.length === 0) return [];

  const nameMap = buildNameMap(rows);
  const weeklyCountsByRange: Record<string, Record<string, number>> = {};
  const orderedWeeks: { week: string; weekStart: string; weekEnd: string }[] = [];
  const seenWeeks = new Set<string>();

  for (const row of rows) {
    if (!row.referred_by) continue;
    if (scope === "confirmed" && !row.email_verified) continue;

    const date = row.created_at.slice(0, 10);
    const weekRange = getUtcWeekRange(date);

    if (!seenWeeks.has(weekRange.week)) {
      seenWeeks.add(weekRange.week);
      orderedWeeks.push(weekRange);
    }

    if (!weeklyCountsByRange[weekRange.week]) weeklyCountsByRange[weekRange.week] = {};
    weeklyCountsByRange[weekRange.week][row.referred_by] =
      (weeklyCountsByRange[weekRange.week][row.referred_by] || 0) + 1;
  }

  const cumulativeCounts: Record<string, number> = {};
  let previousTotalCount = 0;

  return orderedWeeks.map(({ week, weekStart, weekEnd }) => {
    const weeklyCounts = weeklyCountsByRange[week] || {};
    const weeklyTop = buildTopThreeEntries(weeklyCounts, nameMap);
    const totalCount = Object.values(weeklyCounts).reduce((sum, count) => sum + count, 0);

    for (const [code, count] of Object.entries(weeklyCounts)) {
      cumulativeCounts[code] = (cumulativeCounts[code] || 0) + count;
    }

    const totalGrowthPct = calculateGrowthPct(totalCount, previousTotalCount);
    previousTotalCount = totalCount;

    return {
      week,
      weekStart,
      weekEnd,
      totalCount,
      totalGrowthPct,
      weekly: weeklyTop,
      allTime: buildTopThreeEntries(cumulativeCounts, nameMap),
    };
  });
}
