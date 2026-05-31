"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sendCommissionPinEmail } from "@/lib/email/commission-pin";
import { getPreferredReferralCode } from "@/lib/referral-code";
import {
  clearCommissionAccessCookie,
  getCommissionPin,
  hasCommissionAccess,
  hasReferralTableAccess,
  setReferralTableAccessCookie,
  setCommissionAccessCookie,
  verifyCommissionPin,
} from "@/lib/leaders/commission-access";
import {
  buildFixedDepthReferralSummaries,
  buildReferralDashboard,
  type ReferralDashboardBaseData,
  type ReferralDashboardData,
  type WaitlistReferralRow,
} from "@/lib/leaders/referral-dashboard";
import {
  buildDailyRankingsFromRows,
  buildWeeklyRankingsFromRows,
  type DailyRow,
  type RankingEntry,
  type WeeklyRow,
} from "@/lib/leaders/rankings";
import { ensureHumanReferralCode, resolveReferralIdentity } from "@/lib/referrals";
import { resolveSiteUrl } from "@/lib/site-url";

export type { DailyRow, RankingEntry, WeeklyRow } from "@/lib/leaders/rankings";
export type { ReferralDashboardData } from "@/lib/leaders/referral-dashboard";

export interface TimeSeriesPoint {
  date: string;
  total: number;
  referred: number;
  nonReferred: number;
  rewardsPot: number;
  totalDelta?: number;
  referredDelta?: number;
  nonReferredDelta?: number;
  rewardsDelta?: number;
  topReferrer?: { name: string; count: number; streak: boolean; code?: string };
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  referral_code: string;
  canonical_referral_code: string;
  referrals: number;
  indirectReferrals: number;
  attributedReferrals: number;
  recent: number;
  recentGrowthPct: number;
  weeklyRecent: number;
  weeklyGrowthPct: number;
  potential_rewards: number;
  streak: boolean;
  topRecent: boolean;
}

export interface LeadersData {
  timeSeries: TimeSeriesPoint[];
  leaderboard: LeaderboardEntry[];
  dailyRankings: DailyRow[];
  weeklyRankings: WeeklyRow[];
  stats: { waitlist: number; referred: number; rewardsPot: number };
}

export interface DailyNewNameEntry {
  name: string;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  email_verified: boolean;
}

type ReferralCommissionUnlockResult =
  | { ok: true }
  | { ok: false; error: string };

type ReferralCommissionModeResult =
  | { ok: true }
  | { ok: false; error: string };

type ReferralTableUnlockResult =
  | { ok: true }
  | { ok: false; error: string };

type ReferralCommissionPinRequestResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const COMMISSION_PIN_SENT_MESSAGE = "If the email matches, we will send the code there.";
const COMMISSION_PIN_RATE_LIMIT_MESSAGE = "We already sent you a code today";
const COMMISSION_PIN_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;
const WAITLIST_PAGE_SIZE = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const REFERRAL_DASHBOARD_LOG_PREFIX = "[leaders/referral-dashboard]";

function calculateGrowthPct(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : Number.POSITIVE_INFINITY;
  return Math.round(((current - previous) / previous) * 100);
}

function toWaitlistReferralRows(data: Record<string, unknown>[]): WaitlistReferralRow[] {
  return data
    .map((row) => ({
      name: (row.name as string | null) ?? "",
      referral_code: (row.referral_code as string | null) ?? "",
      human_referral_code: (row.human_referral_code as string | null) ?? null,
      preferred_referral_code: getPreferredReferralCode({
        referral_code: (row.referral_code as string | null) ?? "",
        human_referral_code: (row.human_referral_code as string | null) ?? null,
      }),
      referred_by: (row.referred_by as string | null) ?? null,
      created_at: row.created_at as string,
      email_verified: Boolean(row.email_verified),
      cabal: Boolean(row.cabal),
    }))
    .filter((row) => Boolean(row.referral_code));
}

function roundZec(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function wasCommissionPinSentToday(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  const sentAt = new Date(value).getTime();
  if (!Number.isFinite(sentAt)) return false;
  return Date.now() - sentAt < COMMISSION_PIN_RATE_LIMIT_MS;
}

function calculateRewardsPot(rows: WaitlistReferralRow[]): number {
  const summaries = buildFixedDepthReferralSummaries(rows);
  const rewardsPot = Array.from(summaries.values()).reduce(
    (total, summary) => total + (summary.directReferrals > 0 ? summary.potentialRewards : 0),
    0,
  );

  return roundZec(rewardsPot);
}

function resolveTopReferrer(
  dailyCounts: Record<string, number>,
  nameMap: Record<string, string>,
  previousTopCode: string | null,
): { name: string; count: number; streak: boolean; code: string } | undefined {
  const entries = Object.entries(dailyCounts);
  if (entries.length === 0) return undefined;
  entries.sort(([, a], [, b]) => b - a);
  const [code, count] = entries[0];
  return { name: nameMap[code] || code, count, streak: code === previousTopCode, code };
}

function isNextDay(previousDate: string, nextDate: string): boolean {
  const previous = new Date(`${previousDate}T00:00:00.000Z`).getTime();
  const next = new Date(`${nextDate}T00:00:00.000Z`).getTime();
  return next - previous === 24 * 60 * 60 * 1000;
}

function buildPreferredCodeMap(rows: WaitlistReferralRow[]): Record<string, string> {
  const preferredCodeMap: Record<string, string> = {};

  for (const row of rows) {
    if (row.referral_code && !preferredCodeMap[row.referral_code]) {
      preferredCodeMap[row.referral_code] = row.preferred_referral_code ?? row.human_referral_code ?? row.referral_code;
    }
  }

  return preferredCodeMap;
}

async function fetchAllWaitlistRows(): Promise<Record<string, unknown>[] | null> {
  try {
    const rows: Record<string, unknown>[] = [];
    let offset = 0;

    while (true) {
      const { data, error } = await db
        .from("zn_waitlist")
        .select("name, referral_code, human_referral_code, referred_by, created_at, email_verified, cabal")
        .order("created_at", { ascending: true })
        .range(offset, offset + WAITLIST_PAGE_SIZE - 1);

      if (error || !data) {
        console.error(`${REFERRAL_DASHBOARD_LOG_PREFIX} fetchAllWaitlistRows failed`, {
          offset,
          pageSize: WAITLIST_PAGE_SIZE,
          hasData: Boolean(data),
          error: error ? formatUnknownError(error) : "No data returned from Supabase.",
        });
        return null;
      }

      rows.push(...data);

      if (data.length < WAITLIST_PAGE_SIZE) break;
      offset += WAITLIST_PAGE_SIZE;
    }

    return rows;
  } catch (error) {
    console.error(`${REFERRAL_DASHBOARD_LOG_PREFIX} fetchAllWaitlistRows threw`, {
      error: formatUnknownError(error),
    });
    return null;
  }
}

function buildWaitlistStatsFromData(
  data: Record<string, unknown>[],
  rows: WaitlistReferralRow[],
): { waitlist: number; referred: number; rewardsPot: number } {
  return {
    waitlist: data.filter((r) => Boolean(r.email_verified)).length,
    referred: data.filter((r) => Boolean(r.referred_by) && Boolean(r.email_verified)).length,
    rewardsPot: calculateRewardsPot(rows),
  };
}

export async function getWaitlistStats(): Promise<{ waitlist: number; referred: number; rewardsPot: number }> {
  try {
    const data = await fetchAllWaitlistRows();
    if (!data) return { waitlist: 0, referred: 0, rewardsPot: 0 };
    return buildWaitlistStatsFromData(data, toWaitlistReferralRows(data));
  } catch {
    return { waitlist: 0, referred: 0, rewardsPot: 0 };
  }
}

function buildLeadersTimeSeriesFromData(
  data: Record<string, unknown>[],
  rows: WaitlistReferralRow[],
): TimeSeriesPoint[] {
  const nameMap: Record<string, string> = {};
  for (const row of rows) {
    if (row.referral_code && row.name && !nameMap[row.referral_code]) {
      nameMap[row.referral_code] = row.name;
    }
  }

  const points: TimeSeriesPoint[] = [];
  const cumulativeRows: WaitlistReferralRow[] = [];
  let total = 0;
  let referred = 0;
  let lastDate = "";
  let dailyCounts: Record<string, number> = {};
  let previousTopCode: string | null = null;

  for (const rawRow of data) {
    const row = {
      name: (rawRow.name as string | null) ?? "",
      referral_code: (rawRow.referral_code as string | null) ?? "",
      referred_by: (rawRow.referred_by as string | null) ?? null,
      created_at: rawRow.created_at as string,
      email_verified: Boolean(rawRow.email_verified),
      cabal: Boolean(rawRow.cabal),
    };
    const date = row.created_at.slice(0, 10);
    const isNewDate = date !== lastDate;

    // On a new date, finalize the previous point's rewardsPot + topReferrer using
    // cumulativeRows as it stands before pushing this row. This makes calculateRewardsPot
    // run once per date instead of once per row.
    if (isNewDate && points.length > 0) {
      points[points.length - 1].rewardsPot = calculateRewardsPot(cumulativeRows);
      const top = resolveTopReferrer(dailyCounts, nameMap, previousTopCode);
      points[points.length - 1].topReferrer = top;
      previousTopCode = top?.code ?? null;
      dailyCounts = {};
    }

    const isCountedMember = row.email_verified;
    if (isCountedMember) total += 1;
    if (row.referral_code) cumulativeRows.push(row);

    const isCountedReferral = isCountedMember && Boolean(row.referred_by);
    if (isCountedReferral) referred += 1;

    if (isNewDate) {
      points.push({ date, total, referred, nonReferred: total - referred, rewardsPot: 0 });
      lastDate = date;
    } else {
      const point = points[points.length - 1];
      point.total = total;
      point.referred = referred;
      point.nonReferred = total - referred;
    }

    if (isCountedReferral) {
      const code = row.referred_by as string;
      dailyCounts[code] = (dailyCounts[code] || 0) + 1;
    }
  }

  // Final flush for the last date — rewardsPot was never set inside the loop.
  if (points.length > 0) {
    points[points.length - 1].rewardsPot = calculateRewardsPot(cumulativeRows);
    const top = resolveTopReferrer(dailyCounts, nameMap, previousTopCode);
    points[points.length - 1].topReferrer = top;
  }

  for (let i = 1; i < points.length; i++) {
    points[i].totalDelta = points[i].total - points[i - 1].total;
    points[i].referredDelta = points[i].referred - points[i - 1].referred;
    points[i].nonReferredDelta = points[i].nonReferred - points[i - 1].nonReferred;
    points[i].rewardsDelta = roundZec(points[i].rewardsPot - points[i - 1].rewardsPot);
  }

  return points;
}

export async function getLeadersTimeSeries(): Promise<TimeSeriesPoint[]> {
  try {
    const data = await fetchAllWaitlistRows();
    if (!data) return [];
    return buildLeadersTimeSeriesFromData(data, toWaitlistReferralRows(data));
  } catch {
    return [];
  }
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const data = await fetchAllWaitlistRows();
    if (!data) return [];

    return buildLeaderboardFromRows(toWaitlistReferralRows(data));
  } catch {
    return [];
  }
}

function buildLeaderboardFromRows(
  rows: WaitlistReferralRow[],
): LeaderboardEntry[] {
  const summaries = buildFixedDepthReferralSummaries(rows);

  const nameMap: Record<string, string> = {};
  const preferredCodeMap = buildPreferredCodeMap(rows);
  for (const row of rows) {
    if (row.referral_code && row.name && !nameMap[row.referral_code]) {
      nameMap[row.referral_code] = row.name;
    }
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nowMs = now.getTime();
  const recentCutoff = nowMs - DAY_MS;
  const previousRecentCutoff = nowMs - 2 * DAY_MS;
  const weeklyCutoff = nowMs - 7 * DAY_MS;
  const previousWeeklyCutoff = nowMs - 14 * DAY_MS;

  const counts: Record<string, number> = {};
  const recentCounts: Record<string, number> = {};
  const previousRecentCounts: Record<string, number> = {};
  const weeklyCounts: Record<string, number> = {};
  const previousWeeklyCounts: Record<string, number> = {};
  const todayCounts: Record<string, number> = {};
  const yesterdayCounts: Record<string, number> = {};

  for (const row of rows) {
    if (!row.referred_by) continue;
    if (!row.email_verified) continue;

    const code = row.referred_by;
    const date = row.created_at.slice(0, 10);

    counts[code] = (counts[code] || 0) + 1;

    const createdAtMs = new Date(row.created_at).getTime();

    if (createdAtMs >= recentCutoff) {
      recentCounts[code] = (recentCounts[code] || 0) + 1;
    } else if (createdAtMs >= previousRecentCutoff) {
      previousRecentCounts[code] = (previousRecentCounts[code] || 0) + 1;
    }

    if (createdAtMs >= weeklyCutoff) {
      weeklyCounts[code] = (weeklyCounts[code] || 0) + 1;
    } else if (createdAtMs >= previousWeeklyCutoff) {
      previousWeeklyCounts[code] = (previousWeeklyCounts[code] || 0) + 1;
    }

    if (date === today) todayCounts[code] = (todayCounts[code] || 0) + 1;
    if (date === yesterday) yesterdayCounts[code] = (yesterdayCounts[code] || 0) + 1;
  }

  const topToday = Object.entries(todayCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const topYesterday = Object.entries(yesterdayCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;
  const streakCode = topToday && topToday === topYesterday ? topToday : null;
  const topRecentCode = Object.entries(recentCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return Object.entries(counts)
    .map(([referral_code, referrals]) => {
      const summary = summaries.get(referral_code);
      const indirectReferrals = summary?.indirectReferrals ?? 0;
      const displayedReferrals = referrals + indirectReferrals;

      return {
        name: nameMap[referral_code] || referral_code,
        referral_code: preferredCodeMap[referral_code] || referral_code,
        canonical_referral_code: referral_code,
        referrals,
        indirectReferrals,
        attributedReferrals: displayedReferrals,
        recent: recentCounts[referral_code] || 0,
        recentGrowthPct: calculateGrowthPct(
          recentCounts[referral_code] || 0,
          previousRecentCounts[referral_code] || 0,
        ),
        weeklyRecent: weeklyCounts[referral_code] || 0,
        weeklyGrowthPct: calculateGrowthPct(
          weeklyCounts[referral_code] || 0,
          previousWeeklyCounts[referral_code] || 0,
        ),
        potential_rewards: summary?.potentialRewards ?? roundZec(referrals * 0.05),
        streak: referral_code === streakCode,
        topRecent: referral_code === topRecentCode && referral_code !== streakCode,
      };
    })
    .sort((a, b) => {
      if (b.attributedReferrals !== a.attributedReferrals) {
        return b.attributedReferrals - a.attributedReferrals;
      }
      if (b.referrals !== a.referrals) return b.referrals - a.referrals;
      return a.canonical_referral_code.localeCompare(b.canonical_referral_code);
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export async function getDailyRankings(): Promise<DailyRow[]> {
  try {
    const data = await fetchAllWaitlistRows();
    if (!data || data.length === 0) return [];

    return buildDailyRankingsFromRows(toWaitlistReferralRows(data));
  } catch {
    return [];
  }
}

export async function getWeeklyRankings(): Promise<WeeklyRow[]> {
  try {
    const data = await fetchAllWaitlistRows();
    if (!data || data.length === 0) return [];

    return buildWeeklyRankingsFromRows(toWaitlistReferralRows(data));
  } catch {
    return [];
  }
}

export async function getLeadersData(): Promise<LeadersData> {
  const data = await fetchAllWaitlistRows();
  if (!data) {
    return {
      timeSeries: [],
      leaderboard: [],
      dailyRankings: [],
      weeklyRankings: [],
      stats: { waitlist: 0, referred: 0, rewardsPot: 0 },
    };
  }
  const rows = toWaitlistReferralRows(data);

  const timeSeries = buildLeadersTimeSeriesFromData(data, rows);
  const leaderboard = buildLeaderboardFromRows(rows);
  const initialDailyRankings = buildDailyRankingsFromRows(rows);
  const weeklyRankings = buildWeeklyRankingsFromRows(rows);
  const stats = buildWaitlistStatsFromData(data, rows);

  const dailyRankings: DailyRow[] = initialDailyRankings.map((row) => ({ ...row, topBadge: null }));

  let previousDate: string | null = null;
  let previousTopCode: string | null = null;
  let currentStreak = 0;

  for (const row of dailyRankings) {
    const topEntry = row.daily[0];
    if (!topEntry) {
      row.topBadge = null;
      previousDate = row.date;
      previousTopCode = null;
      currentStreak = 0;
      continue;
    }

    const continuesStreak =
      previousTopCode === (topEntry.canonical_referral_code ?? topEntry.referral_code) &&
      previousDate !== null &&
      isNextDay(previousDate, row.date);

    currentStreak = continuesStreak ? currentStreak + 1 : 1;
    row.topBadge = currentStreak >= 2 ? "red" : "blue";

    previousDate = row.date;
    previousTopCode = topEntry.canonical_referral_code ?? topEntry.referral_code;
  }

  return { timeSeries, leaderboard, dailyRankings, weeklyRankings, stats };
}

export async function getDailyNewNames(date: string): Promise<DailyNewNameEntry[]> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return [];
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, human_referral_code, referred_by, created_at, email_verified")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data
      .map((row) => ({
        name: (row.name as string | null) ?? "",
        referral_code: getPreferredReferralCode({
          referral_code: (row.referral_code as string | null) ?? "",
          human_referral_code: (row.human_referral_code as string | null) ?? null,
        }),
        referred_by: (row.referred_by as string | null) ?? null,
        created_at: row.created_at as string,
        email_verified: Boolean(row.email_verified),
      }))
      .filter((row) => Boolean(row.name));
  } catch {
    return [];
  }
}

export async function getReferralDashboard(
  referralCode: string,
): Promise<ReferralDashboardData | null> {
  const normalizedCode = referralCode.trim();

  try {
    if (!normalizedCode) {
      console.warn(`${REFERRAL_DASHBOARD_LOG_PREFIX} empty referral code`, {
        referralCode,
      });
      return null;
    }

    const resolved = await resolveReferralIdentity(normalizedCode, {
      ensureHumanReferralCode: true,
      select: "id, name, referral_code, human_referral_code, cabal",
    });
    if (!resolved) {
      return null;
    }

    const data = await fetchAllWaitlistRows();
    if (!data) {
      console.error(`${REFERRAL_DASHBOARD_LOG_PREFIX} waitlist fetch returned null`, {
        referralCode: normalizedCode,
      });
      return null;
    }

    const rows = toWaitlistReferralRows(data);
    const dashboard: ReferralDashboardBaseData = buildReferralDashboard(resolved.canonicalCode, rows);
    const leaderboard = buildLeaderboardFromRows(rows);
    const leaderboardRank =
      leaderboard.find((entry) => entry.canonical_referral_code === dashboard.canonicalReferralCode)?.rank ?? null;
    const [commissionUnlocked, referralsUnlocked] = await Promise.all([
      dashboard.root?.cabal
        ? hasCommissionAccess(dashboard.canonicalReferralCode).catch(() => false)
        : false,
      hasReferralTableAccess(dashboard.canonicalReferralCode).catch(() => false),
    ]);

    return { ...dashboard, leaderboardRank, commissionUnlocked, referralsUnlocked };
  } catch (error) {
    console.error(`${REFERRAL_DASHBOARD_LOG_PREFIX} getReferralDashboard failed`, {
      referralCode: normalizedCode,
      error: formatUnknownError(error),
    });
    return null;
  }
}

export async function unlockReferralCommissionMode(
  referralCode: string,
  pin: string,
): Promise<ReferralCommissionUnlockResult> {
  try {
    const normalizedCode = referralCode.trim();
    if (!normalizedCode) return { ok: false, error: "Code not recognized." };

    const resolved = await resolveReferralIdentity(normalizedCode, {
      select: "id, name, referral_code, human_referral_code, cabal",
    });

    if (!resolved || !resolved.row.cabal) {
      return { ok: false, error: "Code not recognized." };
    }

    if (!verifyCommissionPin(resolved.canonicalCode, pin)) {
      return { ok: false, error: "Code not recognized." };
    }

    await setCommissionAccessCookie(resolved.canonicalCode);
    return { ok: true };
  } catch {
    return { ok: false, error: "Code not recognized." };
  }
}

export async function lockReferralCommissionMode(): Promise<ReferralCommissionModeResult> {
  try {
    await clearCommissionAccessCookie();
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not switch modes." };
  }
}

export async function unlockReferralTable(
  referralCode: string,
  pin: string,
): Promise<ReferralTableUnlockResult> {
  try {
    const normalizedCode = referralCode.trim();
    if (!normalizedCode) return { ok: false, error: "Code not recognized." };

    const resolved = await resolveReferralIdentity(normalizedCode, {
      select: "id, name, referral_code, human_referral_code",
    });

    if (!resolved) {
      return { ok: false, error: "Code not recognized." };
    }

    if (!verifyCommissionPin(resolved.canonicalCode, pin)) {
      return { ok: false, error: "Code not recognized." };
    }

    await setReferralTableAccessCookie(resolved.canonicalCode);
    return { ok: true };
  } catch {
    return { ok: false, error: "Code not recognized." };
  }
}

export async function requestReferralCommissionPin(
  referralCode: string,
  email: string,
): Promise<ReferralCommissionPinRequestResult> {
  try {
    const normalizedCode = referralCode.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedCode) return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
    if (!normalizedEmail) return { ok: false, error: "Enter the email address you used for early access." };

    const resolved = await resolveReferralIdentity(normalizedCode, {
      select: "id, name, email, referral_code, human_referral_code, access_pin_email_sent_at",
    });

    if (!resolved || !resolved.row.email || !resolved.row.referral_code) {
      return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
    }

    const storedEmail = String(resolved.row.email).trim().toLowerCase();
    if (storedEmail !== normalizedEmail) {
      return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
    }

    if (wasCommissionPinSentToday(resolved.row.access_pin_email_sent_at)) {
      return { ok: true, message: COMMISSION_PIN_RATE_LIMIT_MESSAGE };
    }

    const headerStore = await headers();
    const ensured = await ensureHumanReferralCode(resolved.row);
    await sendCommissionPinEmail({
      email: normalizedEmail,
      name: String(resolved.row.name || "there"),
      pin: getCommissionPin(ensured.canonicalCode),
      referralCode: ensured.preferredCode,
      baseUrl: resolveSiteUrl(headerStore),
    });

    const { error: updateError } = await db
      .from("zn_waitlist")
      .update({ access_pin_email_sent_at: new Date().toISOString() })
      .eq("referral_code", ensured.canonicalCode);

    if (updateError) {
      console.error("[leaders-commission-pin] sent_at update failed:", updateError);
    }

    return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
  } catch (error) {
    console.error("[leaders-commission-pin] request failed:", error);
    return { ok: false, error: "Could not send code right now." };
  }
}
