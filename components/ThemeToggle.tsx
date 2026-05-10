"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

type Theme = "dark" | "light" | "monochrome";

const THEMES: Theme[] = ["dark", "light", "monochrome"];

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

// Three-theme switcher (dark / light / monochrome) powered by next-themes.
// A sliding highlight pill follows the active theme. Before hydration (mounted=false), a hidden
// placeholder renders to prevent layout shift; after mount, the resolved theme takes over.
export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedActive = resolvedTheme ?? theme;
  const activeTheme: Theme = resolvedActive && THEMES.includes(resolvedActive as Theme)
    ? (resolvedActive as Theme)
    : "monochrome";

  const handleSelect = (t: Theme) => {
    setTheme(t);
  };

  const idx = THEMES.indexOf(activeTheme);

  if (!mounted) {
    return (
      <div
        className="relative flex items-center rounded-full h-8 text-sm font-bold tracking-tight leading-none"
        style={{ isolation: "isolate", background: "var(--color-raised)", visibility: "hidden" }}
        aria-hidden="true"
      >
        <span
          className="absolute inset-y-0 rounded-full pointer-events-none"
          style={{
            left: 0,
            width: `${100 / THEMES.length}%`,
            transform: "translateX(0%)",
            transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
            background: "var(--color-raised)",
            boxShadow: "0 0 0 2px var(--fg-heading)",
            zIndex: 0,
          }}
        />

        {THEMES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={false}
            aria-label={`${t} theme`}
            className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full cursor-pointer transition-opacity duration-200"
            style={{ opacity: 0.4 }}
            tabIndex={-1}
          >
            {icons[t]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center rounded-full h-8 text-sm font-bold tracking-tight leading-none"
      style={{ isolation: "isolate", background: "var(--color-raised)" }}
    >
      {/* Sliding highlight */}
      <span
        className="absolute inset-y-0 rounded-full pointer-events-none"
        style={{
          left: 0,
          width: `${100 / THEMES.length}%`,
          transform: `translateX(${idx * 100}%)`,
          transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          willChange: "transform",
          background: "var(--color-raised)",
          boxShadow: "0 0 0 2px var(--fg-heading)",
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {THEMES.map((t) => (
        <button
          key={t}
          type="button"
          aria-pressed={activeTheme === t}
          aria-label={`${t} theme`}
          onClick={() => handleSelect(t)}
          className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full cursor-pointer transition-opacity duration-200"
          style={{ opacity: activeTheme === t ? 1 : 0.4 }}
        >
          {icons[t]}
        </button>
      ))}
    </div>
  );
}
