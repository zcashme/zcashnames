"use client";

import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

const SERIES = [
  { date: "Apr 14", direct: 4, indirect: 3, rewards: 0.11 },
  { date: "Apr 15", direct: 6, indirect: 4, rewards: 0.18 },
  { date: "Apr 16", direct: 8, indirect: 6, rewards: 0.24 },
  { date: "Apr 17", direct: 9, indirect: 8, rewards: 0.31 },
  { date: "Apr 18", direct: 12, indirect: 9, rewards: 0.39 },
  { date: "Apr 19", direct: 14, indirect: 12, rewards: 0.48 },
  { date: "Apr 20", direct: 16, indirect: 15, rewards: 0.58 },
];

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={{ width: 14, height: 14 }}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
    </svg>
  );
}

function buildChartPaths(width: number, height: number) {
  const left = 28;
  const right = width - 28;
  const top = 14;
  const bottom = height - 32;
  const spanX = right - left;
  const spanY = bottom - top;
  const maxReferrals = Math.max(...SERIES.map((point) => point.direct + point.indirect));
  const maxRewards = Math.max(...SERIES.map((point) => point.rewards));

  const directPoints = SERIES.map((point, index) => {
    const x = left + (spanX * index) / (SERIES.length - 1);
    const y = bottom - (spanY * point.direct) / maxReferrals;
    return { x, y };
  });

  const totalPoints = SERIES.map((point, index) => {
    const total = point.direct + point.indirect;
    const x = left + (spanX * index) / (SERIES.length - 1);
    const y = bottom - (spanY * total) / maxReferrals;
    return { x, y };
  });

  const rewardPoints = SERIES.map((point, index) => {
    const x = left + (spanX * index) / (SERIES.length - 1);
    const y = bottom - (spanY * point.rewards) / maxRewards;
    return { x, y };
  });

  const linePath = (points: Array<{ x: number; y: number }>) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  const areaPath = (points: Array<{ x: number; y: number }>) =>
    `${linePath(points)} L${points[points.length - 1].x.toFixed(2)} ${bottom.toFixed(2)} L${points[0].x.toFixed(2)} ${bottom.toFixed(2)} Z`;

  return {
    directLine: linePath(directPoints),
    directArea: areaPath(directPoints),
    totalLine: linePath(totalPoints),
    totalArea: areaPath(totalPoints),
    rewardLine: linePath(rewardPoints),
    gridYs: [
      top,
      top + spanY / 3,
      top + (spanY * 2) / 3,
      bottom,
    ],
    labelXs: SERIES.map((_, index) => left + (spanX * index) / (SERIES.length - 1)),
    labels: SERIES.map((point) => point.date),
  };
}

function ReferralDashboardHeroView() {
  const chart = buildChartPaths(760, 240);

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 860,
        borderRadius: 16,
        border: "1px solid var(--leaders-card-border)",
        background: "var(--leaders-card-bg)",
        padding: "1.5rem",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h2 style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0, color: "var(--fg-heading)", fontSize: "1.9rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            atlas.zcash
          </h2>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.875rem", color: "var(--fg-muted)" }}>ZQR42X</span>
            <button
              type="button"
              title="Copy referral link"
              style={{ background: "transparent", border: "none", padding: 0, color: "var(--fg-muted)", display: "inline-flex", cursor: "pointer" }}
            >
              <CopyIcon />
            </button>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              display: "inline-block",
              margin: 0,
              padding: "0.25rem 0.75rem",
              borderRadius: 999,
              border: "1px solid var(--leaders-card-border)",
              color: "var(--fg-muted)",
              fontSize: "0.72rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            #218
          </p>
          <div style={{ marginTop: 8, color: "var(--fg-muted)", fontSize: "0.875rem" }}>
            Joined <span style={{ color: "var(--fg-body)", fontWeight: 500 }}>April 14, 2026</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--leaders-card-border)", paddingTop: "1.25rem" }}>
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--fg-heading)", fontSize: "0.875rem", fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--leaders-area-rewards)" }} />
            Rewards
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--fg-heading)", fontSize: "0.875rem", fontWeight: 600 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--leaders-area-referred)" }} />
              Direct
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--leaders-area-non-referred)" }} />
              Referrals
            </span>
          </div>
        </div>

        <svg viewBox="0 0 760 240" style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }} aria-hidden="true">
          <defs>
            <linearGradient id="galleryReferralDirectArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--leaders-area-referred)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--leaders-area-referred)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="galleryReferralTotalArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--leaders-area-non-referred)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--leaders-area-non-referred)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {chart.gridYs.map((y) => (
            <line key={y} x1="28" x2="732" y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
          ))}

          <line x1="28" x2="28" y1="14" y2="208" stroke="var(--border)" />
          <line x1="732" x2="732" y1="14" y2="208" stroke="var(--border)" />
          <line x1="28" x2="732" y1="208" y2="208" stroke="var(--border)" />

          <path d={chart.totalArea} fill="url(#galleryReferralTotalArea)" />
          <path d={chart.directArea} fill="url(#galleryReferralDirectArea)" />
          <path d={chart.totalLine} fill="none" stroke="var(--leaders-area-non-referred)" strokeWidth="2" />
          <path d={chart.directLine} fill="none" stroke="var(--leaders-area-referred)" strokeWidth="2" />
          <path d={chart.rewardLine} fill="none" stroke="var(--leaders-area-rewards)" strokeWidth="2" />

          <line x1={chart.labelXs[chart.labelXs.length - 1]} x2="28" y1="14" y2="14" stroke="var(--leaders-area-rewards)" strokeDasharray="4 4" opacity="0.35" />
          <line x1={chart.labelXs[chart.labelXs.length - 1]} x2="732" y1="50" y2="50" stroke="var(--leaders-area-non-referred)" strokeDasharray="4 4" opacity="0.35" />
          <line x1={chart.labelXs[chart.labelXs.length - 1]} x2="732" y1="108" y2="108" stroke="var(--leaders-area-referred)" strokeDasharray="4 4" opacity="0.35" />

          {chart.labelXs.map((x, index) => (
            <text key={chart.labels[index]} x={x} y="230" textAnchor="middle" fill="var(--fg-muted)" fontSize="12">
              {chart.labels[index]}
            </text>
          ))}
        </svg>
      </div>
    </section>
  );
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  const chart = buildChartPaths(760, 240);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Referral dashboard hero</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage { max-width: 920px; margin: 0 auto; padding: 2rem 1rem; }
  .panel {
    width: 100%;
    border-radius: 16px;
    border: 1px solid ${p.leadersCardBorder};
    background: ${p.leadersCardBg};
    padding: 1.5rem;
    box-sizing: border-box;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  h1 {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    color: ${p.fgHeading};
    font-size: 1.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .code-row {
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.875rem;
    color: ${p.fgMuted};
  }
  .copy {
    background: transparent;
    border: none;
    padding: 0;
    color: ${p.fgMuted};
    display: inline-flex;
    cursor: pointer;
  }
  .copy svg { width: 14px; height: 14px; }
  .meta { text-align: right; }
  .rank {
    display: inline-block;
    margin: 0;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    border: 1px solid ${p.leadersCardBorder};
    color: ${p.fgMuted};
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .joined {
    margin-top: 8px;
    color: ${p.fgMuted};
    font-size: 0.875rem;
  }
  .joined strong {
    color: ${p.fgBody};
    font-weight: 500;
  }
  .chart-block {
    margin-top: 1.5rem;
    border-top: 1px solid ${p.leadersCardBorder};
    padding-top: 1.25rem;
  }
  .legend-row {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .legend,
  .legend-group {
    display: flex;
    align-items: center;
    gap: 12px;
    color: ${p.fgHeading};
    font-size: 0.875rem;
    font-weight: 600;
  }
  .legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    display: inline-block;
  }
  .rewards { background: ${p.leadersAreaRewards}; }
  .direct { background: ${p.leadersAreaReferred}; }
  .total { background: ${p.leadersAreaNonReferred}; }
  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .grid { stroke: ${p.border}; stroke-dasharray: 3 3; }
  .axis { stroke: ${p.border}; }
  .direct-line { fill: none; stroke: ${p.leadersAreaReferred}; stroke-width: 2; }
  .total-line { fill: none; stroke: ${p.leadersAreaNonReferred}; stroke-width: 2; }
  .reward-line { fill: none; stroke: ${p.leadersAreaRewards}; stroke-width: 2; }
  .guide-direct { stroke: ${p.leadersAreaReferred}; stroke-dasharray: 4 4; opacity: 0.35; }
  .guide-total { stroke: ${p.leadersAreaNonReferred}; stroke-dasharray: 4 4; opacity: 0.35; }
  .guide-reward { stroke: ${p.leadersAreaRewards}; stroke-dasharray: 4 4; opacity: 0.35; }
  .xlab { fill: ${p.fgMuted}; font-size: 12px; }
</style>
</head>
<body>
  <div class="stage">
    <section class="panel">
      <div class="head">
        <div>
          <h1>atlas.zcash</h1>
          <div class="code-row">
            <span class="code">ZQR42X</span>
            <button type="button" class="copy" title="Copy referral link">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                <path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
              </svg>
            </button>
          </div>
        </div>
        <div class="meta">
          <p class="rank">#218</p>
          <div class="joined">Joined <strong>April 14, 2026</strong></div>
        </div>
      </div>

      <div class="chart-block">
        <div class="legend-row">
          <div class="legend">
            <span class="legend-item"><span class="dot rewards"></span>Rewards</span>
          </div>
          <div class="legend-group">
            <span class="legend-item"><span class="dot direct"></span>Direct</span>
            <span class="legend-item"><span class="dot total"></span>Referrals</span>
          </div>
        </div>

        <svg viewBox="0 0 760 240" aria-hidden="true">
          <defs>
            <linearGradient id="refDirectArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${p.leadersAreaReferred}" stop-opacity="0.4" />
              <stop offset="100%" stop-color="${p.leadersAreaReferred}" stop-opacity="0.05" />
            </linearGradient>
            <linearGradient id="refTotalArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="${p.leadersAreaNonReferred}" stop-opacity="0.4" />
              <stop offset="100%" stop-color="${p.leadersAreaNonReferred}" stop-opacity="0.05" />
            </linearGradient>
          </defs>
          ${chart.gridYs.map((y) => `<line class="grid" x1="28" x2="732" y1="${y}" y2="${y}" />`).join("\n          ")}
          <line class="axis" x1="28" x2="28" y1="14" y2="208" />
          <line class="axis" x1="732" x2="732" y1="14" y2="208" />
          <line class="axis" x1="28" x2="732" y1="208" y2="208" />
          <path d="${chart.totalArea}" fill="url(#refTotalArea)" />
          <path d="${chart.directArea}" fill="url(#refDirectArea)" />
          <path class="total-line" d="${chart.totalLine}" />
          <path class="direct-line" d="${chart.directLine}" />
          <path class="reward-line" d="${chart.rewardLine}" />
          <line class="guide-reward" x1="${chart.labelXs[chart.labelXs.length - 1]}" x2="28" y1="14" y2="14" />
          <line class="guide-total" x1="${chart.labelXs[chart.labelXs.length - 1]}" x2="732" y1="50" y2="50" />
          <line class="guide-direct" x1="${chart.labelXs[chart.labelXs.length - 1]}" x2="732" y1="108" y2="108" />
          ${chart.labelXs.map((x, index) => `<text class="xlab" x="${x}" y="230" text-anchor="middle">${chart.labels[index]}</text>`).join("\n          ")}
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

export default function ReferralDashboardHeroCard() {
  return (
    <GalleryCard
      title="Leaders - Referral dashboard hero"
      description="The top referral detail panel: referral name and code, copy button, waitlist rank badge, joined date, and the embedded rewards versus referrals growth chart."
      selector="body > main > section.mb-8.rounded-2xl.border.p-5.sm:p-6"
      filename="leaders-referral-dashboard-hero.html"
      snippets={SNIPPETS}
    >
      <ReferralDashboardHeroView />
    </GalleryCard>
  );
}
