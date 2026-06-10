import type { CSSProperties, ReactNode } from "react";

const decorativeProps = {
  "aria-hidden": true,
  tabIndex: -1,
} as const;

const noPointer: CSSProperties = { pointerEvents: "none" };

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

export function InlineNetworkToggle() {
  const tabs = [
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
      {tabs.map((tab) => (
        <span
          key={tab.key}
          className="relative z-10 flex items-center justify-center h-full px-2.5 rounded-full whitespace-nowrap"
          style={{
            opacity: tab.active ? 1 : 0.4,
            boxShadow: tab.active ? "0 0 0 2px var(--fg-heading)" : undefined,
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

export function InlineSubmitFeedbackBtn() {
  return (
    <span
      {...decorativeProps}
      className="inline-flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold"
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
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 scale-x-[-1]"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M15 4v16" />
        <path d="M8 12h5" />
        <path d="M11 9l3 3-3 3" />
      </svg>
      Submit Feedback
    </span>
  );
}

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

export function InlineChecklistHeader() {
  return (
    <div
      {...decorativeProps}
      className="flex items-center justify-between gap-3 w-full max-w-sm"
      style={noPointer}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--fg-heading)" }}
      >
        User experience
      </span>
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap"
          style={{ ...iconBtnStyle, opacity: 0.9 }}
        >
          YWallet / Android
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <span
          className="inline-flex items-center justify-center rounded-lg px-2.5 py-1.5"
          style={{ ...iconBtnStyle, opacity: 0.9 }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M12 3v11" />
            <path d="m7 10 5 4.5 5-4.5" />
            <path d="M4 18v3h16v-3" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function InlineReportingBanner({
  itemLabel = "1. Buy a listed name",
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
        x
      </span>
    </div>
  );
}

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

export function InlineReadMeBtn() {
  return (
    <span
      {...decorativeProps}
      className="inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap align-text-bottom mx-0.5"
      style={{ ...iconBtnStyle, ...noPointer }}
    >
      Read
    </span>
  );
}
