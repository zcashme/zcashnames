"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type DataViewTabItem = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

type DataViewOverflowItem = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
  meta?: ReactNode;
};

type DataViewTabsProps = {
  tabs: readonly DataViewTabItem[];
  endContent?: ReactNode;
  borderColor: string;
  overflow?: {
    label?: string;
    activeLabel?: string | null;
    items: readonly DataViewOverflowItem[];
    menuBackground?: string;
    activeBackground?: string;
    minWidthPx?: number;
  };
};

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function DataViewTabs({
  tabs,
  endContent,
  borderColor,
  overflow,
}: DataViewTabsProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!overflowOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!overflowRef.current?.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [overflowOpen]);

  return (
    <div
      className="flex flex-wrap items-end justify-between gap-3 border-b"
      style={{ borderColor }}
    >
      <div className="flex flex-wrap items-end gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={tab.onClick}
            className={
              tab.active
                ? "relative shrink-0 cursor-pointer px-4 py-2.5 text-[0.82rem] font-semibold whitespace-nowrap text-[var(--fg-heading)] transition-colors"
                : "relative shrink-0 cursor-pointer px-4 py-2.5 text-[0.82rem] font-semibold whitespace-nowrap text-[var(--fg-muted)] transition-colors hover:text-[var(--color-accent-interactive)]"
            }
          >
            {tab.label}
            {tab.active ? (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "var(--fg-heading)" }}
              />
            ) : null}
          </button>
        ))}

        {overflow ? (
          <div ref={overflowRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOverflowOpen((current) => !current)}
              className={
                overflow.activeLabel
                  ? "relative flex cursor-pointer items-center gap-1 px-4 py-2.5 text-[0.82rem] font-semibold transition-colors whitespace-nowrap text-[var(--fg-heading)]"
                  : "relative flex cursor-pointer items-center gap-1 px-4 py-2.5 text-[0.82rem] font-semibold transition-colors whitespace-nowrap text-[var(--fg-muted)] hover:text-[var(--color-accent-interactive)]"
              }
            >
              {overflow.activeLabel ?? overflow.label ?? "More"}
              <ChevronDownIcon />
              {overflow.activeLabel ? (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "var(--fg-heading)" }}
                />
              ) : null}
            </button>

            {overflowOpen ? (
              <div
                className="absolute left-0 top-full z-30 mt-1 rounded-xl border py-1"
                style={{
                  minWidth: `${overflow.minWidthPx ?? 160}px`,
                  background: overflow.menuBackground ?? "var(--color-raised)",
                  borderColor,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                }}
              >
                {overflow.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      setOverflowOpen(false);
                    }}
                    className={
                      item.active
                        ? "flex w-full cursor-pointer items-center justify-between px-4 py-2 text-[0.82rem] font-semibold text-[var(--fg-heading)] transition-colors"
                        : "flex w-full cursor-pointer items-center justify-between px-4 py-2 text-[0.82rem] font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--color-accent-interactive)]"
                    }
                    style={{
                      background: item.active
                        ? overflow.activeBackground ?? "var(--market-stats-segment-active-bg)"
                        : "transparent",
                    }}
                  >
                    <span>{item.label}</span>
                    {item.meta ? <span className="ml-2 tabular-nums text-fg-dim">{item.meta}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {endContent ? (
        <div className="flex items-center justify-end gap-2 pb-2">{endContent}</div>
      ) : null}
    </div>
  );
}
