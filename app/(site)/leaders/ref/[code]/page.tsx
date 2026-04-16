"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  getReferralDashboard,
  lockReferralCommissionMode,
  requestReferralCommissionPin,
  unlockReferralTable,
  unlockReferralCommissionMode,
  type ReferralScope,
} from "@/lib/leaders/leaders";
import {
  calculateReferralProjection,
  DEFAULT_CONVERSION_BY_BUCKET,
  DEFAULT_PRICE_BY_BUCKET,
  fixedRewardForDepth,
  getNameLengthBucket,
  type ConversionByBucket,
  type NameLengthBucket,
  type PriceByBucket,
  type ReferralDashboardData,
  type ProjectionModel,
} from "@/lib/leaders/referral-dashboard";

const DIRECT_CHART_COLOR = "var(--leaders-area-referred)";
const INDIRECT_CHART_COLOR = "var(--leaders-area-non-referred)";
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

interface ReferralChartPoint {
  date: string;
  direct: number;
  indirect: number;
  rewards: number;
  directDelta?: number;
  indirectDelta?: number;
  rewardsDelta?: number;
}

function ZecSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: "0.7em", height: "0.7em", verticalAlign: "baseline", marginBottom: "0.05em" }}
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6H14L6 14H14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function EmailConfirmedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="2.5" y="5" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.6 7L10 11.5L16.4 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.6" cy="15.8" r="3.9" fill="var(--leaders-card-bg-solid, var(--leaders-card-bg))" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.9 15.9L17.1 17.1L19.4 14.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ReferralDashboardPage() {
  const params = useParams<{ code: string }>();
  const referralCode = decodeURIComponent(typeof params?.code === "string" ? params.code : "");
  const [scope, setScope] = useState<ReferralScope>("all");
  const [data, setData] = useState<ReferralDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [referralLevelFilter, setReferralLevelFilter] = useState<"all" | number>("all");
  const [visibleReferralRows, setVisibleReferralRows] = useState(10);
  const [activeMetricKey, setActiveMetricKey] = useState<"referrals" | "direct" | "payout" | null>(null);
  const [directMetricFace, setDirectMetricFace] = useState<"direct" | "indirect">("direct");
  const [prices, setPrices] = useState<PriceByBucket>(DEFAULT_PRICE_BY_BUCKET);
  const [conversions, setConversions] = useState<ConversionByBucket>(DEFAULT_CONVERSION_BY_BUCKET);
  const [accessGesture, setAccessGesture] = useState({ count: 0, lastAt: 0 });
  const [accessPromptMode, setAccessPromptMode] = useState<"commission" | "referrals" | null>(null);
  const [commissionPin, setCommissionPin] = useState("");
  const [commissionError, setCommissionError] = useState("");
  const [commissionSubmitting, setCommissionSubmitting] = useState(false);
  const [commissionPinRequesting, setCommissionPinRequesting] = useState(false);
  const [commissionPinMessage, setCommissionPinMessage] = useState("");
  const [modeSwitching, setModeSwitching] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const result = await getReferralDashboard(referralCode, scope);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [referralCode, scope]);

  const model: ProjectionModel = data?.root?.cabal && data.commissionUnlocked ? "commission" : "fixed";
  const referralsTableUnlocked = model === "commission" || Boolean(data?.referralsUnlocked);
  const referralsTableLocked = model === "fixed" && !referralsTableUnlocked;
  const indirectReferrals = data
    ? Math.max(0, data.totalAttributedReferrals - data.directReferrals.length)
    : 0;

  const projection = useMemo(() => {
    if (!data) return null;
    return calculateReferralProjection({ data, model, prices, conversions });
  }, [conversions, data, model, prices]);

  const referralChartSeries = useMemo(() => {
    if (!data) return [];
    return buildReferralChartSeries({
      data,
      model,
      prices,
      conversions,
      commissionRate: projection?.commissionRate ?? 0.15,
    });
  }, [conversions, data, model, prices, projection?.commissionRate]);

  const visibleReferrals = useMemo(() => {
    if (!data) return [];
    return data.descendants
      .filter((entry) => referralLevelFilter === "all" || entry.depth === referralLevelFilter)
      .sort((a, b) => {
        if (a.depth !== b.depth) return a.depth - b.depth;

        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        if (timeA !== timeB) return timeB - timeA;

        return a.referral_code.localeCompare(b.referral_code);
      });
  }, [data, referralLevelFilter]);
  const visibleReferralTableRows = useMemo(
    () => visibleReferrals.slice(0, visibleReferralRows),
    [visibleReferrals, visibleReferralRows],
  );
  const referralLevelOptions = useMemo(
    () => (data ? ["all" as const, ...data.depthCounts.map((row) => row.depth)] : ["all" as const]),
    [data],
  );
  const canShowMoreReferralRows = !referralsTableLocked && visibleReferralRows < visibleReferrals.length;
  const canHideReferralRows = !referralsTableLocked && visibleReferralRows > 10;
  const activeReferralLevelIndex = Math.max(
    0,
    referralLevelOptions.findIndex((option) => option === referralLevelFilter),
  );

  useEffect(() => {
    setVisibleReferralRows(10);
  }, [referralLevelFilter, visibleReferrals.length]);

  useEffect(() => {
    setDirectMetricFace("direct");
  }, [referralCode, scope]);

  useEffect(() => {
    setAccessGesture({ count: 0, lastAt: 0 });
    setAccessPromptMode(null);
    setCommissionPin("");
    setCommissionError("");
    setCommissionPinMessage("");
  }, [referralCode]);

  const handleCommissionAccessGesture = () => {
    if (!data?.root?.cabal || modeSwitching) return;

    const now = Date.now();
    setAccessGesture((current) => {
      const nextCount = now - current.lastAt > 3000 ? 1 : current.count + 1;
      if (nextCount >= 6) {
        if (data.commissionUnlocked) {
          void lockCommissionMode();
        } else {
          setAccessPromptMode("commission");
        }
        setCommissionError("");
        setCommissionPinMessage("");
        return { count: 0, lastAt: 0 };
      }

      return { count: nextCount, lastAt: now };
    });
  };

  const lockCommissionMode = async () => {
    setModeSwitching(true);
    const result = await lockReferralCommissionMode();
    if (result.ok) {
      setData((current) => (current ? { ...current, commissionUnlocked: false } : current));
      setAccessPromptMode(null);
      setCommissionPin("");
      setCommissionError("");
      setCommissionPinMessage("");
      setProjectionOpen(false);
    } else {
      setCommissionError(result.error);
    }
    setModeSwitching(false);
  };

  const submitAccessPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data || !accessPromptMode || commissionSubmitting) return;

    setCommissionSubmitting(true);
    setCommissionError("");

    const result =
      accessPromptMode === "referrals"
        ? await unlockReferralTable(data.referralCode, commissionPin)
        : await unlockReferralCommissionMode(data.referralCode, commissionPin);

    if (result.ok) {
      setData((current) =>
        current
          ? {
              ...current,
              commissionUnlocked: accessPromptMode === "commission" ? true : current.commissionUnlocked,
              referralsUnlocked: accessPromptMode === "referrals" ? true : current.referralsUnlocked,
            }
          : current,
      );
      setAccessPromptMode(null);
      setCommissionPin("");
    } else {
      setCommissionError(result.error);
    }

    setCommissionSubmitting(false);
  };

  const closeAccessPrompt = () => {
    setAccessPromptMode(null);
    setCommissionPin("");
    setCommissionError("");
    setCommissionPinMessage("");
  };

  const requestCommissionPin = async () => {
    if (!data || commissionPinRequesting) return;

    setCommissionPinRequesting(true);
    setCommissionError("");
    setCommissionPinMessage("");

    const result = await requestReferralCommissionPin(data.referralCode);
    if (result.ok) {
      setCommissionPinMessage(result.message);
    } else {
      setCommissionError(result.error);
    }

    setCommissionPinRequesting(false);
  };

  const projectedReferralPayout = (name: string, depth: number): number => {
    const bucket = getNameLengthBucket(name);
    const conversionRate = Math.max(0, conversions[bucket]) / 100;
    if (model === "fixed") return fixedRewardForDepth(depth) * conversionRate;
    return prices[bucket] * conversionRate * (projection?.commissionRate ?? 0.15);
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
        <ReferralDashboardSkeleton />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
        <DashboardShell>
          <h1 className="text-xl font-bold text-fg-heading">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-fg-muted">No referral data could be loaded for this code.</p>
          <BackLink />
        </DashboardShell>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <BackLink />
        <div className="relative inline-grid grid-cols-2 items-center overflow-hidden rounded-full border p-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]" style={{ borderColor: "var(--leaders-card-border)" }}>
          <span
            className="absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-full transition-transform duration-300 ease-out"
            style={{
              left: "0.25rem",
              background: "var(--leaders-rank-gold)",
              transform: `translateX(${scope === "confirmed" ? "100%" : "0"})`,
            }}
            aria-hidden="true"
          />
          <button
            type="button"
            className="relative z-10 cursor-pointer rounded-full px-3 py-1 transition-colors duration-300"
            style={scope === "all" ? { color: "var(--leaders-rank-text)" } : { color: "var(--fg-muted)" }}
            onClick={() => setScope("all")}
          >
            All
          </button>
          <button
            type="button"
            className="relative z-10 inline-flex cursor-pointer items-center justify-center rounded-full px-3 py-1 transition-colors duration-300"
            style={scope === "confirmed" ? { color: "var(--leaders-rank-text)" } : { color: "var(--fg-muted)" }}
            onClick={() => setScope("confirmed")}
            title="Confirmed email referrals"
            aria-label="Confirmed email referrals"
          >
            <EmailConfirmedIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section
        className="mb-8 rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="inline-flex items-center gap-1 text-3xl font-bold tracking-tight text-fg-heading">
              <span>{data.root?.name ?? data.referralCode}</span>
              {data.rootBadge && (
                <img
                  src={data.rootBadge === "red" ? "/icons/fire-red.apng" : "/icons/fire-blue.apng"}
                  alt={data.rootBadge === "red" ? "streak" : "top 24h"}
                  className="h-6 w-6 shrink-0"
                />
              )}
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="font-mono text-sm text-fg-muted">{data.referralCode}</span>
              <button
                type="button"
                title="Copy referral link"
                className="cursor-pointer text-fg-muted transition-colors hover:text-fg-heading"
                onClick={() => {
                  void navigator.clipboard.writeText(`https://zcashnames.com/?ref=${data.referralCode}`);
                }}
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-3.5 w-3.5"
                >
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                  <path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
                </svg>
              </button>
            </div>
          </div>
          <div className="text-right">
            {data.root?.cabal ? (
              <button
                type="button"
                aria-label="Dashboard options"
                className="inline-block cursor-default rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
                onClick={handleCommissionAccessGesture}
              >
                {data.waitlistPosition ? `#${data.waitlistPosition.toLocaleString()}` : "-"}
              </button>
            ) : (
              <p className="inline-block rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--leaders-card-border)" }}>
                {data.waitlistPosition ? `#${data.waitlistPosition.toLocaleString()}` : "-"}
              </p>
            )}
            <div className="mt-2 text-sm text-fg-muted">
              {data.root ? (
                <>
                  Joined <span className="font-medium text-fg-body">{formatDate(data.root.created_at)}</span>
                </>
              ) : (
                "Referral code not found as a waitlist member."
              )}
            </div>
          </div>
        </div>
        {accessPromptMode === "commission" && (
          <form
            onSubmit={submitAccessPin}
            className="mt-5 border-t pt-3"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            <label className="block text-sm font-semibold text-fg-heading" htmlFor="commission-access-code">
              Enter access code
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                id="commission-access-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                value={commissionPin}
                onChange={(event) => {
                  setCommissionPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setCommissionError("");
                  setCommissionPinMessage("");
                }}
                className="w-28 rounded-lg border bg-transparent px-3 py-2 text-center font-mono text-base tracking-[0.18em] text-fg-heading"
                style={{ borderColor: "var(--leaders-card-border)" }}
              />
              <button
                type="submit"
                disabled={commissionPin.length !== 6 || commissionSubmitting}
                className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold text-fg-heading transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                {commissionSubmitting ? "Checking" : "Unlock"}
              </button>
              <button
                type="button"
                className="cursor-pointer px-2 py-2 text-sm font-semibold text-fg-muted transition-colors hover:text-fg-heading"
                onClick={closeAccessPrompt}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer px-2 py-2 text-sm font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg-heading hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                disabled={commissionPinRequesting}
                onClick={requestCommissionPin}
              >
                {commissionPinRequesting ? "Sending" : "Forgot pin?"}
              </button>
            </div>
            {commissionError && <p className="mt-2 text-sm text-fg-muted">{commissionError}</p>}
            {commissionPinMessage && <p className="mt-2 text-sm text-fg-muted">{commissionPinMessage}</p>}
          </form>
        )}
        <ReferralGrowthChart data={referralChartSeries} />
      </section>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <MetricCard
          label="Referrals"
          value={data.totalAttributedReferrals.toLocaleString()}
          active={activeMetricKey === "referrals"}
          onClick={() => setActiveMetricKey((current) => (current === "referrals" ? null : "referrals"))}
        />
        <MetricCard
          label={directMetricFace === "direct" ? "Direct" : "Indirect"}
          value={(directMetricFace === "direct" ? data.directReferrals.length : indirectReferrals).toLocaleString()}
          ariaLabel={`${directMetricFace === "direct" ? "Direct" : "Indirect"} referral help`}
          actionAriaLabel={directMetricFace === "direct" ? "Show indirect referrals" : "Show direct referrals"}
          flipState={directMetricFace}
          actionIcon={<MetricFlipIcon />}
          active={activeMetricKey === "direct"}
          onClick={() => {
            setActiveMetricKey((current) => (current === "direct" ? null : "direct"));
          }}
          onActionClick={() => {
            setDirectMetricFace((current) => (current === "direct" ? "indirect" : "direct"));
          }}
        />
        <MetricCard
          label="Rewards"
          value={projection ? <><ZecSymbol className="mr-0.5 inline-block" /> {formatZec(projection.projectedPayout)}</> : "-"}
          active={activeMetricKey === "payout"}
          onClick={() => setActiveMetricKey((current) => (current === "payout" ? null : "payout"))}
        />
      </section>
      <div
        aria-live="polite"
        className={`overflow-hidden transition-all duration-300 ease-out ${
          activeMetricKey ? "-mt-5 mb-8 max-h-32 translate-y-0 opacity-100" : "pointer-events-none max-h-0 -translate-y-1 opacity-0"
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
          {activeMetricKey === "referrals" && "All referrals connected to this code across every level."}
          {activeMetricKey === "direct" &&
            (directMetricFace === "direct"
              ? "Direct referrals signed up with this referral code."
              : "Indirect referrals signed up through this code's referral tree.")}
          {activeMetricKey === "payout" &&
            (model === "commission"
              ? "Projected rewards if all referrals purchase names during early access."
              : "Projected rewards if all referrals purchase names during early access.")}
        </p>
      </div>

      <section className="mb-8 grid gap-6">
        <RewardSchedule
          model={model}
          data={data}
          commissionRate={projection?.commissionRate ?? 0.15}
          prices={prices}
          conversions={conversions}
        />

        <DashboardShell>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-fg-heading">Referrals</h2>
            <div
              className="relative grid items-center overflow-hidden rounded-full border p-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
              style={{
                borderColor: "var(--leaders-card-border)",
                gridTemplateColumns: `repeat(${referralLevelOptions.length}, minmax(0, 1fr))`,
              }}
            >
              <span
                className="absolute bottom-1 top-1 rounded-full transition-transform duration-300 ease-out"
                style={{
                  left: "0.25rem",
                  width: `calc(${100 / referralLevelOptions.length}% - ${0.5 / referralLevelOptions.length}rem)`,
                  background: "var(--leaders-rank-gold)",
                  transform: `translateX(${activeReferralLevelIndex * 100}%)`,
                }}
                aria-hidden="true"
              />
              <LevelFilterButton active={referralLevelFilter === "all"} onClick={() => setReferralLevelFilter("all")}>
                All
              </LevelFilterButton>
              {data.depthCounts.map((row) => (
                <LevelFilterButton
                  key={row.depth}
                  active={referralLevelFilter === row.depth}
                  onClick={() => setReferralLevelFilter(row.depth)}
                >
                  {toRoman(row.depth)}
                </LevelFilterButton>
              ))}
            </div>
          </div>
          <div
            className="mt-4 overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
            style={{
              maxHeight: referralsTableLocked
                ? accessPromptMode === "referrals"
                  ? "310px"
                  : "150px"
                : `${Math.max(150, 58 + Math.max(1, visibleReferralTableRows.length) * 42)}px`,
            }}
          >
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--leaders-card-border)" }}>
                    <th className="py-2 pr-3">Lvl</th>
                    <th className="px-3 py-2">ZcashName</th>
                    <th className="w-[6.5rem] px-2 py-2">Joined</th>
                    <th className="w-[3.5rem] px-2 py-2 text-right">Refs</th>
                    <th className="py-2 pl-3 text-right">Reward</th>
                  </tr>
                </thead>
                <tbody className="transition-opacity duration-300">
                  {referralsTableLocked ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        {accessPromptMode === "referrals" ? (
                          <form
                            onSubmit={submitAccessPin}
                            className="mx-auto flex w-full max-w-xs flex-col items-center text-center"
                          >
                            <label className="block text-sm font-semibold text-fg-heading" htmlFor="referrals-access-code">
                              Enter access code
                            </label>
                            <input
                              id="referrals-access-code"
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="one-time-code"
                              maxLength={6}
                              value={commissionPin}
                              onChange={(event) => {
                                setCommissionPin(event.target.value.replace(/\D/g, "").slice(0, 6));
                                setCommissionError("");
                                setCommissionPinMessage("");
                              }}
                              className="mt-2 w-28 rounded-lg border bg-transparent px-3 py-2 text-center font-mono text-base tracking-[0.18em] text-fg-heading"
                              style={{ borderColor: "var(--leaders-card-border)" }}
                            />
                            <div className="mt-2 flex items-center justify-center gap-2">
                              <button
                                type="submit"
                                disabled={commissionPin.length !== 6 || commissionSubmitting}
                                className="cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold text-fg-heading transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                style={{ borderColor: "var(--leaders-card-border)" }}
                              >
                                {commissionSubmitting ? "Checking" : "Unlock"}
                              </button>
                              <button
                                type="button"
                                className="cursor-pointer px-2 py-2 text-sm font-semibold text-fg-muted transition-colors hover:text-fg-heading"
                                onClick={closeAccessPrompt}
                              >
                                Cancel
                              </button>
                            </div>
                            <button
                              type="button"
                              className="mt-2 cursor-pointer px-2 py-1 text-sm font-semibold text-fg-muted underline-offset-2 transition-colors hover:text-fg-heading hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={commissionPinRequesting}
                              onClick={requestCommissionPin}
                            >
                              {commissionPinRequesting ? "Sending" : "Forgot pin?"}
                            </button>
                            {commissionError && <p className="mt-2 text-center text-sm text-fg-muted">{commissionError}</p>}
                            {commissionPinMessage && <p className="mt-2 text-center text-sm text-fg-muted">{commissionPinMessage}</p>}
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="cursor-pointer text-sm font-semibold text-fg-heading underline-offset-2 transition-colors hover:underline"
                            onClick={() => {
                              setAccessPromptMode("referrals");
                              setCommissionPin("");
                              setCommissionError("");
                              setCommissionPinMessage("");
                            }}
                          >
                            View your referrals
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : visibleReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-fg-muted">No referrals at this level.</td>
                    </tr>
                  ) : (
                    visibleReferralTableRows.map((entry) => (
                      <tr key={entry.referral_code} className="border-b last:border-b-0 transition-colors duration-300" style={{ borderColor: "var(--leaders-card-border)" }}>
                        <td className="py-2 pr-3 tabular-nums text-fg-body">{toRoman(entry.depth)}</td>
                        <td className="px-3 py-2 font-semibold text-fg-heading">
                          <Link href={`/leaders/ref/${encodeURIComponent(entry.referral_code)}`} className="underline-offset-2 hover:underline">
                            {entry.name}
                          </Link>
                        </td>
                        <td className="w-[6.5rem] whitespace-nowrap px-2 py-2 text-fg-body">{formatDate(entry.created_at)}</td>
                        <td className="w-[3.5rem] px-2 py-2 text-right font-semibold tabular-nums text-fg-heading">{entry.initiated_referrals}</td>
                        <td className="py-2 pl-3 text-right font-semibold tabular-nums text-fg-heading">
                          <ZecSymbol className="mr-0.5 inline-block" /> {formatZec(projectedReferralPayout(entry.name, entry.depth))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {!referralsTableLocked && visibleReferrals.length > 10 && (
            <div
              className="mt-3 flex items-center justify-between gap-3 border-t pt-3"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              {canShowMoreReferralRows ? (
                <button
                  type="button"
                  className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                  onClick={() => {
                    setVisibleReferralRows((current) => Math.min(current + 10, visibleReferrals.length));
                  }}
                >
                  Show 10 more
                </button>
              ) : (
                <span aria-hidden="true" />
              )}
              {canHideReferralRows && (
                <button
                  type="button"
                  className="ml-auto cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
                  onClick={() => {
                    setVisibleReferralRows((current) => Math.max(10, current - 10));
                  }}
                >
                  Show 10 less
                </button>
              )}
            </div>
          )}
        </DashboardShell>
      </section>

      {model === "commission" && (
        <section className="mb-8">
          <DashboardShell>
            <button
              type="button"
              onClick={() => setProjectionOpen((current) => !current)}
              className="flex w-full cursor-pointer items-center justify-between gap-4 text-left"
              aria-expanded={projectionOpen}
            >
              <span>
                <span className="block text-xl font-semibold text-fg-heading">Payout Projection</span>
                <span className="mt-1 block text-sm text-fg-muted">Project rewards based on assumptions.</span>
              </span>
              <span className="shrink-0 text-sm font-semibold uppercase tracking-[0.08em] text-fg-muted">
                {projectionOpen ? "Collapse" : "Expand"}
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-out ${
                projectionOpen ? "mt-5 max-h-[900px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {projection && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ProjectionStat label="Payout" value={<><ZecSymbol className="mr-0.5 inline-block" /> {formatZec(projection.projectedPayout)}</>} />
                    <ProjectionStat label="Revenue" value={<><ZecSymbol className="mr-0.5 inline-block" /> {formatZec(projection.projectedRevenue)}</>} />
                    <ProjectionStat label="Rate" value={`${Math.round(projection.commissionRate * 100)}%`} />
                  </div>
                  <div className="mt-5 max-w-full overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm sm:min-w-[640px]">
                      <thead>
                        <tr className="border-b text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--leaders-card-border)" }}>
                          <th className="py-2 pr-2 sm:pr-3">Length</th>
                          <th className="px-1.5 py-2 text-right sm:px-3">Refs</th>
                          <th className="px-1.5 py-2 text-right sm:px-3">Price</th>
                          <th className="px-1.5 py-2 text-right sm:px-3">Convert</th>
                          <th className="py-2 pl-2 text-right sm:pl-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projection.rows.map((row) => (
                          <tr key={row.bucket} className="border-b last:border-b-0" style={{ borderColor: "var(--leaders-card-border)" }}>
                            <td className="py-2 pr-2 font-medium text-fg-heading sm:pr-3">{bucketLabel(row.bucket)}</td>
                            <td className="px-1.5 py-2 text-right tabular-nums text-fg-body sm:px-3">{row.count}</td>
                            <td className="px-1.5 py-2 sm:px-3">
                              <NumberInput
                                label={`${bucketLabel(row.bucket)} price`}
                                min={0}
                                step={0.01}
                                value={prices[row.bucket]}
                                onChange={(value) => setPrices((current) => ({ ...current, [row.bucket]: value }))}
                              />
                            </td>
                            <td className="px-1.5 py-2 sm:px-3">
                              <NumberInput
                                label={`${bucketLabel(row.bucket)} conversion percent`}
                                min={0}
                                max={100}
                                step={1}
                                value={conversions[row.bucket]}
                                onChange={(value) => setConversions((current) => ({ ...current, [row.bucket]: value }))}
                                suffix="%"
                              />
                            </td>
                            <td className="py-2 pl-2 text-right tabular-nums text-fg-body sm:pl-3">{formatZec(row.projectedRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </DashboardShell>
        </section>
      )}

    </main>
  );
}

function BackLink() {
  return (
    <Link href="/leaders" className="text-sm font-semibold text-fg-muted underline-offset-4 transition-colors hover:text-fg-heading hover:underline">
      Back to Leaders
    </Link>
  );
}

function ReferralGrowthChart({ data }: { data: ReferralChartPoint[] }) {
  const [activeChartPoint, setActiveChartPoint] = useState<ReferralChartPoint | null>(null);
  const chartGuidePoint = activeChartPoint ?? data[data.length - 1] ?? null;
  const chartGuideReferrals = chartGuidePoint ? chartGuidePoint.direct + chartGuidePoint.indirect : 0;

  return (
    <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--leaders-card-border)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-heading">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: REWARDS_CHART_COLOR }} />
          Rewards
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold text-fg-heading">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: DIRECT_CHART_COLOR }} />
            Direct
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: INDIRECT_CHART_COLOR }} />
            Referrals
          </span>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-fg-muted">No referral history yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={data}
            margin={{ top: 4, right: -12, bottom: 0, left: -12 }}
            onMouseMove={(state) => setActiveChartPoint(getActiveChartPoint(state, data))}
            onMouseLeave={() => setActiveChartPoint(null)}
          >
            <defs>
              <linearGradient id="gradDashboardDirect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DIRECT_CHART_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={DIRECT_CHART_COLOR} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradDashboardIndirect" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INDIRECT_CHART_COLOR} stopOpacity={0.4} />
                <stop offset="100%" stopColor={INDIRECT_CHART_COLOR} stopOpacity={0.05} />
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
              tickFormatter={formatRewardAxisTick}
            />
            <YAxis
              yAxisId="referrals"
              orientation="right"
              tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              allowDecimals={false}
            />
            <Tooltip content={<ReferralChartTooltip />} />
            <Area
              yAxisId="referrals"
              type="monotone"
              dataKey="direct"
              stackId="referrals"
              stroke={DIRECT_CHART_COLOR}
              fill="url(#gradDashboardDirect)"
              strokeWidth={2}
            />
            <Area
              yAxisId="referrals"
              type="monotone"
              dataKey="indirect"
              stackId="referrals"
              stroke={INDIRECT_CHART_COLOR}
              fill="url(#gradDashboardIndirect)"
              strokeWidth={2}
            />
            <Line
              yAxisId="rewards"
              type="monotone"
              dataKey="rewards"
              stroke={REWARDS_CHART_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: REWARDS_CHART_COLOR }}
            />
            <AxisEndpointGuideLines
              point={chartGuidePoint}
              lines={[
                { yAxisId: "rewards", value: chartGuidePoint?.rewards ?? 0, color: REWARDS_CHART_COLOR, side: "left" },
                { yAxisId: "referrals", value: chartGuideReferrals, color: INDIRECT_CHART_COLOR, side: "right" },
                { yAxisId: "referrals", value: chartGuidePoint?.direct ?? 0, color: DIRECT_CHART_COLOR, side: "right" },
              ]}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ReferralChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; payload?: ReferralChartPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const indirect = payload.find((p) => p.name === "indirect");
  const direct = payload.find((p) => p.name === "direct");
  const rewards = payload.find((p) => p.name === "rewards");
  const point = payload[0]?.payload;
  const referrals = (direct?.value ?? 0) + (indirect?.value ?? 0);
  const referralsDelta =
    point?.directDelta === undefined && point?.indirectDelta === undefined
      ? undefined
      : (point?.directDelta ?? 0) + (point?.indirectDelta ?? 0);

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
        Referrals:{" "}
        <span className="font-semibold" style={{ color: INDIRECT_CHART_COLOR }}>
          {referrals}
        </span>
        {formatCountDelta(referralsDelta)}
      </p>
      <p>
        Direct:{" "}
        <span className="font-semibold" style={{ color: DIRECT_CHART_COLOR }}>
          {direct?.value ?? 0}
        </span>
        {formatCountDelta(point?.directDelta)}
      </p>
      <p>
        Rewards:{" "}
        <span className="font-semibold" style={{ color: REWARDS_CHART_COLOR }}>
          <ZecSymbol className="mr-0.5 inline-block" /> {formatZec(rewards?.value ?? 0)}
        </span>
        {formatZecDelta(point?.rewardsDelta)}
      </p>
    </div>
  );
}

function ReferralDashboardSkeleton() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton w="w-24" />
        <Skeleton w="w-24" />
      </div>
      <section
        className="mb-8 rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Skeleton w="w-44" />
            <div className="mt-3 flex items-center gap-1.5">
              <Skeleton w="w-28" />
              <Skeleton w="w-4" />
            </div>
          </div>
          <div className="text-right">
            <Skeleton w="w-16" />
            <div className="mt-3">
              <Skeleton w="w-24" />
            </div>
          </div>
        </div>
        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--leaders-card-border)" }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton w="w-20" />
              <Skeleton w="w-16" />
            </div>
            <Skeleton w="w-20" />
          </div>
          <div className="relative h-[240px] overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 bottom-6 top-4 animate-pulse rounded-lg bg-fg-dim/10" />
            <div className="absolute bottom-10 left-4 h-16 w-[28%] animate-pulse rounded-md bg-fg-dim/15" />
            <div className="absolute bottom-10 left-[34%] h-28 w-[28%] animate-pulse rounded-md bg-fg-dim/15" />
            <div className="absolute bottom-10 right-4 h-40 w-[28%] animate-pulse rounded-md bg-fg-dim/15" />
          </div>
        </div>
      </section>
      <section className="mb-8 grid grid-cols-3 gap-3">
        <MetricSkeleton />
        <MetricSkeleton />
        <MetricSkeleton />
      </section>
      <DashboardShell>
        <div className="flex items-center justify-between gap-3">
          <Skeleton w="w-24" />
          <Skeleton w="w-28" />
        </div>
        <div className="mt-5 max-w-full overflow-hidden">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--leaders-card-border)" }}>
                <th className="py-2 pr-3"><Skeleton w="w-5" /></th>
                <th className="px-3 py-2"><Skeleton w="w-20" /></th>
                <th className="w-[6.5rem] px-2 py-2"><Skeleton w="w-14" /></th>
                <th className="w-[3.5rem] px-2 py-2 text-right"><Skeleton w="w-8" /></th>
                <th className="py-2 pl-3 text-right"><Skeleton w="w-14" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b last:border-b-0" style={{ borderColor: "var(--leaders-card-border)" }}>
                  <td className="py-2 pr-3"><Skeleton w="w-5" /></td>
                  <td className="px-3 py-2"><Skeleton w="w-24" /></td>
                  <td className="w-[6.5rem] px-2 py-2"><Skeleton w="w-20" /></td>
                  <td className="w-[3.5rem] px-2 py-2 text-right"><Skeleton w="w-6" /></td>
                  <td className="py-2 pl-3 text-right"><Skeleton w="w-14" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardShell>
    </>
  );
}

function MetricSkeleton() {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl border px-6 py-5 text-center"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
    >
      <Skeleton w="w-16" />
      <Skeleton w="w-12" />
    </div>
  );
}

function RewardSchedule({
  model,
  data,
  commissionRate,
  prices,
  conversions,
}: {
  model: ProjectionModel;
  data: ReferralDashboardData;
  commissionRate: number;
  prices: PriceByBucket;
  conversions: ConversionByBucket;
}) {
  const depthCountMap = new Map(data.depthCounts.map((row) => [row.depth, row.count]));
  const levels = Array.from({ length: Math.max(3, data.maxDepth) }, (_, index) => index + 1);
  const recentCountsByDepth = buildRecentCountsByDepth(data.descendants);
  const commissionRows = [
    { min: 0, nextAt: 500, label: "0-500", value: "15% commission", rate: 0.15 },
    { min: 500, nextAt: 1500, label: "500-1,500", value: "18% commission", rate: 0.18 },
    { min: 1500, nextAt: 3000, label: "1,500-3,000", value: "20% commission", rate: 0.2 },
    { min: 3000, nextAt: 5000, label: "3,000-5,000", value: "25% commission", rate: 0.25 },
    { min: 5000, nextAt: null, label: "5,000+", value: "30% commission", rate: 0.3 },
  ];
  const nextCommissionTier = commissionRows.find((row) => row.min > data.totalAttributedReferrals) ?? null;
  const referralsToNextTier = nextCommissionTier
    ? Math.max(0, nextCommissionTier.min - data.totalAttributedReferrals)
    : 0;

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-fg-heading">Summary</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {model === "fixed"
              ? "Fixed rewards start at 0.05 ZEC for level I and halve each level."
              : `You are earning ${formatPercent(
                  commissionRate,
                )} commission on all referrals, both direct and indirect. ${
                  nextCommissionTier
                    ? `Get ${referralsToNextTier.toLocaleString()} more ${pluralize(
                        referralsToNextTier,
                        "referral",
                      )} to claim their name and earn ${formatPercent(nextCommissionTier.rate)}.`
                    : "You are at the top commission tier."
                }`}
          </p>
          {model === "commission" && (
            <details className="mt-1 text-xs text-fg-muted">
              <summary className="cursor-pointer font-medium text-fg-muted underline-offset-2 hover:underline">
                Learn more
              </summary>
              <div className="mt-2 grid max-w-xs grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <span className="text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">Refs</span>
                <span className="text-right text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">Rate</span>
                {commissionRows.map((row) => (
                  <CommissionTierRow key={row.label} label={row.label} rate={row.rate} active={row.rate === commissionRate} />
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="mt-5 max-w-full overflow-x-auto">
        <div className="grid min-w-[420px] gap-3">
          <div className="grid grid-cols-[2.75rem_minmax(2.35rem,0.8fr)_minmax(2.5rem,0.8fr)_minmax(2.5rem,0.8fr)_minmax(2.5rem,0.8fr)_minmax(6rem,1.6fr)] gap-2 px-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-fg-muted sm:grid-cols-[3rem_1fr_1fr_1fr_1fr_1fr] sm:gap-3 sm:px-3">
            <span className="text-left">Level</span>
            <span>Refs</span>
            <span>24h</span>
            <span>7d</span>
            <span>30d</span>
            <span>Rewards</span>
          </div>
          {levels.map((level) => (
            <ScheduleRow
              key={level}
              level={level}
              attributedCount={depthCountMap.get(level) ?? 0}
              recentCounts={recentCountsByDepth.get(level) ?? { day: 0, week: 0, month: 0 }}
              reward={
                model === "fixed"
                  ? fixedRewardForDepth(level) * (depthCountMap.get(level) ?? 0)
                  : commissionRewardForDepth(level, data, prices, conversions, commissionRate)
              }
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function ScheduleRow({
  level,
  attributedCount,
  recentCounts,
  reward,
}: {
  level: number;
  attributedCount: number;
  recentCounts: { day: number; week: number; month: number };
  reward: number;
}) {
  return (
    <div
      className="grid grid-cols-[2.75rem_minmax(2.35rem,0.8fr)_minmax(2.5rem,0.8fr)_minmax(2.5rem,0.8fr)_minmax(2.5rem,0.8fr)_minmax(6rem,1.6fr)] items-center gap-2 rounded-lg border px-2 py-2 sm:grid-cols-[3rem_1fr_1fr_1fr_1fr_1fr] sm:gap-3 sm:px-3"
      style={{ borderColor: "var(--leaders-card-border)" }}
    >
      <p className="text-left text-sm font-bold text-fg-heading">{toRoman(level)}</p>
      <ScheduleMetric value={attributedCount.toLocaleString()} />
      <ScheduleMetric value={formatDelta(recentCounts.day)} muted={recentCounts.day === 0} />
      <ScheduleMetric value={formatDelta(recentCounts.week)} muted={recentCounts.week === 0} />
      <ScheduleMetric value={formatDelta(recentCounts.month)} muted={recentCounts.month === 0} />
      <ScheduleMetric value={<ZecAmount value={reward} />} strong />
    </div>
  );
}

function commissionRewardForDepth(
  level: number,
  data: ReferralDashboardData,
  prices: PriceByBucket,
  conversions: ConversionByBucket,
  commissionRate: number,
): number {
  return data.descendants
    .filter((entry) => entry.depth === level)
    .reduce((total, entry) => {
      const bucket = getNameLengthBucket(entry.name);
      const conversionRate = Math.max(0, conversions[bucket]) / 100;
      const price = Number.isFinite(prices[bucket]) ? prices[bucket] : 0;
      return total + price * conversionRate * commissionRate;
    }, 0);
}

function ScheduleMetric({
  value,
  strong = false,
  muted = false,
}: {
  value: ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="text-center">
      <p className={`${strong ? "text-lg" : "text-base"} font-bold tabular-nums ${muted ? "text-fg-muted" : "text-fg-heading"}`}>{value}</p>
    </div>
  );
}

function buildRecentCountsByDepth(
  descendants: ReferralDashboardData["descendants"],
): Map<number, { day: number; week: number; month: number }> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const counts = new Map<number, { day: number; week: number; month: number }>();

  for (const entry of descendants) {
    const createdAt = new Date(entry.created_at).getTime();
    if (!Number.isFinite(createdAt)) continue;
    const age = now - createdAt;
    const row = counts.get(entry.depth) ?? { day: 0, week: 0, month: 0 };
    if (age >= 0 && age <= dayMs) row.day += 1;
    if (age >= 0 && age <= 7 * dayMs) row.week += 1;
    if (age >= 0 && age <= 30 * dayMs) row.month += 1;
    counts.set(entry.depth, row);
  }

  return counts;
}

function formatDelta(value: number): string {
  return value > 0 ? `+${value.toLocaleString()}` : "+0";
}

function pluralize(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}

function ZecAmount({ value }: { value: number }) {
  const [whole, fraction] = formatAlignedZec(value).split(".");

  return (
    <span className="inline-grid grid-cols-[4ch_5ch] items-baseline justify-end tabular-nums">
      <span className="inline-flex items-baseline justify-end">
        <ZecSymbol className="mr-0.5 inline-block" />
        <span>{whole}</span>
      </span>
      <span className="text-left">.{fraction ?? "0000"}</span>
    </span>
  );
}

function formatAlignedZec(value: number): string {
  if (!Number.isFinite(value)) return "0.0000";
  return value.toFixed(4);
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let remaining = Math.max(1, Math.floor(value));
  let result = "";

  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }

  return result;
}

function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border p-5" style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  active = false,
  actionIcon,
  ariaLabel,
  actionAriaLabel,
  flipState,
  onClick,
  onActionClick,
}: {
  label: string;
  value: ReactNode;
  active?: boolean;
  actionIcon?: ReactNode;
  ariaLabel?: string;
  actionAriaLabel?: string;
  flipState?: "direct" | "indirect";
  onClick?: () => void;
  onActionClick?: () => void;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border text-center transition-colors [perspective:700px]"
      style={{
        background: active ? "var(--market-stats-segment-active-bg)" : "var(--leaders-card-bg)",
        borderColor: "var(--leaders-card-border)",
      }}
    >
      {actionIcon && (
        <button
          type="button"
          aria-label={actionAriaLabel}
          onClick={onActionClick}
          className="absolute right-2.5 top-2.5 z-10 cursor-pointer rounded-md p-1 text-fg-muted opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)]"
        >
          {actionIcon}
        </button>
      )}
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        className="flex h-full w-full cursor-pointer flex-col items-center gap-1 px-6 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--partner-card-border-hover)]"
      >
        <span
          className={`flex flex-col items-center gap-1 transition-transform duration-300 ease-out motion-reduce:transition-none ${
            flipState === "indirect" ? "[transform:rotateY(360deg)]" : "[transform:rotateY(0deg)]"
          }`}
        >
          <span className="tabular-nums text-[clamp(1.4rem,2.5vw,2rem)] font-semibold leading-none tracking-tight text-fg-heading">
            {value}
          </span>
          <span className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</span>
        </span>
      </button>
    </div>
  );
}

function MetricFlipIcon() {
  return (
    <span
      className="block h-4 w-4 bg-current"
      style={{
        mask: "url('/icons/flip.svg') center / contain no-repeat",
        WebkitMask: "url('/icons/flip.svg') center / contain no-repeat",
      }}
      aria-hidden="true"
    />
  );
}

function ProjectionStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: "var(--leaders-card-border)" }}>
      <div className="text-lg font-bold tabular-nums text-fg-heading">{value}</div>
      <div className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">{label}</div>
    </div>
  );
}

function LevelFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="relative z-10 cursor-pointer whitespace-nowrap rounded-full px-3 py-1 transition-colors duration-300"
      style={active ? { color: "var(--leaders-rank-text)" } : { color: "var(--fg-muted)" }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-end gap-1">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-16 rounded-lg border bg-transparent px-2 py-1.5 text-right text-sm font-medium tabular-nums text-fg-body sm:w-20"
        style={{ borderColor: "var(--leaders-card-border)" }}
      />
      {suffix && <span className="w-4 text-fg-muted">{suffix}</span>}
    </label>
  );
}

function RuleRow({ label, value, active = false }: { label: string; value: string; active?: boolean }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
      style={{
        background: active ? "var(--market-stats-segment-active-bg)" : "transparent",
        borderColor: "var(--leaders-card-border)",
      }}
    >
      <span className="font-medium text-fg-heading">{label}</span>
      <span className="tabular-nums text-fg-body">{value}</span>
    </div>
  );
}

function CommissionTierRow({ label, rate, active = false }: { label: string; rate: number; active?: boolean }) {
  return (
    <>
      <span className={active ? "font-semibold text-fg-heading" : "text-fg-body"}>{label}</span>
      <span className={`text-right tabular-nums ${active ? "font-semibold text-fg-heading" : "text-fg-body"}`}>
        {formatPercent(rate)}
      </span>
    </>
  );
}

function bucketLabel(bucket: NameLengthBucket): string {
  return bucket === "7+" ? "7+ chars" : `${bucket} char`;
}

function buildReferralChartSeries({
  data,
  model,
  prices,
  conversions,
  commissionRate,
}: {
  data: ReferralDashboardData;
  model: ProjectionModel;
  prices: PriceByBucket;
  conversions: ConversionByBucket;
  commissionRate: number;
}): ReferralChartPoint[] {
  const rows = [...data.descendants].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.referral_code.localeCompare(b.referral_code);
  });
  const points: ReferralChartPoint[] = [];
  let direct = 0;
  let indirect = 0;
  let rewards = 0;
  let lastDate = "";

  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    if (row.depth === 1) {
      direct += 1;
    } else {
      indirect += 1;
    }

    const bucket = getNameLengthBucket(row.name);
    const conversionRate = Math.max(0, conversions[bucket]) / 100;
    rewards +=
      model === "fixed"
        ? fixedRewardForDepth(row.depth) * conversionRate
        : prices[bucket] * conversionRate * commissionRate;

    const point = {
      date,
      direct,
      indirect,
      rewards: roundZec(rewards),
    };

    if (date !== lastDate) {
      points.push(point);
      lastDate = date;
    } else {
      points[points.length - 1] = point;
    }
  }

  for (let i = 1; i < points.length; i++) {
    points[i].directDelta = points[i].direct - points[i - 1].direct;
    points[i].indirectDelta = points[i].indirect - points[i - 1].indirect;
    points[i].rewardsDelta = roundZec(points[i].rewards - points[i - 1].rewards);
  }

  return points;
}

function formatCountDelta(value: number | undefined): ReactNode {
  if (value === undefined) return null;
  return (
    <span className="ml-1 text-fg-muted" style={{ opacity: 0.7 }}>
      ({value > 0 ? "+" : ""}
      {value})
    </span>
  );
}

function formatZecDelta(value: number | undefined): ReactNode {
  if (value === undefined) return null;
  return (
    <span className="ml-1 text-fg-muted" style={{ opacity: 0.7 }}>
      ({value > 0 ? "+" : ""}
      {formatZec(value)})
    </span>
  );
}

function roundZec(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function formatDate(value: string): string {
  return value ? value.slice(0, 10) : "-";
}

function formatRewardAxisTick(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return formatZec(value);
}

function formatZec(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function Skeleton({ w = "w-12" }: { w?: string }) {
  return <span className={`inline-block h-[0.85em] ${w} animate-pulse rounded-md bg-fg-dim/20 align-middle`} />;
}
