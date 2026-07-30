"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

type Theme = "dark" | "light" | "monochrome";
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

// Single-icon theme switcher powered by next-themes, with a hidden monochrome easter egg.
// Before hydration (mounted=false), a hidden placeholder renders to prevent layout shift.
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const tapTimesRef = useRef<number[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedActive = resolvedTheme ?? theme;
  const activeTheme: Theme = resolvedActive && ["dark", "light", "monochrome"].includes(resolvedActive as Theme)
    ? (resolvedActive as Theme)
    : "light";

  function handleToggle() {
    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter((time) => now - time <= TRIPLE_TAP_WINDOW_MS);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 3) {
      tapTimesRef.current = [];
      setTheme("monochrome");
      return;
    }

    if (activeTheme === "monochrome") {
      setTheme("light");
      return;
    }

    setTheme(activeTheme === "light" ? "dark" : "light");
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tracking-tight leading-none"
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
      onClick={handleToggle}
      className="relative flex h-8 w-8 items-center justify-center rounded-full text-fg-heading transition-colors duration-200 cursor-pointer hover:text-[var(--color-accent-interactive)]"
      style={{ background: "var(--color-raised)" }}
    >
      <span className="relative z-10 inline-flex items-center justify-center">
        {icons[activeTheme]}
      </span>
    </button>
  );
}
