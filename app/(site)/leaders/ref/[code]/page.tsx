"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getReferralDashboard, type ReferralScope } from "@/lib/leaders/leaders";
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
  const [activeMetricKey, setActiveMetricKey] = useState<"direct" | "attributed" | "payout" | null>(null);
  const [prices, setPrices] = useState<PriceByBucket>(DEFAULT_PRICE_BY_BUCKET);
  const [conversions, setConversions] = useState<ConversionByBucket>(DEFAULT_CONVERSION_BY_BUCKET);

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

  const model: ProjectionModel = data?.root?.cabal ? "commission" : "fixed";

  const projection = useMemo(() => {
    if (!data) return null;
    return calculateReferralProjection({ data, model, prices, conversions });
  }, [conversions, data, model, prices]);

  const visibleReferrals = useMemo(() => {
    if (!data) return [];
    if (referralLevelFilter === "all") return data.descendants;
    return data.descendants.filter((entry) => entry.depth === referralLevelFilter);
  }, [data, referralLevelFilter]);
  const referralLevelOptions = useMemo(
    () => (data ? ["all" as const, ...data.depthCounts.map((row) => row.depth)] : ["all" as const]),
    [data],
  );
  const activeReferralLevelIndex = Math.max(
    0,
    referralLevelOptions.findIndex((option) => option === referralLevelFilter),
  );

  const projectedReferralPayout = (name: string, depth: number): number => {
    const bucket = getNameLengthBucket(name);
    const conversionRate = Math.max(0, conversions[bucket]) / 100;
    if (model === "fixed") return fixedRewardForDepth(depth) * conversionRate;
    return prices[bucket] * conversionRate * (projection?.commissionRate ?? 0.15);
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
        <p className="py-20 text-center text-fg-muted">Loading referral dashboard...</p>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">Referral Dashboard</p>
          <p className="rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--leaders-card-border)" }}>
            {data.waitlistPosition ? `#${data.waitlistPosition.toLocaleString()}` : "-"}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
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
            <p className="mt-1 font-mono text-sm text-fg-muted">{data.referralCode}</p>
          </div>
          <div className="text-sm text-fg-muted">
            {data.root ? (
              <>
                Joined <span className="font-medium text-fg-body">{formatDate(data.root.created_at)}</span>
              </>
            ) : (
              "Referral code not found as a waitlist member."
            )}
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-3 gap-3">
        <MetricCard
          label="Direct"
          value={data.directReferrals.length.toLocaleString()}
          active={activeMetricKey === "direct"}
          onClick={() => setActiveMetricKey((current) => (current === "direct" ? null : "direct"))}
        />
        <MetricCard
          label="Attributed"
          value={data.totalAttributedReferrals.toLocaleString()}
          active={activeMetricKey === "attributed"}
          onClick={() => setActiveMetricKey((current) => (current === "attributed" ? null : "attributed"))}
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
          {activeMetricKey === "direct" && "People who joined using this referral code."}
          {activeMetricKey === "attributed" && "All referrals connected to this code across every level."}
          {activeMetricKey === "payout" && "Projected until referrals complete purchases."}
        </p>
      </div>

      <section className="mb-8 grid gap-6">
        <RewardSchedule model={model} data={data} commissionRate={projection?.commissionRate ?? 0.15} />

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
            style={{ maxHeight: `${Math.max(150, 58 + Math.max(1, visibleReferrals.length) * 42)}px` }}
          >
            <div className="max-w-full overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead>
                  <tr className="border-b text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--leaders-card-border)" }}>
                    <th className="py-2 pr-3">Name</th>
                    <th className="px-3 py-2 text-right">Lvl</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="py-2 pl-3 text-right">Refs</th>
                    <th className="py-2 pl-3 text-right">Reward</th>
                  </tr>
                </thead>
                <tbody className="transition-opacity duration-300">
                  {visibleReferrals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-fg-muted">No referrals at this level.</td>
                    </tr>
                  ) : (
                    visibleReferrals.map((entry) => (
                      <tr key={entry.referral_code} className="border-b last:border-b-0 transition-colors duration-300" style={{ borderColor: "var(--leaders-card-border)" }}>
                        <td className="py-2 pr-3 font-semibold text-fg-heading">
                          <Link href={`/leaders/ref/${encodeURIComponent(entry.referral_code)}`} className="underline-offset-2 hover:underline">
                            {entry.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg-body">{toRoman(entry.depth)}</td>
                        <td className="px-3 py-2 text-fg-body">{formatDate(entry.created_at)}</td>
                        <td className="py-2 pl-3 text-right font-semibold tabular-nums text-fg-heading">{entry.initiated_referrals}</td>
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
                <span className="mt-1 block text-sm text-fg-muted">Projected until referrals complete purchases.</span>
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
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--leaders-card-border)" }}>
                          <th className="py-2 pr-3">Length</th>
                          <th className="px-3 py-2 text-right">Refs</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Convert</th>
                          <th className="py-2 pl-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projection.rows.map((row) => (
                          <tr key={row.bucket} className="border-b last:border-b-0" style={{ borderColor: "var(--leaders-card-border)" }}>
                            <td className="py-2 pr-3 font-medium text-fg-heading">{bucketLabel(row.bucket)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-fg-body">{row.count}</td>
                            <td className="px-3 py-2">
                              <NumberInput
                                label={`${bucketLabel(row.bucket)} price`}
                                min={0}
                                step={0.01}
                                value={prices[row.bucket]}
                                onChange={(value) => setPrices((current) => ({ ...current, [row.bucket]: value }))}
                              />
                            </td>
                            <td className="px-3 py-2">
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
                            <td className="py-2 pl-3 text-right tabular-nums text-fg-body">{formatZec(row.projectedRevenue)}</td>
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

function RewardSchedule({
  model,
  data,
  commissionRate,
}: {
  model: ProjectionModel;
  data: ReferralDashboardData;
  commissionRate: number;
}) {
  const depthCountMap = new Map(data.depthCounts.map((row) => [row.depth, row.count]));
  const fixedLevels = Array.from({ length: Math.max(3, data.maxDepth) }, (_, index) => index + 1);
  const recentCountsByDepth = buildRecentCountsByDepth(data.descendants);
  const commissionRows = [
    { label: "0+ referrals", value: "15% commission", rate: 0.15 },
    { label: "500+ referrals", value: "18% commission", rate: 0.18 },
    { label: "1,500+ referrals", value: "20% commission", rate: 0.2 },
    { label: "3,000+ referrals", value: "25% commission", rate: 0.25 },
    { label: "5,000+ referrals", value: "30% commission", rate: 0.3 },
  ];

  return (
    <DashboardShell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-fg-heading">Summary</h2>
          <p className="mt-1 text-sm text-fg-muted">
            {model === "fixed"
              ? "Fixed rewards start at 0.05 ZEC for level I and halve each level."
              : "Commission is based on total attributed referrals across every level."}
          </p>
        </div>
      </div>

      {model === "fixed" ? (
        <div className="mt-5 max-w-full overflow-x-auto">
          <div className="grid min-w-[460px] gap-3">
            <div className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr_1fr] gap-3 px-3 text-right text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
              <span className="text-left">Lvl</span>
              <span>Refs</span>
              <span>24h</span>
              <span>7d</span>
              <span>30d</span>
              <span>Rewards</span>
            </div>
            {fixedLevels.map((level) => (
              <FixedScheduleRow
                key={level}
                level={level}
                attributedCount={depthCountMap.get(level) ?? 0}
                recentCounts={recentCountsByDepth.get(level) ?? { day: 0, week: 0, month: 0 }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 text-sm">
          {commissionRows.map((row) => (
            <RuleRow
              key={row.label}
              label={row.label}
              value={row.value}
              active={row.rate === commissionRate}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function FixedScheduleRow({
  level,
  attributedCount,
  recentCounts,
}: {
  level: number;
  attributedCount: number;
  recentCounts: { day: number; week: number; month: number };
}) {
  const rate = fixedRewardForDepth(level);
  const projectedTotal = rate * attributedCount;

  return (
    <div
      className="grid grid-cols-[1.5rem_1fr_1fr_1fr_1fr_1fr] items-center gap-3 rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--leaders-card-border)" }}
    >
      <p className="text-left text-sm font-bold text-fg-heading">{toRoman(level)}</p>
      <ScheduleMetric value={attributedCount.toLocaleString()} />
      <ScheduleMetric value={formatDelta(recentCounts.day)} muted={recentCounts.day === 0} />
      <ScheduleMetric value={formatDelta(recentCounts.week)} muted={recentCounts.week === 0} />
      <ScheduleMetric value={formatDelta(recentCounts.month)} muted={recentCounts.month === 0} />
      <ScheduleMetric value={<ZecAmount value={projectedTotal} />} strong />
    </div>
  );
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
    <div className="text-right">
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
      className="rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)] sm:p-5"
      style={{
        background: active ? "var(--market-stats-segment-active-bg)" : "var(--leaders-card-bg)",
        borderColor: "var(--leaders-card-border)",
      }}
    >
      <div className="text-xl font-bold tabular-nums text-fg-heading sm:text-2xl">{value}</div>
      <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-fg-muted sm:text-[0.78rem] sm:tracking-[0.08em]">{label}</div>
    </button>
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
        className="w-20 rounded-lg border bg-transparent px-2 py-1.5 text-right text-sm font-medium tabular-nums text-fg-body"
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

function bucketLabel(bucket: NameLengthBucket): string {
  return bucket === "7+" ? "7+ chars" : `${bucket} char`;
}

function formatDate(value: string): string {
  return value ? value.slice(0, 10) : "-";
}

function formatZec(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
