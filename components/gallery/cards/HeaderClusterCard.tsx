"use client";

import { useState } from "react";
import GalleryCard, { type Snippets, type ThemeName } from "@/components/gallery/GalleryCard";
import { PALETTE } from "@/components/gallery/theme-palette";

type Status = "mainnet" | "testnet" | "waitlist";
type Theme = "dark" | "light" | "monochrome";

const STATUS_TABS: Array<{ key: Status; label: string }> = [
  { key: "mainnet", label: "Mainnet" },
  { key: "testnet", label: "Testnet" },
  { key: "waitlist", label: "Waitlist" },
];

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  dark: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  light: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  monochrome: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
      <path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  ),
};

function Pill({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 32,
        borderRadius: 999,
        background: "var(--color-raised)",
        isolation: "isolate",
        fontSize: "0.875rem",
        fontWeight: 700,
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </div>
  );
}

function StatusToggleLive() {
  const [active, setActive] = useState<Status>("waitlist");
  const activeIndex = STATUS_TABS.findIndex((t) => t.key === active);

  return (
    <Pill>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: `${100 / STATUS_TABS.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          background: "var(--color-raised)",
          boxShadow: "0 0 0 2px var(--fg-heading)",
          borderRadius: 999,
          zIndex: 0,
        }}
      />
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setActive(tab.key)}
          aria-pressed={active === tab.key}
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            padding: "0 10px",
            background: "transparent",
            border: "none",
            borderRadius: 999,
            color: "var(--fg-heading)",
            opacity: active === tab.key ? 1 : 0.4,
            cursor: "pointer",
            transition: "opacity 200ms ease",
            whiteSpace: "nowrap",
            font: "inherit",
          }}
        >
          {tab.label}
        </button>
      ))}
    </Pill>
  );
}

function ThemeToggleLive() {
  const themes: Theme[] = ["dark", "light", "monochrome"];
  const [active, setActive] = useState<Theme>("dark");
  const activeIndex = themes.indexOf(active);

  return (
    <Pill>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: `${100 / themes.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          background: "var(--color-raised)",
          boxShadow: "0 0 0 2px var(--fg-heading)",
          borderRadius: 999,
          zIndex: 0,
        }}
      />
      {themes.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setActive(t)}
          aria-label={`${t} theme`}
          aria-pressed={active === t}
          style={{
            position: "relative",
            zIndex: 1,
            height: "100%",
            padding: "0 10px",
            background: "transparent",
            border: "none",
            borderRadius: 999,
            color: "var(--fg-heading)",
            opacity: active === t ? 1 : 0.4,
            cursor: "pointer",
            transition: "opacity 200ms ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            font: "inherit",
          }}
        >
          {THEME_ICONS[t]}
        </button>
      ))}
    </Pill>
  );
}

function buildSnippet(t: ThemeName): string {
  const p = PALETTE[t];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Header — Status + Theme toggle cluster</title>
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: ${p.background};
    color: ${p.fgHeading};
    font-family: "Manrope", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  }
  .stage {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
  }
  .cluster {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  @media (min-width: 640px) { .cluster { gap: 16px; } }
  .pill {
    position: relative;
    display: flex;
    align-items: center;
    height: 32px;
    border-radius: 999px;
    background: ${p.raised};
    isolation: isolate;
    font-size: 0.875rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .pill .slider {
    position: absolute;
    top: 0; bottom: 0; left: 0;
    border-radius: 999px;
    background: ${p.raised};
    box-shadow: 0 0 0 2px ${p.fgHeading};
    z-index: 0;
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .pill button {
    position: relative;
    z-index: 1;
    height: 100%;
    padding: 0 10px;
    background: transparent;
    border: none;
    border-radius: 999px;
    color: ${p.fgHeading};
    cursor: pointer;
    font: inherit;
    opacity: 0.4;
    transition: opacity 200ms ease;
    white-space: nowrap;
  }
  .pill button[aria-pressed="true"] { opacity: 1; }
  .pill.status .slider { width: 33.333%; transform: translateX(200%); }
  .pill.theme .slider { width: 33.333%; transform: translateX(0%); }
  .pill.theme button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="cluster">
      <div class="pill status" role="group" aria-label="Status">
        <span class="slider" aria-hidden="true"></span>
        <button type="button" aria-pressed="false">Mainnet</button>
        <button type="button" aria-pressed="false">Testnet</button>
        <button type="button" aria-pressed="true">Waitlist</button>
      </div>
      <div class="pill theme" role="group" aria-label="Theme">
        <span class="slider" aria-hidden="true"></span>
        <button type="button" aria-label="dark theme" aria-pressed="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg></button>
        <button type="button" aria-label="light theme" aria-pressed="false"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg></button>
        <button type="button" aria-label="monochrome theme" aria-pressed="false"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="4.5" width="15" height="15" rx="2.5" /><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg></button>
      </div>
    </div>
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

export default function HeaderClusterCard() {
  return (
    <GalleryCard
      title="Header — Status + Theme toggle cluster"
      description="Right-side header cluster: two segmented pills with sliding highlight. StatusToggle (Mainnet/Testnet/Waitlist) + ThemeToggle (dark/light/monochrome). StatusToggle is home-page only in production; both are interactive in the preview."
      selector="header > div > div:nth-child(3)"
      filename="header-right-cluster.html"
      snippets={SNIPPETS}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <StatusToggleLive />
        <ThemeToggleLive />
      </div>
    </GalleryCard>
  );
}
