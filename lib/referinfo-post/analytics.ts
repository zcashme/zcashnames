import "server-only";

import { db } from "@/lib/db";
import type {
  ReferinfoCaptionPolicy,
  ReferinfoPostKind,
  ReferinfoPostTable,
  ReferinfoReportWindow,
} from "@/lib/referinfo-post/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WAITLIST_PAGE_SIZE = 1000;

type WaitlistRow = {
  name: string;
  referralCode: string;
  displayCode: string;
  referredBy: string | null;
  createdAt: string;
  createdAtMs: number;
  emailVerified: boolean;
};

type ReferralSummary = {
  referralCode: string;
  directReferrals: number;
  indirectReferrals: number;
  attributedReferrals: number;
  potentialRewards: number;
  firstDirectReferralAtMs: number | null;
};

type RewardRankEntry = {
  rank: number;
  referralCode: string;
  displayCode: string;
  name: string;
  directReferrals: number;
  indirectReferrals: number;
  attributedReferrals: number;
  potentialRewards: number;
};

type WindowMetrics = {
  directWeekly: number;
  indirectWeekly: number;
  attributedWeekly: number;
  depth2Weekly: number;
  depth3Weekly: number;
  depth4PlusWeekly: number;
  directRewardWeekly: number;
  indirectRewardWeekly: number;
};

type LeaderComparison = {
  period: "all-time" | "monthly" | "weekly";
  currentLeader: string;
  currentDisplayCode: string;
  previousDisplayCode: string | null;
  changed: boolean;
  totalRewards: number | null;
};

type DraftPost = {
  kind: ReferinfoPostKind;
  order: number;
  title: string;
  subtitle: string;
  caption: string;
  configSummary: string;
  metricsSummary: string;
  table: ReferinfoPostTable;
};

export type ReferinfoDraftBundle = {
  reportWindow: ReferinfoReportWindow;
  thread: {
    rootKind: ReferinfoCaptionPolicy["rootKind"];
    xThreadMode: ReferinfoCaptionPolicy["xThreadMode"];
    telegramDeliveryMode: ReferinfoCaptionPolicy["telegramDeliveryMode"];
  };
  posts: DraftPost[];
};

function fail(message: string): never {
  throw new Error(message);
}

function roundZec(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function fixedRewardForDepth(depth: number): number {
  if (depth <= 0) return 0;
  return 0.05 / 2 ** (depth - 1);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRangeLabel(start: Date, endExclusive: Date): string {
  const inclusiveEnd = new Date(endExclusive.getTime() - DAY_MS);
  const startMonth = start.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = inclusiveEnd.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const startDay = start.getUTCDate();
  const endDay = inclusiveEnd.getUTCDate();
  const endYear = inclusiveEnd.getUTCFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${endYear}`;
  }

  return `${startMonth} ${startDay}-${endMonth} ${endDay}, ${endYear}`;
}

function formatInteger(value: number): string {
  return value.toLocaleString("en-US");
}

function formatSignedInteger(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toLocaleString("en-US")}`;
}

function formatZec(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function formatZecDelta(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

function projectedRewardsNote(): string {
  return "Rewards are projected. See terms.";
}

function indirectReferralNote(): string {
  return "Indirect referrals are second-order-or-deeper referrals.";
}

function emptyWindowMetrics(): WindowMetrics {
  return {
    directWeekly: 0,
    indirectWeekly: 0,
    attributedWeekly: 0,
    depth2Weekly: 0,
    depth3Weekly: 0,
    depth4PlusWeekly: 0,
    directRewardWeekly: 0,
    indirectRewardWeekly: 0,
  };
}

function buildConfigSummary(args: {
  policy: ReferinfoCaptionPolicy;
  kind: ReferinfoPostKind;
  order: number;
}): string {
  return `Order ${args.order + 1}/${args.policy.postOrder.length}; root ${args.policy.rootKind}; X thread ${args.policy.xThreadMode}; Telegram ${args.policy.telegramDeliveryMode}; template ${args.kind}`;
}

function interpolateTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => tokens[key] ?? "");
}

function formatCaptionParagraphs(caption: string): string {
  return caption
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([.!?])\s+(?=[A-Z])/g, "$1\n\n");
}

function normalizeCaptionCashtags(caption: string): string {
  let cashtagCount = 0;
  return caption.replace(/\$([A-Za-z][A-Za-z0-9]{0,9})/g, (_, symbol: string) => {
    cashtagCount += 1;
    return cashtagCount === 1 ? `$${symbol}` : symbol;
  });
}

function toDatePartsInZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    second: Number(read("second")),
    weekday: weekdayMap[read("weekday")] ?? 0,
    dateKey: `${read("year")}-${read("month")}-${read("day")}`,
  };
}

function zonedDateTimeToUtc(args: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  timeZone: string;
}): Date {
  const targetUtc = Date.UTC(
    args.year,
    args.month - 1,
    args.day,
    args.hour ?? 0,
    args.minute ?? 0,
    args.second ?? 0,
  );

  let guess = targetUtc;
  for (let index = 0; index < 3; index += 1) {
    const parts = toDatePartsInZone(new Date(guess), args.timeZone);
    const observedUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const offset = observedUtc - guess;
    guess = targetUtc - offset;
  }

  return new Date(guess);
}

function addDaysPlainDate(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

export function buildReferinfoReportWindow(now: Date, timeZone: string): ReferinfoReportWindow {
  const current = toDatePartsInZone(now, timeZone);
  const localTodayPlain = new Date(Date.UTC(current.year, current.month - 1, current.day));
  const daysSinceMonday = (current.weekday + 6) % 7;
  const currentWeekStartPlain = addDaysPlainDate(localTodayPlain, -daysSinceMonday);
  const targetWeekStartPlain = addDaysPlainDate(currentWeekStartPlain, -7);
  const targetWeekEndPlain = currentWeekStartPlain;
  const prevWeekStartPlain = addDaysPlainDate(targetWeekStartPlain, -7);
  const prevWeekEndPlain = targetWeekStartPlain;
  const finalDayPlain = addDaysPlainDate(targetWeekEndPlain, -1);
  const priorDayPlain = addDaysPlainDate(finalDayPlain, -1);

  const weekStart = zonedDateTimeToUtc({
    year: targetWeekStartPlain.getUTCFullYear(),
    month: targetWeekStartPlain.getUTCMonth() + 1,
    day: targetWeekStartPlain.getUTCDate(),
    timeZone,
  });
  const weekEnd = zonedDateTimeToUtc({
    year: targetWeekEndPlain.getUTCFullYear(),
    month: targetWeekEndPlain.getUTCMonth() + 1,
    day: targetWeekEndPlain.getUTCDate(),
    timeZone,
  });
  const prevWeekStart = zonedDateTimeToUtc({
    year: prevWeekStartPlain.getUTCFullYear(),
    month: prevWeekStartPlain.getUTCMonth() + 1,
    day: prevWeekStartPlain.getUTCDate(),
    timeZone,
  });
  const prevWeekEnd = zonedDateTimeToUtc({
    year: prevWeekEndPlain.getUTCFullYear(),
    month: prevWeekEndPlain.getUTCMonth() + 1,
    day: prevWeekEndPlain.getUTCDate(),
    timeZone,
  });

  return {
    timeZone,
    weekStartIso: weekStart.toISOString(),
    weekEndIso: weekEnd.toISOString(),
    prevWeekStartIso: prevWeekStart.toISOString(),
    prevWeekEndIso: prevWeekEnd.toISOString(),
    weekLabel: formatRangeLabel(targetWeekStartPlain, targetWeekEndPlain),
    prevWeekLabel: formatRangeLabel(prevWeekStartPlain, prevWeekEndPlain),
    finalDayLabel: formatShortDate(finalDayPlain),
    priorDayLabel: formatShortDate(priorDayPlain),
    finalDayDateKey: `${finalDayPlain.getUTCFullYear()}-${String(finalDayPlain.getUTCMonth() + 1).padStart(2, "0")}-${String(finalDayPlain.getUTCDate()).padStart(2, "0")}`,
    priorDayDateKey: `${priorDayPlain.getUTCFullYear()}-${String(priorDayPlain.getUTCMonth() + 1).padStart(2, "0")}-${String(priorDayPlain.getUTCDate()).padStart(2, "0")}`,
  };
}

async function fetchVerifiedWaitlistRows(): Promise<WaitlistRow[]> {
  const rows: WaitlistRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("name, referral_code, human_referral_code, referred_by, created_at, email_verified")
      .eq("email_verified", true)
      .order("created_at", { ascending: true })
      .range(offset, offset + WAITLIST_PAGE_SIZE - 1);

    if (error) {
      fail(`Supabase connection failure while fetching public.zn_waitlist: ${error.message}`);
    }

    const page = ((data ?? []) as Array<Record<string, unknown>>)
      .map((row): WaitlistRow | null => {
        const referralCode = typeof row.referral_code === "string" ? row.referral_code.trim() : "";
        const createdAt = typeof row.created_at === "string" ? row.created_at : "";
        const createdAtMs = new Date(createdAt).getTime();
        if (!referralCode || !createdAt || !Number.isFinite(createdAtMs)) return null;
        const humanCode = typeof row.human_referral_code === "string" && row.human_referral_code.trim()
          ? row.human_referral_code.trim()
          : null;
        return {
          name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : referralCode,
          referralCode,
          displayCode: humanCode ?? referralCode,
          referredBy: typeof row.referred_by === "string" && row.referred_by.trim() ? row.referred_by.trim() : null,
          createdAt,
          createdAtMs,
          emailVerified: Boolean(row.email_verified),
        };
      })
      .filter((row): row is WaitlistRow => !!row);

    rows.push(...page);

    if ((data ?? []).length < WAITLIST_PAGE_SIZE) break;
    offset += WAITLIST_PAGE_SIZE;
  }

  return rows;
}

function buildIdentityMaps(rows: WaitlistRow[]) {
  const nameMap: Record<string, string> = {};
  const displayCodeMap: Record<string, string> = {};
  for (const row of rows) {
    if (!nameMap[row.referralCode]) nameMap[row.referralCode] = row.name;
    if (!displayCodeMap[row.referralCode]) displayCodeMap[row.referralCode] = row.displayCode;
  }
  return { nameMap, displayCodeMap };
}

function buildReferralSummaries(rows: WaitlistRow[]): Map<string, ReferralSummary> {
  const childrenByParent = new Map<string, WaitlistRow[]>();
  const candidateCodes = new Set<string>();

  for (const row of rows) {
    candidateCodes.add(row.referralCode);
    if (!row.referredBy) continue;
    candidateCodes.add(row.referredBy);
    const children = childrenByParent.get(row.referredBy) ?? [];
    children.push(row);
    childrenByParent.set(row.referredBy, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  const summaries = new Map<string, ReferralSummary>();

  for (const referralCode of candidateCodes) {
    const directChildren = childrenByParent.get(referralCode) ?? [];
    const queue: Array<{ row: WaitlistRow; depth: number; path: Set<string> }> = directChildren.map((row) => ({
      row,
      depth: 1,
      path: new Set([referralCode]),
    }));
    const visited = new Set<string>();
    let attributedReferrals = 0;
    let potentialRewards = 0;

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      if (visited.has(next.row.referralCode) || next.path.has(next.row.referralCode)) continue;
      visited.add(next.row.referralCode);
      attributedReferrals += 1;
      potentialRewards += fixedRewardForDepth(next.depth);

      const childPath = new Set(next.path);
      childPath.add(next.row.referralCode);
      for (const child of childrenByParent.get(next.row.referralCode) ?? []) {
        queue.push({ row: child, depth: next.depth + 1, path: childPath });
      }
    }

    summaries.set(referralCode, {
      referralCode,
      directReferrals: directChildren.length,
      indirectReferrals: Math.max(0, attributedReferrals - directChildren.length),
      attributedReferrals,
      potentialRewards: roundZec(potentialRewards),
      firstDirectReferralAtMs: directChildren[0]?.createdAtMs ?? null,
    });
  }

  return summaries;
}

function buildRewardRanking(rows: WaitlistRow[]): RewardRankEntry[] {
  const { nameMap, displayCodeMap } = buildIdentityMaps(rows);
  const summaries = buildReferralSummaries(rows);

  return Array.from(summaries.values())
    .filter((summary) => summary.directReferrals > 0)
    .map((summary) => ({
      rank: 0,
      referralCode: summary.referralCode,
      displayCode: displayCodeMap[summary.referralCode] ?? summary.referralCode,
      name: nameMap[summary.referralCode] ?? summary.referralCode,
      directReferrals: summary.directReferrals,
      indirectReferrals: summary.indirectReferrals,
      attributedReferrals: summary.attributedReferrals,
      potentialRewards: summary.potentialRewards,
    }))
    .sort((a, b) => {
      if (b.potentialRewards !== a.potentialRewards) return b.potentialRewards - a.potentialRewards;
      if (b.directReferrals !== a.directReferrals) return b.directReferrals - a.directReferrals;
      if (b.attributedReferrals !== a.attributedReferrals) return b.attributedReferrals - a.attributedReferrals;
      return a.referralCode.localeCompare(b.referralCode);
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function buildWindowMetrics(snapshotRows: WaitlistRow[], windowStartMs: number, windowEndMs: number): Map<string, WindowMetrics> {
  const childrenByParent = new Map<string, WaitlistRow[]>();
  const candidateCodes = new Set<string>();

  for (const row of snapshotRows) {
    candidateCodes.add(row.referralCode);
    if (!row.referredBy) continue;
    candidateCodes.add(row.referredBy);
    const children = childrenByParent.get(row.referredBy) ?? [];
    children.push(row);
    childrenByParent.set(row.referredBy, children);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.createdAtMs - b.createdAtMs);
  }

  const metrics = new Map<string, WindowMetrics>();

  for (const referralCode of candidateCodes) {
    const queue: Array<{ row: WaitlistRow; depth: number; path: Set<string> }> = (childrenByParent.get(referralCode) ?? []).map((row) => ({
      row,
      depth: 1,
      path: new Set([referralCode]),
    }));
    const visited = new Set<string>();
    let directWeekly = 0;
    let indirectWeekly = 0;
    let attributedWeekly = 0;
    let depth2Weekly = 0;
    let depth3Weekly = 0;
    let depth4PlusWeekly = 0;
    let directRewardWeekly = 0;
    let indirectRewardWeekly = 0;

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      if (visited.has(next.row.referralCode) || next.path.has(next.row.referralCode)) continue;
      visited.add(next.row.referralCode);

      if (next.row.createdAtMs >= windowStartMs && next.row.createdAtMs < windowEndMs) {
        const reward = fixedRewardForDepth(next.depth);
        attributedWeekly += 1;
        if (next.depth === 1) {
          directWeekly += 1;
          directRewardWeekly += reward;
        } else {
          indirectWeekly += 1;
          indirectRewardWeekly += reward;
          if (next.depth === 2) depth2Weekly += 1;
          else if (next.depth === 3) depth3Weekly += 1;
          else depth4PlusWeekly += 1;
        }
      }

      const childPath = new Set(next.path);
      childPath.add(next.row.referralCode);
      for (const child of childrenByParent.get(next.row.referralCode) ?? []) {
        queue.push({ row: child, depth: next.depth + 1, path: childPath });
      }
    }

    metrics.set(referralCode, {
      directWeekly,
      indirectWeekly,
      attributedWeekly,
      depth2Weekly,
      depth3Weekly,
      depth4PlusWeekly,
      directRewardWeekly: roundZec(directRewardWeekly),
      indirectRewardWeekly: roundZec(indirectRewardWeekly),
    });
  }

  return metrics;
}

function buildDirectCountsForLocalDates(rows: WaitlistRow[], timeZone: string): Map<string, Map<string, number>> {
  const counts = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.referredBy) continue;
    const dateKey = toDatePartsInZone(new Date(row.createdAtMs), timeZone).dateKey;
    const dateCounts = counts.get(dateKey) ?? new Map<string, number>();
    dateCounts.set(row.referredBy, (dateCounts.get(row.referredBy) ?? 0) + 1);
    counts.set(dateKey, dateCounts);
  }
  return counts;
}

function winnerFromCounts(counts: Map<string, number> | undefined): { referralCode: string; count: number } | null {
  if (!counts || counts.size === 0) return null;
  return [...counts.entries()]
    .sort(([codeA, countA], [codeB, countB]) => {
      if (countB !== countA) return countB - countA;
      return codeA.localeCompare(codeB);
    })
    .map(([referralCode, count]) => ({ referralCode, count }))[0] ?? null;
}

function buildLeaderChanges(args: {
  rankingCurrent: RewardRankEntry[];
  rankingPrevious: RewardRankEntry[];
  currentMonthMetrics: Map<string, WindowMetrics>;
  previousMonthMetrics: Map<string, WindowMetrics>;
  targetWeekMetrics: Map<string, WindowMetrics>;
  previousWeekMetrics: Map<string, WindowMetrics>;
  displayCodeMap: Record<string, string>;
  rewardDeltaMap: Map<string, number>;
  reportWindow: ReferinfoReportWindow;
}): {
  rows: LeaderComparison[];
  caption: string;
  metricsSummary: string;
} {
  const rewardCurrentByCode = new Map(args.rankingCurrent.map((entry) => [entry.referralCode, entry]));
  const weeklyCurrent = [...args.targetWeekMetrics.entries()]
    .sort(([codeA, metricsA], [codeB, metricsB]) => {
      if (metricsB.directWeekly !== metricsA.directWeekly) return metricsB.directWeekly - metricsA.directWeekly;
      return codeA.localeCompare(codeB);
    })[0] ?? null;
  const weeklyPrevious = [...args.previousWeekMetrics.entries()]
    .sort(([codeA, metricsA], [codeB, metricsB]) => {
      if (metricsB.directWeekly !== metricsA.directWeekly) return metricsB.directWeekly - metricsA.directWeekly;
      return codeA.localeCompare(codeB);
    })[0] ?? null;

  const monthlyCurrent = [...args.currentMonthMetrics.entries()]
    .sort(([codeA, metricsA], [codeB, metricsB]) => {
      if (metricsB.directWeekly !== metricsA.directWeekly) return metricsB.directWeekly - metricsA.directWeekly;
      return codeA.localeCompare(codeB);
    })[0] ?? null;
  const monthlyPrevious = [...args.previousMonthMetrics.entries()]
    .sort(([codeA, metricsA], [codeB, metricsB]) => {
      if (metricsB.directWeekly !== metricsA.directWeekly) return metricsB.directWeekly - metricsA.directWeekly;
      return codeA.localeCompare(codeB);
    })[0] ?? null;

  const allTimeCurrent = args.rankingCurrent[0] ?? null;
  const allTimePrevious = args.rankingPrevious[0] ?? null;

  const rows: LeaderComparison[] = [
    {
      period: "all-time",
      currentLeader: allTimeCurrent?.name ?? "No leader",
      currentDisplayCode: allTimeCurrent?.displayCode ?? "N/A",
      previousDisplayCode: allTimePrevious?.displayCode ?? null,
      changed: !!allTimeCurrent && !!allTimePrevious && allTimeCurrent.referralCode !== allTimePrevious.referralCode,
      totalRewards: allTimeCurrent?.potentialRewards ?? null,
    },
    {
      period: "monthly",
      currentLeader: monthlyCurrent ? args.displayCodeMap[monthlyCurrent[0]] ?? monthlyCurrent[0] : "No leader",
      currentDisplayCode: monthlyCurrent ? args.displayCodeMap[monthlyCurrent[0]] ?? monthlyCurrent[0] : "N/A",
      previousDisplayCode: monthlyPrevious ? args.displayCodeMap[monthlyPrevious[0]] ?? monthlyPrevious[0] : null,
      changed: !!monthlyCurrent && !!monthlyPrevious && monthlyCurrent[0] !== monthlyPrevious[0],
      totalRewards: monthlyCurrent ? rewardCurrentByCode.get(monthlyCurrent[0])?.potentialRewards ?? null : null,
    },
    {
      period: "weekly",
      currentLeader: weeklyCurrent ? args.displayCodeMap[weeklyCurrent[0]] ?? weeklyCurrent[0] : "No leader",
      currentDisplayCode: weeklyCurrent ? args.displayCodeMap[weeklyCurrent[0]] ?? weeklyCurrent[0] : "N/A",
      previousDisplayCode: weeklyPrevious ? args.displayCodeMap[weeklyPrevious[0]] ?? weeklyPrevious[0] : null,
      changed: !!weeklyCurrent && !!weeklyPrevious && weeklyCurrent[0] !== weeklyPrevious[0],
      totalRewards: weeklyCurrent ? rewardCurrentByCode.get(weeklyCurrent[0])?.potentialRewards ?? null : null,
    },
  ];

  const captionParts: string[] = [];
  if (rows[0].changed && allTimeCurrent) {
    captionParts.push(
      `${rows[0].currentLeader} took the all-time rewards lead from ${rows[0].previousDisplayCode ?? "nobody"} at ${formatZec(allTimeCurrent.potentialRewards)} $ZEC.`,
    );
  }
  if (rows[1].changed && monthlyCurrent) {
    captionParts.push(
      `${rows[1].currentLeader} took the monthly lead from ${rows[1].previousDisplayCode ?? "nobody"} with ${formatInteger(monthlyCurrent[1].directWeekly)} direct referrals and ${formatZec(rows[1].totalRewards ?? 0)} $ZEC in projected rewards.`,
    );
  }
  if (rows[2].changed && weeklyCurrent) {
    captionParts.push(
      `${rows[2].currentLeader} took the weekly lead from ${rows[2].previousDisplayCode ?? "nobody"}, finishing with ${formatInteger(weeklyCurrent[1].directWeekly)} direct referrals and ${formatZec(rows[2].totalRewards ?? 0)} $ZEC in projected rewards.`,
    );
  }

  const caption = captionParts.length > 0
    ? captionParts.join(" ")
    : `${rows[0].currentLeader} held every tracked lead through ${args.reportWindow.weekLabel}.`;

  return {
    rows,
    caption,
    metricsSummary: rows
      .map((row) => `${row.period}: ${row.currentDisplayCode} | prev ${row.previousDisplayCode ?? "none"} | ${row.totalRewards != null ? `${formatZec(row.totalRewards)} $ZEC` : "N/A"}`)
      .join(" ; "),
  };
}

function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return "";
  if (clauses.length === 1) return clauses[0] ?? "";
  if (clauses.length === 2) return `${clauses[0]} and ${clauses[1]}`;
  return `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
}

function buildSummaryTop10Caption(args: {
  weekLabel: string;
  allTimeLeader: RewardRankEntry | null;
  topMoverDisplayCode: string | null;
  topNewcomerDisplayCode: string | null;
  weeklyLeaderChanged: boolean;
  weeklyLeaderDisplayCode: string | null;
}): string {
  const opener = args.allTimeLeader
    ? `${args.allTimeLeader.displayCode} still leads the all-time rewards board at ${formatZec(args.allTimeLeader.potentialRewards)} $ZEC for making ${formatInteger(args.allTimeLeader.attributedReferrals)} referrals (${formatInteger(args.allTimeLeader.directReferrals)} direct and ${formatInteger(args.allTimeLeader.indirectReferrals)} indirect)`
    : "The all-time rewards board is below";

  const actionClauses: string[] = [];
  if (args.topMoverDisplayCode) actionClauses.push(`${args.topMoverDisplayCode} made the biggest move`);
  if (args.topNewcomerDisplayCode) actionClauses.push(`${args.topNewcomerDisplayCode} broke out among newcomers`);
  if (args.weeklyLeaderChanged) actionClauses.push("the weekly lead changed hands");
  else if (args.weeklyLeaderDisplayCode) actionClauses.push(`${args.weeklyLeaderDisplayCode} held the weekly lead`);

  const middle = actionClauses.length > 0
    ? `${opener}, but there was much more action this week: ${joinClauses(actionClauses)}.`
    : `${opener}.`;

  return `${middle} More below.`;
}

function fallbackTopNewcomersTable(weekLabel: string): ReferinfoPostTable {
  return {
    columns: [
      { key: "rank", label: "Rank" },
      { key: "name", label: "Zcash name" },
      { key: "direct", label: "I" },
      { key: "indirect", label: "II+" },
      { key: "metric", label: "\u03A3" },
      { key: "change", label: "\u0394" },
      { key: "reward", label: "Δ ZEC" },
      { key: "total", label: "\u03A3 ZEC" },
    ],
    rows: [{ key: "none", cells: ["-", "No new referrers", "0", "0", "0", "0", "0.0000", "0.0"] }],
    note: projectedRewardsNote(),
  };
}

function fallbackTopIndirectTable(weekLabel: string): ReferinfoPostTable {
  return {
    columns: [
      { key: "rank", label: "Rank" },
      { key: "name", label: "Zcash name" },
      { key: "depth2", label: "II" },
      { key: "depth3", label: "III" },
      { key: "depth4plus", label: "IV" },
      { key: "metric", label: "\u03A3" },
      { key: "reward", label: "Δ ZEC" },
      { key: "total", label: "\u03A3 ZEC" },
    ],
    rows: [{ key: "none", cells: ["-", "No indirect momentum", "0", "0", "0", "0", "0.0000", "0.0"] }],
    note: indirectReferralNote(),
  };
}

function pickTemplate(policy: ReferinfoCaptionPolicy, kind: ReferinfoPostKind) {
  const template = policy.templates[kind];
  if (!template) fail(`Referinfo caption policy is missing template config for ${kind}.`);
  return template;
}

export async function buildReferinfoDraftBundle(args: {
  policy: ReferinfoCaptionPolicy;
  now?: Date;
  timeZone?: string;
}): Promise<ReferinfoDraftBundle> {
  const timeZone = args.timeZone ?? "America/New_York";
  const reportWindow = buildReferinfoReportWindow(args.now ?? new Date(), timeZone);
  const weekStartMs = new Date(reportWindow.weekStartIso).getTime();
  const weekEndMs = new Date(reportWindow.weekEndIso).getTime();
  const prevWeekStartMs = new Date(reportWindow.prevWeekStartIso).getTime();
  const prevWeekEndMs = new Date(reportWindow.prevWeekEndIso).getTime();
  const monthWindowStartMs = weekEndMs - 30 * DAY_MS;
  const prevMonthWindowStartMs = monthWindowStartMs - 30 * DAY_MS;

  const rows = await fetchVerifiedWaitlistRows();
  const { nameMap, displayCodeMap } = buildIdentityMaps(rows);
  const rowsAtWeekEnd = rows.filter((row) => row.createdAtMs < weekEndMs);
  const rowsAtPrevWeekEnd = rows.filter((row) => row.createdAtMs < prevWeekEndMs);
  const rankingCurrent = buildRewardRanking(rowsAtWeekEnd);
  const rankingPrevious = buildRewardRanking(rowsAtPrevWeekEnd);
  const currentSummaryMap = buildReferralSummaries(rowsAtWeekEnd);
  const targetWeekMetrics = buildWindowMetrics(rowsAtWeekEnd, weekStartMs, weekEndMs);
  const previousWeekMetrics = buildWindowMetrics(rowsAtPrevWeekEnd, prevWeekStartMs, prevWeekEndMs);
  const currentMonthMetrics = buildWindowMetrics(rowsAtWeekEnd, monthWindowStartMs, weekEndMs);
  const previousMonthMetrics = buildWindowMetrics(rowsAtWeekEnd, prevMonthWindowStartMs, monthWindowStartMs);
  const rewardDeltaMap = new Map<string, number>();
  for (const current of rankingCurrent) {
    const previous = rankingPrevious.find((entry) => entry.referralCode === current.referralCode);
    rewardDeltaMap.set(current.referralCode, roundZec(current.potentialRewards - (previous?.potentialRewards ?? 0)));
  }

  const leaderChanges = buildLeaderChanges({
    rankingCurrent,
    rankingPrevious,
    currentMonthMetrics,
    previousMonthMetrics,
    targetWeekMetrics,
    previousWeekMetrics,
    displayCodeMap,
    rewardDeltaMap,
    reportWindow,
  });

  const posts: DraftPost[] = [];
  const top10Template = pickTemplate(args.policy, "summary_top10");
  const top10Rows = rankingCurrent.slice(0, 10);
  posts.push({
    kind: "summary_top10",
    order: 0,
    title: top10Template.title,
    subtitle: top10Template.subtitle,
    caption: interpolateTemplate(top10Template.captionTemplate, {
      weekLabel: reportWindow.weekLabel,
    }).trim(),
    configSummary: buildConfigSummary({ policy: args.policy, kind: "summary_top10", order: 0 }),
    metricsSummary: top10Rows[0]
      ? `Leader: ${top10Rows[0].name} (${top10Rows[0].displayCode}) at ${formatZec(top10Rows[0].potentialRewards)} $ZEC`
      : "No ranked rows available.",
    table: {
      columns: [
        { key: "rank", label: "Rank" },
        { key: "name", label: "Zcash name" },
        { key: "direct", label: "I" },
        { key: "indirect", label: "II+" },
        { key: "rewards", label: "∑ ZEC" },
      ],
      rows: top10Rows.length > 0
        ? top10Rows.map((entry) => ({
            key: entry.referralCode,
            cells: [
              String(entry.rank),
              entry.displayCode,
              formatInteger(entry.directReferrals),
              formatInteger(entry.indirectReferrals),
              formatZec(entry.potentialRewards),
            ],
          }))
        : [{ key: "empty", cells: ["-", "No ranked rows", "-", "-", "-"] }],
      note: projectedRewardsNote(),
    },
  });

  const moverCandidates = rankingCurrent
    .map((entry) => {
      const currentMetrics = targetWeekMetrics.get(entry.referralCode) ?? emptyWindowMetrics();
      const previousMetrics = previousWeekMetrics.get(entry.referralCode) ?? emptyWindowMetrics();
      return {
        ...entry,
        currentMetrics,
        previousMetrics,
        directDelta: currentMetrics.directWeekly - previousMetrics.directWeekly,
        indirectDelta: currentMetrics.indirectWeekly - previousMetrics.indirectWeekly,
        delta: currentMetrics.attributedWeekly - previousMetrics.attributedWeekly,
        rewardDelta: rewardDeltaMap.get(entry.referralCode) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta;
      if (b.currentMetrics.attributedWeekly !== a.currentMetrics.attributedWeekly) {
        return b.currentMetrics.attributedWeekly - a.currentMetrics.attributedWeekly;
      }
      if (b.rewardDelta !== a.rewardDelta) return b.rewardDelta - a.rewardDelta;
      if (b.potentialRewards !== a.potentialRewards) return b.potentialRewards - a.potentialRewards;
      return a.referralCode.localeCompare(b.referralCode);
    });
  const topMover = moverCandidates[0] ?? null;
  const moversTemplate = pickTemplate(args.policy, "top_movers");
  const moverCaption = topMover
    ? interpolateTemplate(moversTemplate.captionTemplate, {
        name: topMover.name,
        delta: formatSignedInteger(topMover.delta),
        rewardDelta: formatZecDelta(topMover.rewardDelta),
      }).trim()
    : "No mover data available for the completed week.";
  posts.push({
    kind: "top_movers",
    order: 1,
    title: moversTemplate.title,
    subtitle: moversTemplate.subtitle,
    caption: moverCaption,
    configSummary: buildConfigSummary({ policy: args.policy, kind: "top_movers", order: 1 }),
    metricsSummary: topMover
      ? `${topMover.displayCode}: ${formatSignedInteger(topMover.delta)} referrals vs prior week; ${formatZecDelta(topMover.rewardDelta)} $ZEC`
      : "No mover metrics available.",
    table: {
      columns: [
        { key: "rank", label: "Rank" },
        { key: "name", label: "Zcash name" },
        { key: "direct", label: "I" },
        { key: "indirect", label: "II+" },
        { key: "metric", label: "\u03A3" },
        { key: "change", label: "\u0394" },
        { key: "reward", label: "\u0394 ZEC" },
        { key: "total", label: "\u03A3 ZEC" },
      ],
      rows: moverCandidates.length > 0
        ? moverCandidates.slice(0, 5).map((entry, index) => ({
            key: entry.referralCode,
            cells: [
              String(index + 1),
              entry.displayCode,
              formatInteger(entry.currentMetrics.directWeekly),
              formatInteger(entry.currentMetrics.indirectWeekly),
              formatInteger(entry.currentMetrics.attributedWeekly),
              formatSignedInteger(entry.delta),
              formatZecDelta(entry.rewardDelta),
              formatZec(entry.potentialRewards),
            ],
          }))
        : [{ key: "empty", cells: ["-", "No mover data", "0", "0", "0", "0", "0.0000", "0.0"] }],
      note: `Previous: ${reportWindow.prevWeekLabel}`,
    },
  });

  const newcomerCandidates = Array.from(currentSummaryMap.values())
    .filter((summary) => summary.firstDirectReferralAtMs != null && summary.firstDirectReferralAtMs >= weekStartMs && summary.firstDirectReferralAtMs < weekEndMs)
    .map((summary) => {
      const metrics = targetWeekMetrics.get(summary.referralCode) ?? emptyWindowMetrics();
      const previousMetrics = previousWeekMetrics.get(summary.referralCode) ?? emptyWindowMetrics();
      return {
        summary,
        metrics,
        previousMetrics,
        delta: metrics.attributedWeekly - previousMetrics.attributedWeekly,
        rewardDelta: rewardDeltaMap.get(summary.referralCode) ?? 0,
      };
    })
    .sort((a, b) => {
      if (b.metrics.attributedWeekly !== a.metrics.attributedWeekly) return b.metrics.attributedWeekly - a.metrics.attributedWeekly;
      if (b.metrics.directWeekly !== a.metrics.directWeekly) return b.metrics.directWeekly - a.metrics.directWeekly;
      if (b.rewardDelta !== a.rewardDelta) return b.rewardDelta - a.rewardDelta;
      return a.summary.referralCode.localeCompare(b.summary.referralCode);
    });
  const topNewcomer = newcomerCandidates[0] ?? null;
  const newcomersTemplate = pickTemplate(args.policy, "top_newcomers");
  posts.push({
    kind: "top_newcomers",
    order: 2,
    title: newcomersTemplate.title,
    subtitle: newcomersTemplate.subtitle,
    caption: topNewcomer
      ? interpolateTemplate(newcomersTemplate.captionTemplate, {
          name: nameMap[topNewcomer.summary.referralCode] ?? topNewcomer.summary.referralCode,
          attributedWeekly: formatInteger(topNewcomer.metrics.attributedWeekly),
          rewardDelta: formatZecDelta(topNewcomer.rewardDelta),
        }).trim()
      : "No new referrers broke onto the board this week.",
    configSummary: buildConfigSummary({ policy: args.policy, kind: "top_newcomers", order: 2 }),
    metricsSummary: topNewcomer
      ? `${displayCodeMap[topNewcomer.summary.referralCode] ?? topNewcomer.summary.referralCode}: ${formatInteger(topNewcomer.metrics.attributedWeekly)} referrals; ${formatZecDelta(topNewcomer.rewardDelta)} $ZEC`
      : "No newcomer-qualified codes for the completed week.",
    table: topNewcomer
      ? {
          columns: [
            { key: "rank", label: "Rank" },
            { key: "name", label: "Zcash name" },
            { key: "direct", label: "I" },
            { key: "indirect", label: "II+" },
            { key: "metric", label: "\u03A3" },
            { key: "change", label: "\u0394" },
            { key: "reward", label: "\u0394 ZEC" },
            { key: "total", label: "\u03A3 ZEC" },
          ],
          rows: newcomerCandidates.slice(0, 5).map((entry, index) => ({
            key: entry.summary.referralCode,
            cells: [
              String(index + 1),
              displayCodeMap[entry.summary.referralCode] ?? entry.summary.referralCode,
              formatInteger(entry.metrics.directWeekly),
              formatInteger(entry.metrics.indirectWeekly),
              formatInteger(entry.metrics.attributedWeekly),
              formatSignedInteger(entry.delta),
              formatZecDelta(entry.rewardDelta),
              formatZec(
                currentSummaryMap.get(entry.summary.referralCode)?.potentialRewards ?? 0,
              ),
            ],
          })),
          note: projectedRewardsNote(),
        }
      : fallbackTopNewcomersTable(reportWindow.weekLabel),
  });

  const indirectCandidates = rankingCurrent
    .map((entry) => ({
      ...entry,
      metrics: targetWeekMetrics.get(entry.referralCode) ?? emptyWindowMetrics(),
      rewardDelta: (targetWeekMetrics.get(entry.referralCode) ?? emptyWindowMetrics()).indirectRewardWeekly,
    }))
    .sort((a, b) => {
      if (b.metrics.indirectWeekly !== a.metrics.indirectWeekly) return b.metrics.indirectWeekly - a.metrics.indirectWeekly;
      if (b.metrics.depth2Weekly !== a.metrics.depth2Weekly) return b.metrics.depth2Weekly - a.metrics.depth2Weekly;
      if (b.metrics.depth3Weekly !== a.metrics.depth3Weekly) return b.metrics.depth3Weekly - a.metrics.depth3Weekly;
      if (b.metrics.depth4PlusWeekly !== a.metrics.depth4PlusWeekly) return b.metrics.depth4PlusWeekly - a.metrics.depth4PlusWeekly;
      if (b.metrics.attributedWeekly !== a.metrics.attributedWeekly) return b.metrics.attributedWeekly - a.metrics.attributedWeekly;
      if (b.rewardDelta !== a.rewardDelta) return b.rewardDelta - a.rewardDelta;
      return a.referralCode.localeCompare(b.referralCode);
    });
  const topIndirect = indirectCandidates[0] ?? null;
  const indirectTemplate = pickTemplate(args.policy, "top_indirect");
  const hasIndirectMomentum = indirectCandidates.some((entry) => entry.metrics.indirectWeekly > 0);
  posts.push({
    kind: "top_indirect",
    order: 3,
    title: indirectTemplate.title,
    subtitle: indirectTemplate.subtitle,
    caption: hasIndirectMomentum && topIndirect
      ? interpolateTemplate(indirectTemplate.captionTemplate, {
          name: topIndirect.name,
          indirectWeekly: formatInteger(topIndirect.metrics.indirectWeekly),
          rewardDelta: formatZecDelta(topIndirect.rewardDelta),
        }).trim()
      : "No second-order-or-deeper referrals landed during the completed week.",
    configSummary: buildConfigSummary({ policy: args.policy, kind: "top_indirect", order: 3 }),
    metricsSummary: topIndirect
      ? `${topIndirect.displayCode}: ${formatInteger(topIndirect.metrics.indirectWeekly)} indirect referrals; ${formatZecDelta(topIndirect.rewardDelta)} $ZEC`
      : "No indirect metrics available.",
    table: hasIndirectMomentum
      ? {
          columns: [
            { key: "rank", label: "Rank" },
            { key: "name", label: "Zcash name" },
            { key: "depth2", label: "II" },
            { key: "depth3", label: "III" },
            { key: "depth4plus", label: "IV" },
            { key: "metric", label: "\u03A3" },
            { key: "reward", label: "\u0394 ZEC" },
            { key: "total", label: "\u03A3 ZEC" },
          ],
          rows: indirectCandidates.slice(0, 5).map((entry, index) => ({
            key: entry.referralCode,
            cells: [
              String(index + 1),
              entry.displayCode,
              formatInteger(entry.metrics.depth2Weekly),
              formatInteger(entry.metrics.depth3Weekly),
              formatInteger(entry.metrics.depth4PlusWeekly),
              formatInteger(entry.metrics.indirectWeekly),
              formatZecDelta(entry.rewardDelta),
              formatZec(entry.potentialRewards),
            ],
          })),
          note: indirectReferralNote(),
        }
      : fallbackTopIndirectTable(reportWindow.weekLabel),
  });

  const leaderTemplate = pickTemplate(args.policy, "leader_changes");
  posts.push({
    kind: "leader_changes",
    order: 4,
    title: leaderTemplate.title,
    subtitle: leaderTemplate.subtitle,
    caption: interpolateTemplate(leaderTemplate.captionTemplate, {
      leaderChangesCaption: leaderChanges.caption,
    }).trim(),
    configSummary: buildConfigSummary({ policy: args.policy, kind: "leader_changes", order: 4 }),
    metricsSummary: leaderChanges.metricsSummary,
    table: {
      columns: [
        { key: "period", label: "Period" },
        { key: "change", label: "Change" },
        { key: "rewards", label: "\u03A3 ZEC" },
      ],
      rows: leaderChanges.rows.map((row) => ({
        key: row.period,
        cells: [
          row.period,
          `${row.previousDisplayCode ?? "None"} --> ${row.currentDisplayCode}`,
          row.totalRewards != null ? formatZec(row.totalRewards) : "N/A",
        ],
      })),
      note: projectedRewardsNote(),
    },
  });

  const closingTemplate = pickTemplate(args.policy, "closing_note");
  posts.push({
    kind: "closing_note",
    order: 5,
    title: closingTemplate.title,
    subtitle: closingTemplate.subtitle,
    caption: interpolateTemplate(closingTemplate.captionTemplate, {}).trim(),
    configSummary: buildConfigSummary({ policy: args.policy, kind: "closing_note", order: 5 }),
    metricsSummary: "Text-only closing note.",
    table: {
      columns: [],
      rows: [],
      note: null,
    },
  });

  const summaryPost = posts.find((post) => post.kind === "summary_top10");
  const weeklyLeaderRow = leaderChanges.rows.find((row) => row.period === "weekly") ?? null;
  if (summaryPost) {
    summaryPost.caption = buildSummaryTop10Caption({
      weekLabel: reportWindow.weekLabel,
      allTimeLeader: top10Rows[0] ?? null,
      topMoverDisplayCode: topMover?.displayCode ?? null,
      topNewcomerDisplayCode: topNewcomer
        ? (displayCodeMap[topNewcomer.summary.referralCode] ?? topNewcomer.summary.referralCode)
        : null,
      weeklyLeaderChanged: weeklyLeaderRow?.changed ?? false,
      weeklyLeaderDisplayCode: weeklyLeaderRow?.currentDisplayCode ?? null,
    });
  }

  for (const post of posts) {
    post.caption = normalizeCaptionCashtags(formatCaptionParagraphs(post.caption));
  }

  return {
    reportWindow,
    thread: {
      rootKind: args.policy.rootKind,
      xThreadMode: args.policy.xThreadMode,
      telegramDeliveryMode: args.policy.telegramDeliveryMode,
    },
    posts,
  };
}


