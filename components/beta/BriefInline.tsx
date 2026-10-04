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
    { key: "waitlist", label: "Waitlist", active: true },
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

const iconBtnStyle: CSSProperties = {
  color: "var(--fg-body)",
  background: "var(--color-raised)",
  border: "1px solid var(--border-muted)",
  opacity: 0.85,
};

