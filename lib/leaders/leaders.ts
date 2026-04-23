"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sendCommissionPinEmail } from "@/lib/email/commission-pin";
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
  type ReferralDashboardData,
  type WaitlistReferralRow,
} from "@/lib/leaders/referral-dashboard";

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
  referrals: number;
  indirectReferrals: number;
  attributedReferrals: number;
  recent: number;
  potential_rewards: number;
  streak: boolean;
  topRecent: boolean;
}

export interface RankingEntry {
  referral_code: string;
  name: string;
  count: number;
  payout: number;
}

export interface DailyRow {
  date: string;
  daily: [RankingEntry?, RankingEntry?, RankingEntry?];
  allTime: [RankingEntry?, RankingEntry?, RankingEntry?];
  topBadge?: "red" | "blue" | null;
}

export interface LeadersData {
  timeSeries: TimeSeriesPoint[];
  leaderboard: LeaderboardEntry[];
  dailyRankings: DailyRow[];
  stats: { waitlist: number; referred: number; rewardsPot: number };
}

export interface DailyNewNameEntry {
  name: string;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  email_verified: boolean;
}

export type ReferralScope = "all" | "confirmed";

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

function toWaitlistReferralRows(data: Record<string, unknown>[]): WaitlistReferralRow[] {
  return data
    .map((row) => ({
      name: (row.name as string | null) ?? "",
      referral_code: (row.referral_code as string | null) ?? "",
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

function resolveBaseUrl(headerStore: { get(name: string): string | null }): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const proto = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (host) return `${proto}://${host}`;
  return "https://zcashnames.com";
}

function wasCommissionPinSentToday(value: unknown): boolean {
  if (typeof value !== "string" || !value) return false;
  const sentAt = new Date(value).getTime();
  if (!Number.isFinite(sentAt)) return false;
  return Date.now() - sentAt < COMMISSION_PIN_RATE_LIMIT_MS;
}

function calculateRewardsPot(rows: WaitlistReferralRow[], scope: ReferralScope): number {
  const summaries = buildFixedDepthReferralSummaries(rows, scope);
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

function isNextDay(previousDate: string, nextDate: string): boolean {
  const previous = new Date(`${previousDate}T00:00:00.000Z`).getTime();
  const next = new Date(`${nextDate}T00:00:00.000Z`).getTime();
  return next - previous === 24 * 60 * 60 * 1000;
}

export async function getWaitlistStats(
  scope: ReferralScope = "all",
): Promise<{ waitlist: number; referred: number; rewardsPot: number }> {
  try {
    const { count: waitlistCount } = await db
      .from("zn_waitlist")
      .select("*", { count: "exact", head: true });

    let referredQuery = db
      .from("zn_waitlist")
      .select("*", { count: "exact", head: true })
      .not("referred_by", "is", null);

    if (scope === "confirmed") {
      referredQuery = referredQuery.eq("email_verified", true);
    }

    const { count: referredCount } = await referredQuery;

    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, referred_by, created_at, email_verified, cabal")
      .order("created_at", { ascending: true });

    if (error || !data) return { waitlist: 0, referred: 0, rewardsPot: 0 };

    const rows = toWaitlistReferralRows(data);
    const rewardsPot = calculateRewardsPot(rows, scope);

    return {
      waitlist: waitlistCount ?? 0,
      referred: referredCount ?? 0,
      rewardsPot,
    };
  } catch {
    return { waitlist: 0, referred: 0, rewardsPot: 0 };
  }
}

export async function getLeadersTimeSeries(
  scope: ReferralScope = "all",
): Promise<TimeSeriesPoint[]> {
  try {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, referred_by, created_at, email_verified, cabal")
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    const rows = toWaitlistReferralRows(data);
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
      total += 1;
      if (row.referral_code) cumulativeRows.push(row);

      const isCountedReferral =
        Boolean(row.referred_by) && (scope === "all" || row.email_verified);

      if (isCountedReferral) referred += 1;

      const rewardsPot = calculateRewardsPot(cumulativeRows, scope);

      if (date !== lastDate) {
        if (points.length > 0) {
          const top = resolveTopReferrer(dailyCounts, nameMap, previousTopCode);
          points[points.length - 1].topReferrer = top;
          previousTopCode = top?.code ?? null;
        }

        dailyCounts = {};
        points.push({ date, total, referred, nonReferred: total - referred, rewardsPot });
        lastDate = date;
      } else {
        points[points.length - 1] = { date, total, referred, nonReferred: total - referred, rewardsPot };
      }

      if (isCountedReferral) {
        const code = row.referred_by as string;
        dailyCounts[code] = (dailyCounts[code] || 0) + 1;
      }
    }

    if (points.length > 0) {
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
  } catch {
    return [];
  }
}

export async function getLeaderboard(
  scope: ReferralScope = "all",
): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, referred_by, created_at, email_verified, cabal")
      .order("created_at", { ascending: true });
    if (error || !data) return [];

    const rows = toWaitlistReferralRows(data);
    const summaries = buildFixedDepthReferralSummaries(rows, scope);

    const nameMap: Record<string, string> = {};
    for (const row of rows) {
      if (row.referral_code && row.name && !nameMap[row.referral_code]) {
        nameMap[row.referral_code] = row.name;
      }
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const cutoff = now.getTime() - 24 * 60 * 60 * 1000;

    const counts: Record<string, number> = {};
    const recentCounts: Record<string, number> = {};
    const todayCounts: Record<string, number> = {};
    const yesterdayCounts: Record<string, number> = {};

    for (const row of rows) {
      if (!row.referred_by) continue;
      if (scope === "confirmed" && !row.email_verified) continue;

      const code = row.referred_by;
      const date = row.created_at.slice(0, 10);

      counts[code] = (counts[code] || 0) + 1;

      if (new Date(row.created_at).getTime() >= cutoff) {
        recentCounts[code] = (recentCounts[code] || 0) + 1;
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
          referral_code,
          referrals,
          indirectReferrals,
          attributedReferrals: displayedReferrals,
          recent: recentCounts[referral_code] || 0,
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
        return a.referral_code.localeCompare(b.referral_code);
      })
      .map((entry, i) => ({ ...entry, rank: i + 1 }));
  } catch {
    return [];
  }
}

export async function getDailyRankings(scope: ReferralScope = "all"): Promise<DailyRow[]> {
  try {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("created_at, referral_code, referred_by, name, email_verified")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) return [];

    const nameMap: Record<string, string> = {};
    const dailyCountsByDate: Record<string, Record<string, number>> = {};
    const dates: string[] = [];
    const seenDates = new Set<string>();

    for (const row of data) {
      const date = (row.created_at as string).slice(0, 10);

      if (!seenDates.has(date)) {
        seenDates.add(date);
        dates.push(date);
      }

      const code = row.referral_code as string | null;
      const name = row.name as string | null;
      if (code && name && !nameMap[code]) {
        nameMap[code] = name;
      }

      const referredBy = row.referred_by as string | null;
      if (!referredBy) continue;
      if (scope === "confirmed" && !row.email_verified) continue;

      if (!dailyCountsByDate[date]) dailyCountsByDate[date] = {};
      dailyCountsByDate[date][referredBy] = (dailyCountsByDate[date][referredBy] || 0) + 1;
    }

    const cumulativeCounts: Record<string, number> = {};
    const rows: DailyRow[] = [];

    for (const date of dates) {
      const dailyCounts = dailyCountsByDate[date] || {};
      const dailyTop = buildTopThreeEntries(dailyCounts, nameMap);

      for (const [code, count] of Object.entries(dailyCounts)) {
        cumulativeCounts[code] = (cumulativeCounts[code] || 0) + count;
      }

      const allTimeTop = buildTopThreeEntries(cumulativeCounts, nameMap);

      rows.push({
        date,
        daily: dailyTop,
        allTime: allTimeTop,
      });
    }

    return rows;
  } catch {
    return [];
  }
}

export async function getLeadersData(scope: ReferralScope = "all"): Promise<LeadersData> {
  const [timeSeries, leaderboard, rows, stats] = await Promise.all([
    getLeadersTimeSeries(scope),
    getLeaderboard(scope),
    getDailyRankings(scope),
    getWaitlistStats(scope),
  ]);

  const dailyRankings: DailyRow[] = rows.map((row) => ({ ...row, topBadge: null }));

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
      previousTopCode === topEntry.referral_code &&
      previousDate !== null &&
      isNextDay(previousDate, row.date);

    currentStreak = continuesStreak ? currentStreak + 1 : 1;
    row.topBadge = currentStreak >= 2 ? "red" : "blue";

    previousDate = row.date;
    previousTopCode = topEntry.referral_code;
  }

  return { timeSeries, leaderboard, dailyRankings, stats };
}

export async function getDailyNewNames(date: string): Promise<DailyNewNameEntry[]> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
    const start = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) return [];
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, referred_by, created_at, email_verified")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: true });

    if (error || !data) return [];

    return data
      .map((row) => ({
        name: (row.name as string | null) ?? "",
        referral_code: (row.referral_code as string | null) ?? "",
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
  scope: ReferralScope = "all",
): Promise<ReferralDashboardData | null> {
  try {
    const normalizedCode = referralCode.trim();
    if (!normalizedCode) return null;

    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, referred_by, created_at, email_verified, cabal")
      .not("referral_code", "is", null)
      .order("created_at", { ascending: true });

    if (error || !data) return null;

    const rows = toWaitlistReferralRows(data);

    const dashboard = buildReferralDashboard(normalizedCode, rows, scope);
    const [commissionUnlocked, referralsUnlocked] = await Promise.all([
      dashboard.root?.cabal
        ? hasCommissionAccess(dashboard.referralCode).catch(() => false)
        : false,
      hasReferralTableAccess(dashboard.referralCode).catch(() => false),
    ]);

    return { ...dashboard, commissionUnlocked, referralsUnlocked };
  } catch {
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

    const { data, error } = await db
      .from("zn_waitlist")
      .select("referral_code, cabal")
      .eq("referral_code", normalizedCode)
      .maybeSingle();

    if (error || !data || !data.cabal) {
      return { ok: false, error: "Code not recognized." };
    }

    if (!verifyCommissionPin(normalizedCode, pin)) {
      return { ok: false, error: "Code not recognized." };
    }

    await setCommissionAccessCookie(normalizedCode);
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

    const { data, error } = await db
      .from("zn_waitlist")
      .select("referral_code")
      .eq("referral_code", normalizedCode)
      .maybeSingle();

    if (error || !data?.referral_code) {
      return { ok: false, error: "Code not recognized." };
    }

    if (!verifyCommissionPin(normalizedCode, pin)) {
      return { ok: false, error: "Code not recognized." };
    }

    await setReferralTableAccessCookie(normalizedCode);
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

    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, email, referral_code, access_pin_email_sent_at")
      .eq("referral_code", normalizedCode)
      .maybeSingle();

    if (error) {
      console.error("[leaders-commission-pin] waitlist lookup failed:", error);
      return { ok: false, error: "Could not send code right now." };
    }

    if (!data || !data.email || !data.referral_code) {
      return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
    }

    const storedEmail = String(data.email).trim().toLowerCase();
    if (storedEmail !== normalizedEmail) {
      return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
    }

    if (wasCommissionPinSentToday(data.access_pin_email_sent_at)) {
      return { ok: true, message: COMMISSION_PIN_RATE_LIMIT_MESSAGE };
    }

    const headerStore = await headers();
    await sendCommissionPinEmail({
      email: normalizedEmail,
      name: String(data.name || "there"),
      pin: getCommissionPin(String(data.referral_code)),
      referralCode: String(data.referral_code),
      baseUrl: resolveBaseUrl(headerStore),
    });

    const { error: updateError } = await db
      .from("zn_waitlist")
      .update({ access_pin_email_sent_at: new Date().toISOString() })
      .eq("referral_code", normalizedCode);

    if (updateError) {
      console.error("[leaders-commission-pin] sent_at update failed:", updateError);
    }

    return { ok: true, message: COMMISSION_PIN_SENT_MESSAGE };
  } catch (error) {
    console.error("[leaders-commission-pin] request failed:", error);
    return { ok: false, error: "Could not send code right now." };
  }
}
