"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDailyRankings,
  getLeaderboard,
  getLeadersTimeSeries,
  getWaitlistStats,
  type DailyRow,
  type LeaderboardEntry,
  type RankingEntry,
  type ReferralScope,
  type TimeSeriesPoint,
} from "@/lib/leaders/leaders";
import CopyIconButton from "@/components/CopyIconButton";

const REWARDS_CHART_COLOR = "var(--leaders-area-rewards)";
type AxisSide = "left" | "right";

interface EndpointGuideLine {
  yAxisId: string;
  value: number;
  color: string;
  side: AxisSide;
}

function getActiveChartPoint<T extends { date: string }>(state: unknown, data: T[]): T | null {
  const chartState = state as
    | { activeTooltipIndex?: number | string; tooltipIndex?: number | string; activeLabel?: string }
    | null;
  const rawIndex = chartState?.activeTooltipIndex ?? chartState?.tooltipIndex;
  const index = rawIndex === undefined ? NaN : Number(rawIndex);

  if (Number.isInteger(index) && index >= 0 && index < data.length) {
    return data[index];
  }

  if (chartState?.activeLabel) {
    return data.find((point) => point.date === chartState.activeLabel) ?? null;
  }

  return null;
}

function AxisEndpointGuideLines({
  point,
  lines,
}: {
  point: { date: string } | null;
  lines: EndpointGuideLine[];
}) {
  const plotArea = usePlotArea();
  const xScale = useXAxisScale();

  if (!point || !plotArea || !xScale) return null;

  const x = xScale(point.date, { position: "middle" });
  if (x === undefined) return null;

  return (
    <g pointerEvents="none">
      {lines.map((line) => (
        <AxisEndpointGuideLine key={`${line.yAxisId}-${line.color}`} x={x} plotArea={plotArea} line={line} />
      ))}
    </g>
  );
}

function AxisEndpointGuideLine({
  x,
  plotArea,
  line,
}: {
  x: number;
  plotArea: { x: number; width: number };
  line: EndpointGuideLine;
}) {
  const yScale = useYAxisScale(line.yAxisId);
  const y = yScale?.(line.value);

  if (y === undefined) return null;

  const axisX = line.side === "left" ? plotArea.x : plotArea.x + plotArea.width;

  return (
    <line
      x1={x}
      x2={axisX}
      y1={y}
      y2={y}
      stroke={line.color}
      strokeDasharray="4 4"
      strokeWidth={1}
      opacity={0.35}
    />
  );
}

function ZecSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        width: "0.6em",
        height: "0.6em",
        verticalAlign: "baseline",
        marginBottom: "0.05em",
      }}
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6H14L6 14H14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function EmailConfirmedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2.5" y="5" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.6 7L10 11.5L16.4 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="17.6"
        cy="15.8"
        r="3.9"
        fill="var(--leaders-card-bg-solid, var(--leaders-card-bg))"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M15.9 15.9L17.1 17.1L19.4 14.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.4 10.8l7.2-4.2M8.4 13.2l7.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string; payload?: TimeSeriesPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const total = payload.find((p) => p.name === "nonReferred");
  const referred = payload.find((p) => p.name === "referred");
  const rewards = payload.find((p) => p.name === "rewardsPot");
  const totalVal = (total?.value ?? 0) + (referred?.value ?? 0);
  const point = payload[0]?.payload;
  const topReferrer = point?.topReferrer;

  const formatDelta = (d: number | undefined) => {
    if (d === undefined) return null;
    return (
      <span className="ml-1 text-fg-muted" style={{ opacity: 0.7 }}>
        ({d > 0 ? "+" : ""}
        {d})
      </span>
    );
  };

  const formatZecDelta = (d: number | undefined) => {
    if (d === undefined) return null;
    return (
      <span className="ml-1 text-fg-muted" style={{ opacity: 0.7 }}>
        ({d > 0 ? "+" : ""}
        {formatZec(d)})
      </span>
    );
  };

  return (
    <div
      className="rounded-xl border px-4 py-3 text-sm backdrop-blur-md"
      style={{
        background: "var(--leaders-tooltip-bg)",
        borderColor: "var(--leaders-tooltip-border)",
        color: "var(--fg-body)",
      }}
    >
      <p className="mb-1.5 font-semibold text-fg-heading">{label}</p>
      <p>
        Total:{" "}
        <span className="font-semibold" style={{ color: "var(--leaders-area-non-referred)" }}>
          {totalVal}
        </span>
        {formatDelta(point?.totalDelta)}
      </p>
      <p>
        Referred:{" "}
        <span className="font-semibold" style={{ color: "var(--leaders-area-referred)" }}>
          {referred?.value ?? 0}
        </span>
        {formatDelta(point?.referredDelta)}
      </p>
      <p>
        Rewards:{" "}
        <span className="font-semibold" style={{ color: REWARDS_CHART_COLOR }}>
          <ZecSymbol className="mr-0.5 inline-block" /> {formatZec(rewards?.value ?? 0)}
        </span>
        {formatZecDelta(point?.rewardsDelta)}
      </p>
      {topReferrer && (
        <p className="mt-2 text-[0.78rem] text-fg-muted">
          Top: <span className="font-semibold text-fg-heading">{topReferrer.name}</span>
          {topReferrer.streak && (
            <img
              src="/icons/fire-red.apng"
              alt="streak"
              className="mx-0.5 inline-block h-4 w-4 align-text-bottom"
            />
          )}{" "}
          (+{topReferrer.count})
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  active = false,
  onClick,
}: {
  label: string;
  value: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border px-6 py-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)]"
      style={{
        background: active ? "var(--market-stats-segment-active-bg)" : "var(--leaders-card-bg)",
        borderColor: "var(--leaders-card-border)",
      }}
    >
      <div className="tabular-nums text-[clamp(1.4rem,2.5vw,2rem)] font-semibold leading-none tracking-tight text-fg-heading">
        {value}
      </div>
      <div className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</div>
    </button>
  );
}

export default function LeaderboardContent() {
  const [headerTitleTarget, setHeaderTitleTarget] = useState<HTMLElement | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyRow[]>([]);
  const [rankingsMode, setRankingsMode] = useState<"daily" | "allTime">("daily");
  const referralScope: ReferralScope = "all";
  const [visibleLeaderboardRows, setVisibleLeaderboardRows] = useState(10);
  const [visibleDailyRows, setVisibleDailyRows] = useState(7);
  const [stats, setStats] = useState({ waitlist: 0, referred: 0, rewardsPot: 0 });
  const [loading, setLoading] = useState(true);
  const [activeStatKey, setActiveStatKey] = useState<"waitlist" | "referred" | "rewards" | null>(null);
  const [activeChartPoint, setActiveChartPoint] = useState<TimeSeriesPoint | null>(null);
  const [copiedReferralCode, setCopiedReferralCode] = useState<string | null>(null);
  const copiedResetTimeoutRef = useRef<number | null>(null);

  const filteredDailyRows = useMemo(
    () => dailyRows.filter((row) => row.date >= "2026-03-30"),
    [dailyRows],
  );

  const visibleRows = useMemo(
    () => [...filteredDailyRows].reverse().slice(0, visibleDailyRows),
    [filteredDailyRows, visibleDailyRows],
  );

  const visibleLeaderboard = useMemo(
    () => leaderboard.slice(0, visibleLeaderboardRows),
    [leaderboard, visibleLeaderboardRows],
  );
  const chartGuidePoint = activeChartPoint ?? timeSeries[timeSeries.length - 1] ?? null;
  const chartGuideWaitlist = chartGuidePoint ? chartGuidePoint.referred + chartGuidePoint.nonReferred : 0;

  const canShowMoreLeaderboardRows = visibleLeaderboardRows < leaderboard.length;
  const canHideLeaderboardRows = visibleLeaderboardRows > 10;

  const canShowMoreRows = visibleDailyRows < filteredDailyRows.length;
  const canHideRows = visibleDailyRows > 7;

  const dailyTopBadgeByKey = useMemo(() => {
    const badges = new Map<string, "red" | "blue">();
    let previousDate: string | null = null;
    let previousTopCode: string | null = null;
    let currentStreak = 0;

    for (const row of filteredDailyRows) {
      const topEntry = row.daily[0];
      if (!topEntry) {
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
      badges.set(`${row.date}:${topEntry.referral_code}`, currentStreak >= 2 ? "red" : "blue");

      previousDate = row.date;
      previousTopCode = topEntry.referral_code;
    }

    return badges;
  }, [filteredDailyRows]);

  useEffect(() => {
    setHeaderTitleTarget(document.getElementById("site-route-title"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const [ts, lb, dr, st] = await Promise.all([
        getLeadersTimeSeries(referralScope),
        getLeaderboard(referralScope),
        getDailyRankings(referralScope),
        getWaitlistStats(referralScope),
      ]);

      if (!cancelled) {
        setTimeSeries(ts);
        setLeaderboard(lb);
        setDailyRows(dr);
        setStats(st);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [referralScope]);

  useEffect(() => {
    setVisibleDailyRows(7);
  }, [filteredDailyRows.length]);

  useEffect(() => {
    setVisibleLeaderboardRows(10);
  }, [leaderboard.length, referralScope]);

  useEffect(() => {
    return () => {
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }
    };
  }, []);

  async function copyReferralLink(referralCode: string) {
    try {
      await navigator.clipboard.writeText(`https://zcashnames.com/?ref=${referralCode}`);
      setCopiedReferralCode(referralCode);
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
      }
      copiedResetTimeoutRef.current = window.setTimeout(() => {
        setCopiedReferralCode((current) => (current === referralCode ? null : current));
        copiedResetTimeoutRef.current = null;
      }, 2000);
    } catch {
      if (copiedResetTimeoutRef.current !== null) {
        window.clearTimeout(copiedResetTimeoutRef.current);
        copiedResetTimeoutRef.current = null;
      }
      setCopiedReferralCode((current) => (current === referralCode ? null : current));
    }
  }

  return (
    <>
      {headerTitleTarget &&
        createPortal(
          <span className="site-route-title" aria-label="Current page">
            Leaders
          </span>,
          headerTitleTarget,
        )}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm font-semibold text-fg-muted underline-offset-4 transition-colors hover:text-fg-heading hover:underline">
          Back to Home
        </Link>
        <Link
          href="/sharekit"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-muted underline-offset-4 transition-colors hover:text-fg-heading hover:underline"
        >
          <ShareIcon className="h-4 w-4 shrink-0" />
          Share your link
        </Link>
      </div>

      <section
        className="mb-8 rounded-2xl border p-4 sm:p-6"
        style={{
          background: "var(--leaders-card-bg)",
          borderColor: "var(--leaders-card-border)",
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-heading">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: REWARDS_CHART_COLOR }} />
            Rewards
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-fg-heading">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--leaders-area-non-referred)" }} />
              Waitlist
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--leaders-area-referred)" }} />
              Referred
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-fg-dim border-t-transparent" />
          </div>
        ) : timeSeries.length === 0 ? (
          <p className="py-20 text-center text-fg-muted">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={timeSeries}
              margin={{ top: 4, right: -12, bottom: 0, left: -12 }}
              onMouseMove={(state) => setActiveChartPoint(getActiveChartPoint(state, timeSeries))}
              onMouseLeave={() => setActiveChartPoint(null)}
            >
              <defs>
                <linearGradient id="gradReferred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--leaders-area-referred)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--leaders-area-referred)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradNonReferred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--leaders-area-non-referred)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--leaders-area-non-referred)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                yAxisId="rewards"
                tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickFormatter={(value) => `${Math.round(Number(value))}`}
              />
              <YAxis
                yAxisId="waitlist"
                orientation="right"
                tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                yAxisId="waitlist"
                type="monotone"
                dataKey="referred"
                stackId="1"
                stroke="var(--leaders-area-referred)"
                fill="url(#gradReferred)"
                strokeWidth={2}
              />
              <Area
                yAxisId="waitlist"
                type="monotone"
                dataKey="nonReferred"
                stackId="1"
                stroke="var(--leaders-area-non-referred)"
                fill="url(#gradNonReferred)"
                strokeWidth={2}
              />
              <Line
                yAxisId="rewards"
                type="monotone"
                dataKey="rewardsPot"
                stroke={REWARDS_CHART_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: REWARDS_CHART_COLOR }}
              />
              <AxisEndpointGuideLines
                point={chartGuidePoint}
                lines={[
                  { yAxisId: "rewards", value: chartGuidePoint?.rewardsPot ?? 0, color: REWARDS_CHART_COLOR, side: "left" },
                  {
                    yAxisId: "waitlist",
                    value: chartGuideWaitlist,
                    color: "var(--leaders-area-non-referred)",
                    side: "right",
                  },
                  {
                    yAxisId: "waitlist",
                    value: chartGuidePoint?.referred ?? 0,
                    color: "var(--leaders-area-referred)",
                    side: "right",
                  },
                ]}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="mb-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            label="Waitlist"
            value={loading ? <Skeleton /> : stats.waitlist.toLocaleString()}
            active={activeStatKey === "waitlist"}
            onClick={() => setActiveStatKey((current) => (current === "waitlist" ? null : "waitlist"))}
          />
          <StatCard
            label="Referred"
            value={loading ? <Skeleton /> : stats.referred.toLocaleString()}
            active={activeStatKey === "referred"}
            onClick={() => setActiveStatKey((current) => (current === "referred" ? null : "referred"))}
          />
          <StatCard
            label="Rewards"
            value={
              loading ? (
                <Skeleton />
              ) : (
                <>
                  <ZecSymbol className="mr-0.5 inline-block" /> {formatZec(stats.rewardsPot)}
                </>
              )
            }
            active={activeStatKey === "rewards"}
            onClick={() => setActiveStatKey((current) => (current === "rewards" ? null : "rewards"))}
          />
        </div>
        <div
          aria-live="polite"
          className={`overflow-hidden transition-all duration-300 ease-out ${
            activeStatKey ? "mt-3 max-h-32 translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
          }`}
        >
          <p
            className="rounded-xl border px-4 py-2 text-[0.78rem] font-medium leading-relaxed sm:text-sm"
            style={{
              background: "var(--market-stats-help-bg)",
              borderColor: "var(--market-stats-help-border)",
              color: "var(--market-stats-help-text)",
            }}
          >
            {activeStatKey === "waitlist" && "Total number of people on the ZcashNames waitlist."}
            {activeStatKey === "referred" && "Number of waitlist members who were referred by someone."}
            {activeStatKey === "rewards" && (
              <>
                Total estimated rewards from all referrals.{" "}
                <Link href="/leaders/terms" className="underline underline-offset-2">
                  View terms
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{
          background: "var(--leaders-card-bg)",
          borderColor: "var(--leaders-card-border)",
        }}
      >
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
          style={{ maxHeight: `${86 + Math.max(1, visibleLeaderboard.length) * 58}px` }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
              <tr
                className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <th className="px-4 py-3 sm:px-6">Rank</th>
                <th className="px-4 py-3 sm:px-6">ZcashName</th>
                <th className="px-4 py-3 text-right sm:px-6">
                  <span>Refs</span>
                </th>
                <th className="px-4 py-3 text-right sm:px-6">24h</th>
                <th className="px-4 py-3 text-right sm:px-6">Rewards</th>
              </tr>
              </thead>
              <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <Skeleton w="w-6" />
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <Skeleton w="w-28" />
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <Skeleton w="w-8" />
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <Skeleton w="w-6" />
                    </td>
                    <td className="px-4 py-3 text-right sm:px-6">
                      <Skeleton w="w-14" />
                    </td>
                  </tr>
                ))
              ) : leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-fg-muted">
                    No referrals yet.
                  </td>
                </tr>
              ) : (
                visibleLeaderboard.map((entry) => (
                  <tr
                    key={entry.referral_code}
                    className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 font-semibold text-fg-heading sm:px-6">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                        style={
                          entry.rank <= 3
                            ? {
                                background:
                                  entry.rank === 1
                                    ? "var(--leaders-rank-gold)"
                                    : entry.rank === 2
                                      ? "var(--leaders-rank-silver)"
                                      : "var(--leaders-rank-bronze)",
                                color: "var(--leaders-rank-text)",
                              }
                            : {
                                background: "transparent",
                                color: "inherit",
                              }
                        }
                      >
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <div className="font-semibold text-fg-heading">
                        <Link href={`/leaders/ref/${encodeURIComponent(entry.referral_code)}`} className="underline-offset-2 hover:underline">
                          {entry.name}
                        </Link>
                        {entry.streak && (
                          <img
                            src="/icons/fire-red.apng"
                            alt="streak"
                            className="ml-1 inline-block h-5 w-5 align-text-bottom"
                          />
                        )}
                        {entry.topRecent && (
                          <img
                            src="/icons/fire-blue.apng"
                            alt="top 24h"
                            className="ml-1 inline-block h-5 w-5 align-text-bottom"
                          />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[0.72rem] text-fg-muted">{entry.referral_code}</span>
                        <CopyIconButton
                          onClick={() => {
                            void copyReferralLink(entry.referral_code);
                          }}
                          ariaLabel="Copy referral link"
                          title={copiedReferralCode === entry.referral_code ? "Copied!" : "Copy referral link"}
                          copied={copiedReferralCode === entry.referral_code}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--fg-muted)",
                            height: "0.875rem",
                            width: "0.875rem",
                            padding: 0,
                            borderRadius: 0,
                          }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums sm:px-6">
                      <span className="font-semibold text-fg-heading">{entry.attributedReferrals}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted sm:px-6">
                      {entry.recent > 0 ? `+${entry.recent}` : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-body sm:px-6">
                      <ZecSymbol className="mr-0.5 inline-block" /> {formatZec(entry.potential_rewards)}
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
        {leaderboard.length > 10 && (
          <div
            className="flex items-center justify-between gap-3 border-t px-5 py-3"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            {canShowMoreLeaderboardRows ? (
              <button
                type="button"
                className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                onClick={() => {
                  setVisibleLeaderboardRows((current) => Math.min(current + 10, leaderboard.length));
                }}
              >
                Show 10 more
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            {canHideLeaderboardRows && (
              <button
                type="button"
                className="ml-auto cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                onClick={() => {
                  setVisibleLeaderboardRows((current) => Math.max(10, current - 10));
                }}
              >
                Show 10 less
              </button>
            )}
          </div>
        )}
      </section>

      <section
        className="mt-8 overflow-hidden rounded-2xl border"
        style={{
          background: "var(--leaders-card-bg)",
          borderColor: "var(--leaders-card-border)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--type-section-subtitle)", color: "var(--fg-heading)" }}
          >
            Daily Rankings
          </h2>
          <div
            className="inline-flex items-center rounded-full border p-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            <button
              type="button"
              className="cursor-pointer rounded-full px-3 py-1 transition-colors"
              style={
                rankingsMode === "allTime"
                  ? { background: "var(--leaders-rank-gold)", color: "var(--leaders-rank-text)" }
                  : { color: "var(--fg-muted)" }
              }
              onClick={() => setRankingsMode("allTime")}
            >
              All-time
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-full px-3 py-1 transition-colors"
              style={
                rankingsMode === "daily"
                  ? { background: "var(--leaders-rank-gold)", color: "var(--leaders-rank-text)" }
                  : { color: "var(--fg-muted)" }
              }
              onClick={() => setRankingsMode("daily")}
            >
              24h
            </button>
          </div>
        </div>

        <div
          className="overflow-hidden border-t transition-[max-height,opacity] duration-300 ease-out"
          style={{
            borderColor: "var(--leaders-card-border)",
            maxHeight: `${78 + Math.max(1, visibleRows.length) * 76}px`,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
              <tr
                className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <th className="px-4 py-2.5 sm:px-6">Date</th>
                <th className="px-4 py-2.5 text-left sm:px-6">1st</th>
                <th className="px-4 py-2.5 text-left sm:px-6">2nd</th>
                <th className="px-4 py-2.5 text-left sm:px-6">3rd</th>
              </tr>
              </thead>
              <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 tabular-nums sm:px-6">
                      <Skeleton w="w-20" />
                    </td>
                    {Array.from({ length: 3 }).map((__, j) => (
                      <td key={j} className="px-4 py-3 sm:px-6">
                        <Skeleton w="w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                    No daily ranking data yet.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b align-top last:border-b-0"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 font-mono text-[0.78rem] sm:px-6">
                      <Link href={`/leaders/${row.date}`} className="text-fg-muted underline-offset-2 hover:underline">
                        {row.date}
                      </Link>
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <RankingCell
                        entry={rankingsMode === "daily" ? row.daily[0] : row.allTime[0]}
                        badgeType={
                          rankingsMode === "daily" && row.daily[0]
                            ? dailyTopBadgeByKey.get(`${row.date}:${row.daily[0].referral_code}`) ?? null
                            : null
                        }
                      />
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <RankingCell entry={rankingsMode === "daily" ? row.daily[1] : row.allTime[1]} />
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <RankingCell entry={rankingsMode === "daily" ? row.daily[2] : row.allTime[2]} />
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredDailyRows.length > 7 && (
          <div
            className="flex items-center justify-between gap-3 border-t px-5 py-3"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            {canShowMoreRows ? (
              <button
                type="button"
                className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                onClick={() => {
                  setVisibleDailyRows((current) => Math.min(current + 7, filteredDailyRows.length));
                }}
              >
                Show 7 more
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            {canHideRows && (
              <button
                type="button"
                className="ml-auto cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                onClick={() => {
                  setVisibleDailyRows((current) => Math.max(7, current - 7));
                }}
              >
                Show 7 less
              </button>
            )}
          </div>
        )}
      </section>

      <HowItWorks />
    </>
  );
}

const HOW_IT_WORKS: { title: string; body: ReactNode }[] = [
  {
    title: "Referrals",
    body: "After you join the waitlist, you'll receive a personal referral link to share. Direct referrals and the indirect referrals below them count toward your leaderboard rank.",
  },
  {
    title: "Ranking",
    body: (
      <>
        The leaderboard starts by ranking total referrals, but may adjust based on{" "}
        <strong>successful referrals</strong> -- people who not only signed up, but also purchase
        their name during early access.
        <span className="mt-2 block text-fg-muted">
          <img src="/icons/fire-red.apng" alt="streak" className="mr-1 inline-block h-4 w-4 align-text-bottom" />
          A red fire icon next to a name means that person has had the most referrals for more than
          one day in a row.
        </span>
        <span className="mt-1 block text-fg-muted">
          <img src="/icons/fire-blue.apng" alt="top 24h" className="mr-1 inline-block h-4 w-4 align-text-bottom" />
          A blue fire icon next to a name means that person has had the most referrals in the last
          24 hours.
        </span>
      </>
    ),
  },
  {
    title: "Rewards",
    body: (
      <>
        The 0.05 ZEC amount is an example based on the lowest name price (0.25 ZEC for 7+ characters).
        You earn 20% of the lowest name price at the time of purchase for direct referrals. Since prices
        can change, your reward may vary. You also earn from referrals of your referrals, with each level
        earning half the previous one. Rewards are estimates until early access purchases are complete.{" "}
        <Link href="/leaders/terms" className="underline underline-offset-2">
          View terms
        </Link>
        .
      </>
    ),
  },
  {
    title: "Early Access",
    body: (
      <>
        Early access is distributed on a <strong>first come, first served</strong> basis based on
        when you joined the waitlist. However, referrals can move you up in line. For example,
        every 3 referrals allows you to skip 1 spot, improving your position for earlier access.
      </>
    ),
  },
  {
    title: "Fairness",
    body: (
      <>
        Only valid signups and real purchases count. Spam, duplicate entries, or abuse may be
        filtered to keep rankings accurate.
      </>
    ),
  },
];

function HowItWorks() {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="mt-8 overflow-hidden rounded-2xl border"
      style={{
        background: "var(--leaders-card-bg)",
        borderColor: "var(--leaders-card-border)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-4 text-left"
      >
        <span
          className="font-semibold"
          style={{ fontSize: "var(--type-section-subtitle)", color: "var(--fg-heading)" }}
        >
          How the Leaderboard Works
        </span>
        <span className="ml-2 inline-flex shrink-0 items-center gap-1.5 text-sm text-fg-muted">
          <span>{open ? "Collapse" : "Expand"}</span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
            aria-hidden="true"
          >
            <path
              d="M3.5 6L8 10L12.5 6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-4 px-5 pb-5">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-bold text-fg-heading">{item.title}</h3>
              <div className="mt-0.5 leading-relaxed text-fg-body text-sm">{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RankingCell({
  entry,
  badgeType = null,
}: {
  entry?: RankingEntry;
  badgeType?: "red" | "blue" | null;
}) {
  if (!entry) {
    return <span className="text-fg-muted">-</span>;
  }

  return (
    <div className="leading-tight">
      <div className="font-semibold text-fg-heading">
        <Link
          href={`/leaders/ref/${encodeURIComponent(entry.referral_code)}`}
          className="underline-offset-2 hover:underline"
        >
          {entry.name}
        </Link>
        {badgeType && (
          <img
            src={badgeType === "red" ? "/icons/fire-red.apng" : "/icons/fire-blue.apng"}
            alt={badgeType === "red" ? "streak" : "top 24h"}
            className="ml-1 inline-block h-4 w-4 align-text-bottom"
          />
        )}
      </div>
      <div className="mt-0.5 text-[0.78rem] text-fg-muted">{entry.count} refs</div>
      <div className="mt-0.5 tabular-nums text-[0.8rem] text-fg-body">
        <ZecSymbol className="mr-0.5 inline-block" /> {formatPayout(entry.payout)}
      </div>
    </div>
  );
}

function isNextDay(previousDate: string, nextDate: string): boolean {
  const previous = new Date(`${previousDate}T00:00:00.000Z`).getTime();
  const next = new Date(`${nextDate}T00:00:00.000Z`).getTime();
  return next - previous === 24 * 60 * 60 * 1000;
}

function formatPayout(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatZec(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function Skeleton({ w = "w-12" }: { w?: string }) {
  return <span className={`inline-block h-[0.85em] ${w} animate-pulse rounded-md bg-fg-dim/20 align-middle`} />;
}
