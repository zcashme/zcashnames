"use client";

import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

interface Row {
  rank: number;
  name: string;
  code: string;
  refs: number;
  recent: number;
  rewards: string;
}

const ROWS: Row[] = [
  { rank: 1, name: "alice.zcash", code: "ZNA1B2", refs: 128, recent: 7, rewards: "2.56" },
  { rank: 2, name: "orchid.zcash", code: "ZLJ9KP", refs: 94, recent: 3, rewards: "1.88" },
  { rank: 3, name: "atlas.zcash", code: "ZQR42X", refs: 67, recent: 1, rewards: "1.34" },
  { rank: 4, name: "mint.zcash", code: "ZT0PDV", refs: 52, recent: 0, rewards: "1.04" },
  { rank: 5, name: "ember.zcash", code: "ZW91Y4", refs: 41, recent: 2, rewards: "0.82" },
];

function rankBg(rank: number, gold: string, silver: string, bronze: string): string {
  if (rank === 1) return gold;
  if (rank === 2) return silver;
  if (rank === 3) return bronze;
  return "transparent";
}

function ZecSymbol() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      style={{ width: "0.6em", height: "0.6em", marginRight: 2, display: "inline-block", verticalAlign: "baseline" }}
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6H14L6 14H14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      style={{ width: 14, height: 14, display: "inline-block" }}
    >
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
    </svg>
  );
}

function LeaderboardLive() {
  return (
    <section
      style={{
        width: "100%",
        maxWidth: 820,
        overflow: "hidden",
        borderRadius: 16,
        border: "1px solid var(--leaders-card-border)",
        background: "var(--leaders-card-bg)",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", textAlign: "left", fontSize: "0.875rem", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--leaders-card-border)",
                fontSize: "0.74rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--fg-muted)",
              }}
            >
              <th style={{ padding: "12px 24px" }}>Rank</th>
              <th style={{ padding: "12px 24px" }}>ZcashName</th>
              <th style={{ padding: "12px 24px", textAlign: "right" }}>Refs</th>
              <th style={{ padding: "12px 24px", textAlign: "right" }}>24h</th>
              <th style={{ padding: "12px 24px", textAlign: "right" }}>Rewards</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr
                key={row.code}
                style={{
                  borderBottom: i === ROWS.length - 1 ? "none" : "1px solid var(--leaders-card-border)",
                }}
              >
                <td style={{ padding: "12px 24px", color: "var(--fg-heading)", fontWeight: 600 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background:
                        row.rank === 1
                          ? "var(--leaders-rank-gold)"
                          : row.rank === 2
                          ? "var(--leaders-rank-silver)"
                          : row.rank === 3
                          ? "var(--leaders-rank-bronze)"
                          : "transparent",
                      color: row.rank <= 3 ? "var(--leaders-rank-text)" : "inherit",
                    }}
                  >
                    {row.rank}
                  </span>
                </td>
                <td style={{ padding: "12px 24px" }}>
                  <div style={{ fontWeight: 600, color: "var(--fg-heading)" }}>{row.name}</div>
                  <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: "0.72rem",
                        color: "var(--fg-muted)",
                      }}
                    >
                      {row.code}
                    </span>
                    <button
                      type="button"
                      title="Copy referral link"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--fg-muted)",
                        padding: 0,
                        display: "inline-flex",
                      }}
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </td>
                <td
                  style={{
                    padding: "12px 24px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--fg-heading)" }}>{row.refs}</span>
                </td>
                <td
                  style={{
                    padding: "12px 24px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--fg-muted)",
                  }}
                >
                  {row.recent > 0 ? `+${row.recent}` : "\u2014"}
                </td>
                <td
                  style={{
                    padding: "12px 24px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--fg-body)",
                  }}
                >
                  <ZecSymbol /> {row.rewards}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function rowsHtml(): string {
  return ROWS.map((row, i) => {
    const isLast = i === ROWS.length - 1;
    const borderStyle = isLast ? "" : "border-bottom: 1px solid var(--leaders-card-border-local);";
    return `        <tr style="${borderStyle}">
          <td class="td"><span class="rank rank-${row.rank}">${row.rank}</span></td>
          <td class="td">
            <div class="name">${row.name}</div>
            <div class="subrow"><span class="code">${row.code}</span><button type="button" class="copy" title="Copy referral link"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="width:14px;height:14px;display:inline-block"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" /></svg></button></div>
          </td>
          <td class="td tr num"><span class="refs">${row.refs}</span></td>
          <td class="td tr num muted">${row.recent > 0 ? `+${row.recent}` : "\u2014"}</td>
          <td class="td tr num body"><svg class="zec" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2" /><line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="1.5" /><path d="M6 6H14L6 14H14" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg> ${row.rewards}</td>
        </tr>`;
  }).join("\n");
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Leaders — All-time leaderboard</title>
<style>
  :root {
    --leaders-card-border-local: ${p.leadersCardBorder};
  }
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
  .board {
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid ${p.leadersCardBorder};
    background: ${p.leadersCardBg};
  }
  .scroll { overflow-x: auto; }
  table {
    width: 100%;
    text-align: left;
    font-size: 0.875rem;
    border-collapse: collapse;
  }
  thead tr {
    border-bottom: 1px solid ${p.leadersCardBorder};
    font-size: 0.74rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${p.fgMuted};
  }
  th { padding: 12px 24px; font-weight: 600; }
  th.tr { text-align: right; }
  td.td { padding: 12px 24px; }
  td.tr { text-align: right; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  td.muted { color: ${p.fgMuted}; }
  td.body { color: ${p.fgBody}; }
  .rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .rank-1 { background: ${p.leadersRankGold}; color: ${p.leadersRankText}; }
  .rank-2 { background: ${p.leadersRankSilver}; color: ${p.leadersRankText}; }
  .rank-3 { background: ${p.leadersRankBronze}; color: ${p.leadersRankText}; }
  .name { font-weight: 600; color: ${p.fgHeading}; }
  .subrow { margin-top: 2px; display: flex; align-items: center; gap: 6px; }
  .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; color: ${p.fgMuted}; }
  .copy {
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${p.fgMuted};
    padding: 0;
    display: inline-flex;
    align-items: center;
  }
  .copy:hover { color: ${p.fgHeading}; }
  .refs { font-weight: 600; color: ${p.fgHeading}; }
  .zec {
    width: 0.6em;
    height: 0.6em;
    margin-right: 2px;
    display: inline-block;
    vertical-align: baseline;
  }
  td.td { color: ${p.fgHeading}; font-weight: 600; }
  thead th:first-child, thead th:nth-child(2) { font-weight: 600; }
</style>
</head>
<body>
  <div class="stage">
    <section class="board">
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>ZcashName</th>
              <th class="tr">Refs</th>
              <th class="tr">24h</th>
              <th class="tr">Rewards</th>
            </tr>
          </thead>
          <tbody>
${rowsHtml()}
          </tbody>
        </table>
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

export default function LeaderboardTableCard() {
  return (
    <GalleryCard
      title="Leaders — All-time leaderboard"
      description="Bordered section wrapping a 5-column table: rank (with gold/silver/bronze circles for top 3), ZcashName with referral code & copy button, Refs, 24h delta, Rewards. Frozen to a snapshot of 5 rows."
      selector="main > section.mb-8.rounded-2xl.border.p-5.sm:p-6"
      filename="leaders-all-time-leaderboard.html"
      snippets={SNIPPETS}
    >
      <LeaderboardLive />
    </GalleryCard>
  );
}
