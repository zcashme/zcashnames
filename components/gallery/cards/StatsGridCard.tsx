"use client";

import { useState } from "react";
import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

const STATS: Array<{ key: "waitlist" | "referred" | "rewards"; label: string; value: string; help: string }> = [
  { key: "waitlist", label: "Waitlist", value: "3,148", help: "Total number of people on the ZcashNames waitlist." },
  { key: "referred", label: "Referred", value: "918", help: "Number of waitlist members who were referred by someone." },
  { key: "rewards", label: "Rewards", value: "18.36", help: "Total estimated rewards from all referrals." },
];

function ZecSymbol() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      style={{ width: "0.6em", height: "0.6em", verticalAlign: "baseline", marginBottom: "0.05em", marginRight: 2, display: "inline-block" }}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2" />
      <line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6H14L6 14H14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function StatCardLive({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        borderRadius: 16,
        border: "1px solid var(--leaders-card-border)",
        background: active ? "var(--market-stats-segment-active-bg)" : "var(--leaders-card-bg)",
        padding: "20px 24px",
        cursor: "pointer",
        textAlign: "center",
        transition: "background-color 140ms ease",
      }}
    >
      <div
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: "clamp(1.4rem, 2.5vw, 2rem)",
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.025em",
          color: "var(--fg-heading)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.78rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--fg-muted)",
        }}
      >
        {label}
      </div>
    </button>
  );
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Leaders — 3-col stats grid</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  @media (min-width: 640px) { .grid { gap: 16px; } }
  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    border-radius: 16px;
    border: 1px solid ${p.leadersCardBorder};
    background: ${p.leadersCardBg};
    padding: 20px 24px;
    cursor: pointer;
    text-align: center;
    font: inherit;
    transition: background-color 140ms ease;
  }
  .stat-card[aria-pressed="true"] { background: ${p.marketActiveBg}; }
  .stat-value {
    font-variant-numeric: tabular-nums;
    font-size: clamp(1.4rem, 2.5vw, 2rem);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.025em;
    color: ${p.fgHeading};
  }
  .stat-label {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${p.fgMuted};
  }
  .zec-symbol {
    width: 0.6em;
    height: 0.6em;
    vertical-align: baseline;
    margin-bottom: 0.05em;
    margin-right: 2px;
    display: inline-block;
  }
  .help {
    margin-top: 12px;
    border-radius: 12px;
    border: 1px solid ${p.marketHelpBorder};
    background: ${p.marketHelpBg};
    color: ${p.marketHelpText};
    padding: 8px 16px;
    font-size: 0.78rem;
    font-weight: 500;
    line-height: 1.5;
    display: none;
  }
</style>
</head>
<body>
  <div class="stage">
    <section>
      <div class="grid">
        <button type="button" class="stat-card" aria-pressed="false">
          <div class="stat-value">3,148</div>
          <div class="stat-label">Waitlist</div>
        </button>
        <button type="button" class="stat-card" aria-pressed="false">
          <div class="stat-value">918</div>
          <div class="stat-label">Referred</div>
        </button>
        <button type="button" class="stat-card" aria-pressed="false">
          <div class="stat-value"><svg class="zec-symbol" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2" /><line x1="10" y1="2" x2="10" y2="18" stroke="currentColor" stroke-width="1.5" /><path d="M6 6H14L6 14H14" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg> 18.36</div>
          <div class="stat-label">Rewards</div>
        </button>
      </div>
      <div class="help">Total number of people on the ZcashNames waitlist.</div>
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

export default function StatsGridCard() {
  const [active, setActive] = useState<"waitlist" | "referred" | "rewards" | null>(null);

  return (
    <GalleryCard
      title="Leaders — 3-col stats grid"
      description="Wrapper section containing three stat cards (Waitlist, Referred, Rewards) with an expandable help panel that slides in when one card is toggled. Frozen to a snapshot of counts."
      selector="main > section.mb-8.grid.grid-cols-3.gap-3"
      filename="leaders-stats-grid.html"
      snippets={SNIPPETS}
    >
      <div style={{ width: "100%", maxWidth: 820 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {STATS.map((s) => (
            <StatCardLive
              key={s.key}
              label={s.label}
              value={
                s.key === "rewards" ? (
                  <>
                    <ZecSymbol /> {s.value}
                  </>
                ) : (
                  s.value
                )
              }
              active={active === s.key}
              onClick={() => setActive((c) => (c === s.key ? null : s.key))}
            />
          ))}
        </div>
        <div
          aria-live="polite"
          style={{
            overflow: "hidden",
            maxHeight: active ? 96 : 0,
            marginTop: active ? 12 : 0,
            opacity: active ? 1 : 0,
            transform: active ? "translateY(0)" : "translateY(-2px)",
            transition:
              "max-height 260ms ease-out, opacity 260ms ease-out, margin-top 260ms ease-out, transform 260ms ease-out",
          }}
        >
          <p
            style={{
              borderRadius: 12,
              border: "1px solid var(--market-stats-help-border)",
              background: "var(--market-stats-help-bg)",
              color: "var(--market-stats-help-text)",
              padding: "8px 16px",
              fontSize: "0.78rem",
              fontWeight: 500,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {STATS.find((s) => s.key === active)?.help ?? "\u00A0"}
          </p>
        </div>
      </div>
    </GalleryCard>
  );
}
