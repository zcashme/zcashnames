/**
 * Inline visual replicas of UI elements referenced in BetaBrief.tsx.
 *
 * Each export is a non-interactive, decorative copy of a real component
 * elsewhere in the app. They render `aria-hidden`, `tabIndex={-1}`, and
 * `pointer-events: none` so they sit inline in prose without stealing focus
 * or hover state. The surrounding article text is the accessible label.
 *
 * Drift policy: SVG paths and styles are copied from the canonical sources
 * listed below. If you change a real component, update the matching inline
 * version here. CSS variables are reused so theme changes propagate
 * automatically across light / dark / monochrome.
 *
 * Canonical sources:
 *   - InlineNetworkToggle      → components/StatusToggle.tsx
 *   - InlineSubmitFeedbackBtn  → components/closedbeta/FeedbackModal.tsx
 *   - InlineCollapseChevron    → components/closedbeta/FeedbackPanelBody.tsx
 *   - InlineReportingBanner    → components/closedbeta/FeedbackPanelBody.tsx
 *   - InlinePopoutIcon         → components/closedbeta/FeedbackPanelBody.tsx
 *   - InlineReadMeButton       → components/closedbeta/FeedbackPanelBody.tsx
 */

import type { CSSProperties, ReactNode } from "react";

const decorativeProps = {
  "aria-hidden": true,
  tabIndex: -1,
} as const;

const noPointer: CSSProperties = { pointerEvents: "none" };

/* ── Layout wrapper for block-level previews ─────────────────────────── */

export function InlinePreview({ children }: { children: ReactNode }) {
  return (
    <div
      {...decorativeProps}
      className="my-3 flex justify-center rounded-xl px-4 py-5"
      style={{
        background: "var(--color-raised)",
        border: "1px dashed var(--border-muted)",
        ...noPointer,
      }}
    >
      {children}
    </div>
  );
}

/* ── 1. Network toggle (Mainnet | Testnet | Waitlist) ────────────────── */

export function InlineNetworkToggle() {
  const TABS = [
    { key: "mainnet", label: "Mainnet" },
    { key: "testnet", label: "Testnet", active: true },
    { key: "waitlist", label: "Waitlist" },
  ];
  return (
    <div
      {...decorativeProps}
      className="relative inline-flex items-center rounded-full h-8 text-sm font-bold tracking-tight leading-none"
      style={{
        background: "var(--color-raised)",
        isolation: "isolate",
        ...noPointer,
      }}
    >
      {TABS.map((tab) => (
        <span
          key={tab.key}
          className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap"
          style={{
            opacity: tab.active ? 1 : 0.4,
            boxShadow: tab.active
              ? "0 0 0 2px var(--fg-heading)"
              : undefined,
            background: tab.active ? "var(--color-raised)" : "transparent",
            color: "var(--fg-heading)",
          }}
        >
          {tab.label}
        </span>
      ))}
    </div>
  );
}

/* ── 3. Floating Submit Feedback button ──────────────────────────────── */

export function InlineSubmitFeedbackBtn() {
  return (
    <span
      {...decorativeProps}
      className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
      style={{
        background: "var(--home-result-primary-bg)",
        color: "var(--home-result-primary-fg)",
        boxShadow: "var(--home-result-primary-shadow)",
        ...noPointer,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Submit Feedback
    </span>
  );
}

/* ── 4. Collapse chevron (top-left of the panel) ─────────────────────── */

const iconBtnStyle: CSSProperties = {
  color: "var(--fg-body)",
  background: "var(--color-raised)",
  border: "1px solid var(--border-muted)",
  opacity: 0.85,
};

export function InlineCollapseChevron() {
  return (
    <span
      {...decorativeProps}
      className="inline-flex items-center justify-center rounded-lg p-1.5 align-text-bottom mx-0.5"
      style={{ ...iconBtnStyle, ...noPointer }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    </span>
  );
}

/* ── 6. "Reporting on" green banner ──────────────────────────────────── */

export function InlineReportingBanner({
  itemLabel = "Resolve a name on Testnet",
}: { itemLabel?: string }) {
  return (
    <div
      {...decorativeProps}
      className="flex items-start gap-3 rounded-lg px-3 py-2.5 w-full max-w-sm"
      style={{
        background: "var(--color-accent-green-light)",
        border: "1px solid var(--color-accent-green)",
        ...noPointer,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 mt-0.5 shrink-0"
        style={{ color: "var(--color-accent-green)" }}
        aria-hidden="true"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <div className="flex-1 min-w-0">
        <p
          className="text-[0.65rem] font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-accent-green)" }}
        >
          Reporting on
        </p>
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: "var(--fg-heading)" }}
        >
          {itemLabel}
        </p>
      </div>
      <span
        className="shrink-0 text-xl leading-none opacity-60"
        style={{ color: "var(--fg-body)" }}
      >
        ×
      </span>
    </div>
  );
}

/* ── 7. Popout icon button ───────────────────────────────────────────── */

export function InlinePopoutIcon() {
  return (
    <span
      {...decorativeProps}
      className="inline-flex items-center justify-center rounded-lg p-1.5 align-text-bottom mx-0.5"
      style={{ ...iconBtnStyle, ...noPointer }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </span>
  );
}

/* ── 8. Read Me button ───────────────────────────────────────────────── */

export function InlineReadMeBtn() {
  return (
    <span
      {...decorativeProps}
      className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap align-text-bottom mx-0.5"
      style={{ ...iconBtnStyle, ...noPointer }}
    >
      Read Me
    </span>
  );
}
