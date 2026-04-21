"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

interface Point {
  date: string;
  referred: number;
  nonReferred: number;
  rewardsPot: number;
}

const DATA: Point[] = [
  { date: "Apr 01", referred: 20, nonReferred: 120, rewardsPot: 11 },
  { date: "Apr 03", referred: 28, nonReferred: 180, rewardsPot: 16 },
  { date: "Apr 05", referred: 42, nonReferred: 252, rewardsPot: 23 },
  { date: "Apr 07", referred: 60, nonReferred: 320, rewardsPot: 31 },
  { date: "Apr 09", referred: 78, nonReferred: 410, rewardsPot: 40 },
  { date: "Apr 11", referred: 104, nonReferred: 512, rewardsPot: 51 },
  { date: "Apr 13", referred: 134, nonReferred: 618, rewardsPot: 63 },
  { date: "Apr 15", referred: 172, nonReferred: 720, rewardsPot: 76 },
  { date: "Apr 17", referred: 214, nonReferred: 820, rewardsPot: 90 },
  { date: "Apr 19", referred: 262, nonReferred: 924, rewardsPot: 105 },
];

const MAX_WAITLIST = 1200;
const MAX_REWARDS = 120;

function ChartLive() {
  return (
    <section
      style={{
        width: "100%",
        maxWidth: 820,
        borderRadius: 16,
        border: "1px solid var(--leaders-card-border)",
        background: "var(--leaders-card-bg)",
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "var(--fg-heading)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--leaders-area-rewards)" }} />
          Rewards
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "0.875rem", fontWeight: 600, color: "var(--fg-heading)" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--leaders-area-non-referred)" }} />
            Waitlist
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--leaders-area-referred)" }} />
            Referred
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={DATA} margin={{ top: 4, right: -12, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="galleryGradReferred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--leaders-area-referred)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--leaders-area-referred)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="galleryGradNonReferred" x1="0" y1="0" x2="0" y2="1">
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
            tickFormatter={(v) => `${Math.round(Number(v))}`}
          />
          <YAxis
            yAxisId="waitlist"
            orientation="right"
            tick={{ fill: "var(--fg-muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            allowDecimals={false}
          />
          <Area
            yAxisId="waitlist"
            type="monotone"
            dataKey="referred"
            stackId="1"
            stroke="var(--leaders-area-referred)"
            fill="url(#galleryGradReferred)"
            strokeWidth={2}
          />
          <Area
            yAxisId="waitlist"
            type="monotone"
            dataKey="nonReferred"
            stackId="1"
            stroke="var(--leaders-area-non-referred)"
            fill="url(#galleryGradNonReferred)"
            strokeWidth={2}
          />
          <Line
            yAxisId="rewards"
            type="monotone"
            dataKey="rewardsPot"
            stroke="var(--leaders-area-rewards)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--leaders-area-rewards)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

function buildChartPaths() {
  const n = DATA.length;
  const left = 40;
  const right = 770;
  const top = 20;
  const bottom = 260;
  const plotW = right - left;
  const plotH = bottom - top;

  const xAt = (i: number) => left + (i / (n - 1)) * plotW;
  const yWaitlist = (v: number) => bottom - (v / MAX_WAITLIST) * plotH;
  const yRewards = (v: number) => bottom - (v / MAX_REWARDS) * plotH;

  const referredTop: Array<[number, number]> = DATA.map((d, i) => [xAt(i), yWaitlist(d.referred)]);
  const stackedTop: Array<[number, number]> = DATA.map((d, i) => [xAt(i), yWaitlist(d.referred + d.nonReferred)]);
  const rewardsLine: Array<[number, number]> = DATA.map((d, i) => [xAt(i), yRewards(d.rewardsPot)]);

  const fmt = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L ");

  const referredFill = `M ${left},${bottom} L ${fmt(referredTop)} L ${right},${bottom} Z`;
  const nonReferredFill =
    `M ${fmt(referredTop)} L ` +
    stackedTop
      .slice()
      .reverse()
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" L ") +
    " Z";

  const referredStroke = `M ${fmt(referredTop)}`;
  const stackedStroke = `M ${fmt(stackedTop)}`;
  const rewardsStroke = `M ${fmt(rewardsLine)}`;

  const xTicks = DATA.map((d, i) => ({ x: xAt(i), label: d.date }));
  const yTicksRight = [0, 300, 600, 900, 1200].map((v) => ({ y: yWaitlist(v), label: v.toString() }));
  const yTicksLeft = [0, 30, 60, 90, 120].map((v) => ({ y: yRewards(v), label: v.toString() }));

  return {
    referredFill,
    nonReferredFill,
    referredStroke,
    stackedStroke,
    rewardsStroke,
    xTicks,
    yTicksRight,
    yTicksLeft,
    left,
    right,
    top,
    bottom,
  };
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  const {
    referredFill,
    nonReferredFill,
    referredStroke,
    stackedStroke,
    rewardsStroke,
    xTicks,
    yTicksRight,
    yTicksLeft,
    left,
    right,
    top,
    bottom,
  } = buildChartPaths();

  const grid = yTicksRight
    .map(({ y }) => `<line x1="${left}" x2="${right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${p.border}" stroke-dasharray="3 3" />`)
    .join("\n      ");

  const xAxisLine = `<line x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}" stroke="${p.border}" />`;
  const yAxisLineLeft = `<line x1="${left}" x2="${left}" y1="${top}" y2="${bottom}" stroke="${p.border}" />`;
  const yAxisLineRight = `<line x1="${right}" x2="${right}" y1="${top}" y2="${bottom}" stroke="${p.border}" />`;

  const xLabels = xTicks
    .map(({ x, label }) => `<text x="${x.toFixed(1)}" y="${(bottom + 16).toFixed(1)}" fill="${p.fgMuted}" font-size="12" text-anchor="middle">${label}</text>`)
    .join("\n      ");

  const yLabelsLeft = yTicksLeft
    .map(({ y, label }) => `<text x="${(left - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${p.fgMuted}" font-size="12" text-anchor="end">${label}</text>`)
    .join("\n      ");

  const yLabelsRight = yTicksRight
    .map(({ y, label }) => `<text x="${(right + 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${p.fgMuted}" font-size="12" text-anchor="start">${label}</text>`)
    .join("\n      ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Leaders — Rewards / waitlist chart</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
  .panel {
    border-radius: 16px;
    border: 1px solid ${p.leadersCardBorder};
    background: ${p.leadersCardBg};
    padding: 16px;
  }
  .legend {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    color: ${p.fgHeading};
  }
  .legend-right { display: flex; align-items: center; gap: 12px; }
  .swatch { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
  .item { display: inline-flex; align-items: center; gap: 6px; }
  .chart-wrap { width: 100%; aspect-ratio: 820 / 300; }
  svg.chart { width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
  <div class="stage">
    <section class="panel">
      <div class="legend">
        <span class="item"><span class="swatch" style="background:${p.leadersAreaRewards}"></span>Rewards</span>
        <span class="legend-right">
          <span class="item"><span class="swatch" style="background:${p.leadersAreaNonReferred}"></span>Waitlist</span>
          <span class="item"><span class="swatch" style="background:${p.leadersAreaReferred}"></span>Referred</span>
        </span>
      </div>
      <div class="chart-wrap">
        <svg class="chart" viewBox="0 0 820 300" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="gradReferred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${p.leadersAreaReferred}" stop-opacity="0.4" />
              <stop offset="100%" stop-color="${p.leadersAreaReferred}" stop-opacity="0.05" />
            </linearGradient>
            <linearGradient id="gradNonReferred" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${p.leadersAreaNonReferred}" stop-opacity="0.4" />
              <stop offset="100%" stop-color="${p.leadersAreaNonReferred}" stop-opacity="0.05" />
            </linearGradient>
          </defs>

      ${grid}
      ${xAxisLine}
      ${yAxisLineLeft}
      ${yAxisLineRight}

      <path d="${referredFill}" fill="url(#gradReferred)" />
      <path d="${nonReferredFill}" fill="url(#gradNonReferred)" />

      <path d="${referredStroke}" fill="none" stroke="${p.leadersAreaReferred}" stroke-width="2" stroke-linejoin="round" />
      <path d="${stackedStroke}" fill="none" stroke="${p.leadersAreaNonReferred}" stroke-width="2" stroke-linejoin="round" />
      <path d="${rewardsStroke}" fill="none" stroke="${p.leadersAreaRewards}" stroke-width="2" stroke-linejoin="round" />

      ${xLabels}
      ${yLabelsLeft}
      ${yLabelsRight}
        </svg>
      </div>
    </section>
  </div>
</body>
</html>
`;
}

const SNIPPETS: Snippets = {
  dark: buildSnippet("dark"),
  light: buildSnippet("light"),
  monochrome: buildSnippet("monochrome"),
};

export default function LeadersChartCard() {
  return (
    <GalleryCard
      title="Leaders — Rewards / waitlist area chart"
      description="Bordered panel: legend (Rewards / Waitlist / Referred) + stacked area chart with dual Y-axes (rewards left, waitlist right) and a rewards line overlay. Live preview uses Recharts; snippet is a hand-built SVG with the same paths from the same frozen data."
      selector="main > section.mb-8.rounded-2xl.border.p-4.sm:p-6 > .recharts-responsive-container > div > div > svg"
      filename="leaders-rewards-chart.html"
      snippets={SNIPPETS}
    >
      <ChartLive />
    </GalleryCard>
  );
}
