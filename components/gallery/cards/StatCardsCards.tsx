"use client";

import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

function StatCardLive({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        borderRadius: 16,
        border: "1px solid var(--leaders-card-border)",
        background: "var(--leaders-card-bg)",
        padding: "20px 24px",
        cursor: "pointer",
        textAlign: "center",
        minWidth: 180,
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

function buildStatCardSnippet(t: ThemeName, label: string, value: string): string {
  const p = PALETTE[t];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${label} stat card</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }
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
    min-width: 180px;
    font: inherit;
  }
  .stat-card:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px ${p.partnerBorderHover};
  }
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
</style>
</head>
<body>
  <div class="stage">
    <button type="button" class="stat-card">
      <div class="stat-value">${value}</div>
      <div class="stat-label">${label}</div>
    </button>
  </div>
</body>
</html>
`;
}

function snippets(label: string, value: string): Snippets {
  return {
    dark: buildStatCardSnippet("dark", label, value),
    light: buildStatCardSnippet("light", label, value),
    monochrome: buildStatCardSnippet("monochrome", label, value),
  };
}

export function WaitlistStatCardCard() {
  const value = "3,148";
  return (
    <GalleryCard
      title="Leaders — Waitlist stat card"
      description="Individual stat button: big tabular number + uppercase label. 1-of-3 in the leaders 3-col grid. Frozen to a snapshot count."
      selector="main > section:nth-child(3) > div.grid.grid-cols-3 > button:nth-child(1)"
      filename="leaders-stat-waitlist.html"
      snippets={snippets("Waitlist", value)}
    >
      <StatCardLive label="Waitlist" value={value} />
    </GalleryCard>
  );
}

export function ReferredStatCardCard() {
  const value = "918";
  return (
    <GalleryCard
      title="Leaders — Referred stat card"
      description="Same component as the Waitlist card, with the Referred total."
      selector="main > section:nth-child(3) > div.grid.grid-cols-3 > button:nth-child(2)"
      filename="leaders-stat-referred.html"
      snippets={snippets("Referred", value)}
    >
      <StatCardLive label="Referred" value={value} />
    </GalleryCard>
  );
}
