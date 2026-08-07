"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  getThemeDirection,
  isThemeTransitioning,
  runThemeTransition,
  type ThemeDirection,
  type ThemeName,
} from "@/lib/theme-transition";

type Theme = ThemeName;
const TRIPLE_TAP_WINDOW_MS = 650;

const icons: Record<Theme, React.ReactNode> = {
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

function nextLightDark(theme: Theme): Theme {
  return theme === "light" ? "dark" : "light";
}

// Single-icon theme switcher powered by next-themes, with a hidden monochrome easter egg.
// Light↔dark: directional 3D flip + full-viewport color sweep (View Transitions API).
// Before hydration (mounted=false), a hidden placeholder renders to prevent layout shift.
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tapTimesRef = useRef<number[]>([]);
  // Live-DOM dual-face flip only when View Transitions are unavailable.
  const [fallbackFront, setFallbackFront] = useState<Theme | null>(null);
  const [fallbackBack, setFallbackBack] = useState<Theme | null>(null);
  const [flipDir, setFlipDir] = useState<ThemeDirection | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedActive = resolvedTheme ?? theme;
  const activeTheme: Theme =
    resolvedActive && ["dark", "light", "monochrome"].includes(resolvedActive as Theme)
      ? (resolvedActive as Theme)
      : "light";

  const usingFallbackFlip = flipDir !== null && fallbackFront !== null && fallbackBack !== null;
  const displayTheme = usingFallbackFlip ? fallbackFront! : activeTheme;

  async function applyTheme(next: Theme, from: Theme) {
    if (busy || isThemeTransitioning()) return;

    const direction = getThemeDirection(from, next);

    // Monochrome (and other non-directional) paths: instant.
    if (!direction) {
      document.documentElement.setAttribute("data-theme", next);
      setTheme(next);
      setFlipDir(null);
      setFallbackFront(null);
      setFallbackBack(null);
      return;
    }

    setBusy(true);

    try {
      await runThemeTransition({
        nextTheme: next,
        direction,
        setTheme,
        onFallbackFlipStart: (dir) => {
          setFallbackFront(from);
          setFallbackBack(next);
          setFlipDir(null);
          requestAnimationFrame(() => setFlipDir(dir));
        },
        onFallbackFlipEnd: () => {
          setFallbackFront(null);
          setFallbackBack(null);
          setFlipDir(null);
        },
      });

      setFallbackFront(null);
      setFallbackBack(null);
      setFlipDir(null);
    } finally {
      setBusy(false);
    }
  }

  function handleToggle() {
    if (busy || isThemeTransitioning()) return;

    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter((time) => now - time <= TRIPLE_TAP_WINDOW_MS);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 3) {
      tapTimesRef.current = [];
      void applyTheme("monochrome", activeTheme);
      return;
    }

    if (activeTheme === "monochrome") {
      void applyTheme("light", activeTheme);
      return;
    }

    void applyTheme(nextLightDark(activeTheme), activeTheme);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle-btn relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tracking-tight leading-none"
        style={{ background: "var(--color-raised)", visibility: "hidden" }}
        aria-hidden="true"
        tabIndex={-1}
      >
        <span className="inline-flex items-center justify-center text-fg-heading">
          {icons.light}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${activeTheme} theme`}
      aria-busy={busy || undefined}
      disabled={busy}
      onClick={handleToggle}
      className="theme-toggle-btn relative flex h-8 w-8 items-center justify-center rounded-full text-fg-heading transition-colors duration-200 cursor-pointer hover:text-[var(--color-accent-interactive)] disabled:cursor-wait"
      style={{ background: "var(--color-raised)" }}
    >
      {usingFallbackFlip ? (
        <span
          className="theme-toggle-flip relative z-10"
          data-flip={flipDir ?? undefined}
          aria-hidden="true"
        >
          <span className="theme-toggle-face theme-toggle-face--front">
            {icons[fallbackFront!]}
          </span>
          <span className="theme-toggle-face theme-toggle-face--back">
            {icons[fallbackBack!]}
          </span>
        </span>
      ) : (
        <span className="relative z-10 inline-flex items-center justify-center" aria-hidden="true">
          {icons[displayTheme]}
        </span>
      )}
    </button>
  );
}
