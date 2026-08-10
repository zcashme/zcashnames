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
/** Wait after the last click before committing a single light/dark (or mono exit) toggle. */
const SINGLE_TAP_DEBOUNCE_MS = 300;

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
// Triple-tap: monochrome green with vertical flip + top→bottom sweep.
// Before hydration (mounted=false), a hidden placeholder renders to prevent layout shift.
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tapTimesRef = useRef<number[]>([]);
  const pendingSingleTapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Live-DOM dual-face flip only when View Transitions are unavailable.
  const [fallbackFront, setFallbackFront] = useState<Theme | null>(null);
  const [fallbackBack, setFallbackBack] = useState<Theme | null>(null);
  const [flipDir, setFlipDir] = useState<ThemeDirection | null>(null);
  const [busy, setBusy] = useState(false);
  // Keep latest theme in a ref so debounced single-tap sees current value.
  const activeThemeRef = useRef<Theme>("light");
  /** Prevents a preempted applyTheme finally from clearing busy during a forced run. */
  const applyGenerationRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingSingleTapRef.current !== null) {
        clearTimeout(pendingSingleTapRef.current);
      }
    };
  }, []);

  const resolvedActive = resolvedTheme ?? theme;
  const activeTheme: Theme =
    resolvedActive && ["dark", "light", "monochrome"].includes(resolvedActive as Theme)
      ? (resolvedActive as Theme)
      : "light";
  activeThemeRef.current = activeTheme;

  const usingFallbackFlip = flipDir !== null && fallbackFront !== null && fallbackBack !== null;
  const displayTheme = usingFallbackFlip ? fallbackFront! : activeTheme;

  function clearPendingSingleTap() {
    if (pendingSingleTapRef.current !== null) {
      clearTimeout(pendingSingleTapRef.current);
      pendingSingleTapRef.current = null;
    }
  }

  async function applyTheme(next: Theme, from: Theme, options?: { force?: boolean }) {
    const force = options?.force ?? false;
    if (!force && (busy || isThemeTransitioning())) return;
    if (next === from) return;

    const direction = getThemeDirection(from, next);
    const generation = ++applyGenerationRef.current;

    setBusy(true);

    try {
      await runThemeTransition({
        nextTheme: next,
        direction,
        setTheme,
        force,
        onFallbackFlipStart: (dir) => {
          if (generation !== applyGenerationRef.current) return;
          setFallbackFront(from);
          setFallbackBack(next);
          setFlipDir(null);
          requestAnimationFrame(() => {
            if (generation !== applyGenerationRef.current) return;
            setFlipDir(dir);
          });
        },
        onFallbackFlipEnd: () => {
          if (generation !== applyGenerationRef.current) return;
          setFallbackFront(null);
          setFallbackBack(null);
          setFlipDir(null);
        },
      });

      if (generation === applyGenerationRef.current) {
        setFallbackFront(null);
        setFallbackBack(null);
        setFlipDir(null);
      }
    } finally {
      if (generation === applyGenerationRef.current) {
        setBusy(false);
      }
    }
  }

  function scheduleSingleTapAction() {
    clearPendingSingleTap();
    pendingSingleTapRef.current = setTimeout(() => {
      pendingSingleTapRef.current = null;
      tapTimesRef.current = [];

      const current = activeThemeRef.current;
      if (current === "monochrome") {
        void applyTheme("light", current);
        return;
      }

      void applyTheme(nextLightDark(current), current);
    }, SINGLE_TAP_DEBOUNCE_MS);
  }

  function handleToggle() {
    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter((time) => now - time <= TRIPLE_TAP_WINDOW_MS);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    // Triple-tap easter egg: monochrome green (vertical flip + top→bottom sweep).
    // Counts even while a light/dark transition is busy; force preempts in-flight VT.
    if (recentTaps.length >= 3) {
      clearPendingSingleTap();
      tapTimesRef.current = [];
      const from = activeThemeRef.current;
      if (from === "monochrome") {
        // Already mono — treat as a normal exit rather than re-entering.
        void applyTheme("light", from, { force: true });
        return;
      }
      void applyTheme("monochrome", from, { force: true });
      return;
    }

    // 1–2 taps: wait for more taps before committing light/dark (or mono exit).
    scheduleSingleTapAction();
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
      onClick={handleToggle}
      className="theme-toggle-btn relative flex h-8 w-8 items-center justify-center rounded-full text-fg-heading transition-colors duration-200 cursor-pointer hover:text-[var(--color-accent-interactive)]"
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
