"use client";

import { useMemo, useState } from "react";
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
import type { TimeSeriesPoint } from "@/lib/leaders/leaders";

const REWARDS_CHART_COLOR = "var(--leaders-area-rewards)";
const RESERVED_CHART_COLOR = "var(--leaders-area-reserved)";

type SeriesKey = "rewards" | "waitlist" | "referred" | "reserved";
type ChartRange = "7d" | "30d" | "allTime";

function formatZec(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function getActiveChartPoint(state: unknown, data: TimeSeriesPoint[]): TimeSeriesPoint | null {
  const chartState = state as
    | { activeTooltipIndex?: number | string; tooltipIndex?: number | string; activeLabel?: string }
    | null;
  const rawIndex = chartState?.activeTooltipIndex ?? chartState?.tooltipIndex;
  const index = rawIndex === undefined ? NaN : Number(rawIndex);
  if (Number.isInteger(index) && index >= 0 && index < data.length) return data[index];
  if (chartState?.activeLabel) return data.find((point) => point.date === chartState.activeLabel) ?? null;
  return null;
}

function calculateNumericDomain(
  values: number[],
  { integer = false }: { integer?: boolean } = {},
): [number, number] {
  if (values.length === 0) return [0, 1];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    const padding = min === 0 ? 1 : Math.max(Math.abs(min) * 0.1, integer ? 1 : 0.1);
    min -= padding;
    max += padding;
  } else {
    const padding = Math.max((max - min) * 0.08, integer ? 1 : 0.1);
    min -= padding;
    max += padding;
  }
  min = Math.max(0, min);
  if (integer) {
    min = Math.floor(min);
    max = Math.ceil(max);
  }
  return [min, max];
}

function ZecSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ width: "0.6em", height: "0.6em", verticalAlign: "baseline", marginBottom: "0.05em" }}
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6H14L6 14H14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ChartLegendItem({
  tag: Tag = "span",
  label,
  color,
  visible,
  onToggle,
}: {
  tag?: "div" | "span";
  label: string;
  color: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Tag
      className="inline-flex cursor-pointer items-center gap-1.5 select-none transition-colors hover:text-[var(--color-accent-interactive)]"
      role="button"
      tabIndex={0}
      aria-pressed={visible}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={
          visible
            ? { background: color }
            : { background: "transparent", border: "1px solid color-mix(in srgb, var(--fg-muted) 55%, transparent)" }
        }
      />
      {label}
    </Tag>
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
  const total = payload.find((item) => item.name === "nonReferred");
  const referred = payload.find((item) => item.name === "referred");
  const reserved = payload.find((item) => item.name === "reserved");
  const rewards = payload.find((item) => item.name === "rewardsPot");
  const point = payload[0]?.payload;
  const totalVal = (total?.value ?? 0) + (referred?.value ?? 0);
  if (!total && !referred && !reserved && !rewards) return null;

  const formatDelta = (delta: number | undefined) => {
    if (delta === undefined) return null;
    return (
      <span className="ml-1 text-fg-muted" style={{ opacity: 0.7 }}>
        ({delta > 0 ? "+" : ""}
        {delta})
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
      {total ? (
        <p>
          Total:{" "}
          <span className="font-semibold" style={{ color: "var(--leaders-area-non-referred)" }}>
            {totalVal}
          </span>
          {formatDelta(referred ? point?.totalDelta : point?.nonReferredDelta)}
        </p>
      ) : null}
      {referred ? (
        <p>
          Referred:{" "}
          <span className="font-semibold" style={{ color: "var(--leaders-area-referred)" }}>
            {referred.value}
          </span>
          {formatDelta(point?.referredDelta)}
        </p>
      ) : null}
      {reserved ? (
        <p>
          Reserved:{" "}
          <span className="font-semibold" style={{ color: RESERVED_CHART_COLOR }}>
            {reserved.value}
          </span>
          {formatDelta(point?.reservedDelta)}
        </p>
      ) : null}
      {rewards ? (
        <p>
          Rewards:{" "}
          <span className="font-semibold" style={{ color: REWARDS_CHART_COLOR }}>
            <ZecSymbol className="mr-0.5 inline-block" /> {formatZec(rewards.value ?? 0)}
          </span>
          {point?.rewardsDelta === undefined ? null : (
            <span className="ml-1 text-fg-muted" style={{ opacity: 0.7 }}>
              ({point.rewardsDelta > 0 ? "+" : ""}
              {formatZec(point.rewardsDelta)})
            </span>
          )}
        </p>
      ) : null}
      {point?.topReferrer ? (
        <p className="mt-2 text-[0.78rem] text-fg-muted">
          Top: <span className="font-semibold text-fg-heading">{point.topReferrer.name}</span>
          {point.topReferrer.streak ? (
            <img src="/icons/fire-red.apng" alt="" className="mx-0.5 inline-block h-4 w-4 align-text-bottom" />
          ) : null}{" "}
          (+{point.topReferrer.count})
        </p>
      ) : null}
    </div>
  );
}

function AxisEndpointGuideLines({
  point,
  lines,
}: {
  point: TimeSeriesPoint | null;
  lines: { yAxisId: string; value: number; color: string; side: "left" | "right" }[];
}) {
  const plotArea = usePlotArea();
  const xScale = useXAxisScale();
  if (!point || !plotArea || !xScale) return null;
  const x = xScale(point.date, { position: "middle" });
  if (x === undefined) return null;
  return (
    <g pointerEvents="none">
      {lines.map((line) => (
        <GuideLine key={`${line.yAxisId}-${line.color}`} x={Number(x)} plotArea={plotArea} line={line} />
      ))}
    </g>
  );
}

function GuideLine({
  x,
  plotArea,
  line,
}: {
  x: number;
  plotArea: { x: number; width: number };
  line: { yAxisId: string; value: number; color: string; side: "left" | "right" };
}) {
  const yScale = useYAxisScale(line.yAxisId);
  const y = yScale?.(line.value);
  if (y === undefined) return null;
  const axisX = line.side === "left" ? plotArea.x : plotArea.x + plotArea.width;
  return (
    <line x1={x} x2={axisX} y1={y} y2={y} stroke={line.color} strokeDasharray="4 4" strokeWidth={1} opacity={0.35} />
  );
}

export function LeadersSignupChart({ series }: { series: TimeSeriesPoint[] }) {
  const [chartRange, setChartRange] = useState<ChartRange>("allTime");
  const [activeChartPoint, setActiveChartPoint] = useState<TimeSeriesPoint | null>(null);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    rewards: true,
    waitlist: true,
    referred: true,
    reserved: true,
  });

  const chartTimeSeries = useMemo(() => {
    if (chartRange === "allTime" || series.length === 0) return series;
    const latestDate = new Date(`${series[series.length - 1].date}T00:00:00.000Z`);
    const days = chartRange === "7d" ? 7 : 30;
    const cutoff = latestDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000;
    return series.filter((point) => new Date(`${point.date}T00:00:00.000Z`).getTime() >= cutoff);
  }, [chartRange, series]);

  const chartGuidePoint =
    (activeChartPoint && chartTimeSeries.some((point) => point.date === activeChartPoint.date) ? activeChartPoint : null) ??
    chartTimeSeries[chartTimeSeries.length - 1] ??
    null;
  const chartGuideWaitlist = chartGuidePoint
    ? (visible.referred ? chartGuidePoint.referred : 0) + (visible.waitlist ? chartGuidePoint.nonReferred : 0)
    : 0;

  const chartSummaryText = useMemo(() => {
    if (chartTimeSeries.length === 0) return "No change yet";
    const last = chartTimeSeries[chartTimeSeries.length - 1];
    const waitlistDelta =
      chartRange === "allTime" ? last.total : chartTimeSeries.reduce((sum, point) => sum + (point.totalDelta ?? 0), 0);
    const reservedDelta =
      chartRange === "allTime"
        ? last.reserved
        : chartTimeSeries.reduce((sum, point) => sum + (point.reservedDelta ?? 0), 0);
    const rangeLabel = chartRange === "7d" ? "the last 7 days" : chartRange === "30d" ? "the last 30 days" : "all time";
    const parts = [
      ...(visible.waitlist || visible.referred
        ? [`${waitlistDelta >= 0 ? "+" : ""}${waitlistDelta.toLocaleString()} waitlist`]
        : []),
      ...(visible.reserved ? [`${reservedDelta >= 0 ? "+" : ""}${reservedDelta.toLocaleString()} reserved`] : []),
    ];
    return parts.length > 0 ? `${parts.join(", ")} over ${rangeLabel}` : `No visible count series over ${rangeLabel}`;
  }, [chartRange, chartTimeSeries, visible.referred, visible.reserved, visible.waitlist]);

  const rewardsDomain = useMemo(
    () => calculateNumericDomain(visible.rewards ? chartTimeSeries.map((point) => point.rewardsPot) : []),
    [chartTimeSeries, visible.rewards],
  );
  const waitlistDomain = useMemo(() => {
    const values: number[] = [];
    if (visible.referred && visible.waitlist) {
      values.push(...chartTimeSeries.flatMap((point) => [point.referred, point.referred + point.nonReferred]));
    } else {
      if (visible.referred) values.push(...chartTimeSeries.map((point) => point.referred));
      if (visible.waitlist) values.push(...chartTimeSeries.map((point) => point.nonReferred));
    }
    if (visible.reserved) values.push(...chartTimeSeries.map((point) => point.reserved));
    return calculateNumericDomain(values, { integer: true });
  }, [chartTimeSeries, visible.referred, visible.reserved, visible.waitlist]);

  const toggle = (key: SeriesKey) => setVisible((current) => ({ ...current, [key]: !current[key] }));

  return (
    <section
      className="rounded-2xl border p-4 sm:p-6"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      aria-label="Waitlist growth chart"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-fg-heading">{chartSummaryText}</div>
        <div
          className="inline-flex items-center rounded-full border p-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
          style={{ borderColor: "var(--leaders-card-border)" }}
        >
          {(
            [
              ["7d", "7D"],
              ["30d", "30D"],
              ["allTime", "All-time"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="cursor-pointer rounded-full px-3 py-1 transition-colors"
              style={
                chartRange === key
                  ? { background: "var(--leaders-rank-gold)", color: "var(--leaders-rank-text)" }
                  : { color: "var(--fg-muted)" }
              }
              onClick={() => setChartRange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {chartTimeSeries.length === 0 ? (
        <p className="py-20 text-center text-fg-muted">No data yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartTimeSeries}
              margin={{ top: 4, right: -12, bottom: 0, left: -12 }}
              onMouseMove={(state) => setActiveChartPoint(getActiveChartPoint(state, chartTimeSeries))}
              onMouseLeave={() => setActiveChartPoint(null)}
            >
              <defs>
                <linearGradient id="pressGradReferred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--leaders-area-referred)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--leaders-area-referred)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="pressGradNonReferred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--leaders-area-non-referred)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--leaders-area-non-referred)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: "var(--fg-muted)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis
                yAxisId="rewards"
                tick={visible.rewards ? { fill: "var(--fg-muted)", fontSize: 12 } : false}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                domain={rewardsDomain}
                allowDataOverflow
                tickFormatter={(value) => `${Math.round(Number(value))}`}
              />
              <YAxis
                yAxisId="waitlist"
                orientation="right"
                tick={
                  visible.waitlist || visible.referred || visible.reserved
                    ? { fill: "var(--fg-muted)", fontSize: 12 }
                    : false
                }
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                domain={waitlistDomain}
                allowDataOverflow
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area yAxisId="waitlist" type="monotone" dataKey="referred" stackId="1" stroke="var(--leaders-area-referred)" fill="url(#pressGradReferred)" strokeWidth={2} hide={!visible.referred} />
              <Area yAxisId="waitlist" type="monotone" dataKey="nonReferred" stackId="1" stroke="var(--leaders-area-non-referred)" fill="url(#pressGradNonReferred)" strokeWidth={2} hide={!visible.waitlist} />
              <Line yAxisId="rewards" type="monotone" dataKey="rewardsPot" stroke={REWARDS_CHART_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: REWARDS_CHART_COLOR }} hide={!visible.rewards} />
              <Line yAxisId="waitlist" type="monotone" dataKey="reserved" stroke={RESERVED_CHART_COLOR} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: RESERVED_CHART_COLOR }} hide={!visible.reserved} />
              <AxisEndpointGuideLines
                point={chartGuidePoint}
                lines={[
                  ...(visible.rewards
                    ? [{ yAxisId: "rewards", value: chartGuidePoint?.rewardsPot ?? 0, color: REWARDS_CHART_COLOR, side: "left" as const }]
                    : []),
                  ...(visible.waitlist
                    ? [{ yAxisId: "waitlist", value: chartGuideWaitlist, color: "var(--leaders-area-non-referred)", side: "right" as const }]
                    : []),
                  ...(visible.referred
                    ? [{ yAxisId: "waitlist", value: chartGuidePoint?.referred ?? 0, color: "var(--leaders-area-referred)", side: "right" as const }]
                    : []),
                  ...(visible.reserved
                    ? [{ yAxisId: "waitlist", value: chartGuidePoint?.reserved ?? 0, color: RESERVED_CHART_COLOR, side: "right" as const }]
                    : []),
                ]}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3 px-2 text-sm font-semibold text-fg-heading">
            <ChartLegendItem tag="div" label="Rewards" color={REWARDS_CHART_COLOR} visible={visible.rewards} onToggle={() => toggle("rewards")} />
            <div className="flex items-center gap-3">
              <ChartLegendItem label="Waitlist" color="var(--leaders-area-non-referred)" visible={visible.waitlist} onToggle={() => toggle("waitlist")} />
              <ChartLegendItem label="Referred" color="var(--leaders-area-referred)" visible={visible.referred} onToggle={() => toggle("referred")} />
              <ChartLegendItem label="Reserved" color={RESERVED_CHART_COLOR} visible={visible.reserved} onToggle={() => toggle("reserved")} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
