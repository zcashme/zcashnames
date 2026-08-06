"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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

const TAB_BUTTON_CLASS =
  "relative shrink-0 cursor-pointer px-4 py-2.5 text-[0.82rem] font-semibold whitespace-nowrap transition-colors";
const TAB_BUTTON_ACTIVE = `${TAB_BUTTON_CLASS} text-[var(--fg-heading)]`;
const TAB_BUTTON_INACTIVE = `${TAB_BUTTON_CLASS} text-[var(--fg-muted)] hover:text-[var(--color-accent-interactive)]`;
const MORE_BUTTON_CLASS =
  "relative flex shrink-0 cursor-pointer items-center gap-1 px-4 py-2.5 text-[0.82rem] font-semibold transition-colors whitespace-nowrap";

/**
 * Table tab strip with optional static overflow menu and progressive collapse.
 * When endContent (sort/rows icons) is present, primary tabs move into "More"
 * as needed so the tab row and icons always stay on a single line.
 */
export default function DataViewTabs({
  tabs,
  endContent,
  borderColor,
  overflow,
}: DataViewTabsProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(tabs.length);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const endContentRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const measureTabsRef = useRef<HTMLDivElement | null>(null);
  const measureMoreRef = useRef<HTMLButtonElement | null>(null);
  const measureActiveMoreRef = useRef<HTMLButtonElement | null>(null);

  const staticOverflowItems = overflow?.items ?? [];
  const hasStaticOverflow = staticOverflowItems.length > 0;

  // Prefer keeping leading tabs visible; collapse from the right.
  const clampedVisible = Math.max(0, Math.min(visibleCount, tabs.length));
  const visibleTabs = tabs.slice(0, clampedVisible);
  const collapsedTabs = tabs.slice(clampedVisible);

  const activeCollapsedTab = collapsedTabs.find((tab) => tab.active) ?? null;
  // Static overflow active label (e.g. action filters) only when no primary is active in More.
  const resolvedActiveLabel =
    activeCollapsedTab?.label
    ?? (collapsedTabs.length === 0 || !tabs.some((tab) => tab.active)
      ? (overflow?.activeLabel ?? null)
      : null)
    ?? null;

  const moreMenuItems: DataViewOverflowItem[] = useMemo(() => {
    const fromTabs: DataViewOverflowItem[] = collapsedTabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      active: tab.active,
      onClick: tab.onClick,
    }));
    return [...fromTabs, ...staticOverflowItems];
  }, [collapsedTabs, staticOverflowItems]);

  const showMore = hasStaticOverflow || collapsedTabs.length > 0;

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

  const tabsSignature = tabs.map((tab) => `${tab.key}:${tab.active}:${tab.label}`).join("|");
  const overflowItemsSignature = staticOverflowItems
    .map((item) => `${item.key}:${item.active}:${item.label}`)
    .join("|");

  // Close the menu when the active set of overflow items changes (e.g. after selecting a tab).
  useEffect(() => {
    setOverflowOpen(false);
  }, [clampedVisible, tabsSignature]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function recompute() {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      if (containerWidth <= 0) return;

      const endWidth = endContentRef.current?.offsetWidth ?? 0;
      const minGap = endWidth > 0 ? 12 : 0; // matches gap-3 between tab group and icons
      const budget = Math.max(0, containerWidth - endWidth - minGap);

      const tabEls = measureTabsRef.current
        ? (Array.from(measureTabsRef.current.children) as HTMLElement[])
        : [];
      const tabWidths = tabEls.map((el) => el.offsetWidth);
      const moreBaseWidth = measureMoreRef.current?.offsetWidth ?? 72;

      // Fit as many leading tabs as possible. Always reserve More when static
      // overflow items exist, or when any tab would be collapsed.
      let nextVisible = tabs.length;
      while (nextVisible >= 0) {
        const tabsWidth = tabWidths.slice(0, nextVisible).reduce((sum, w) => sum + w, 0);
        const collapsedSlice = tabs.slice(nextVisible);
        const needsMore = hasStaticOverflow || collapsedSlice.length > 0;

        let moreWidth = 0;
        if (needsMore) {
          const activeInCollapsed = collapsedSlice.find((tab) => tab.active);
          // When More shows an active label it is wider than the baseline "More" chip.
          if (activeInCollapsed) {
            // Approximate active More width from the measured tab label + chevron slot.
            const activeTabIndex = tabs.findIndex((tab) => tab.key === activeInCollapsed.key);
            const activeTabWidth = activeTabIndex >= 0 ? (tabWidths[activeTabIndex] ?? 0) : 0;
            moreWidth = Math.max(moreBaseWidth, activeTabWidth + 20);
          } else if (overflow?.activeLabel && !tabs.some((tab) => tab.active)) {
            moreWidth = Math.max(moreBaseWidth, measureActiveMoreRef.current?.offsetWidth ?? moreBaseWidth);
          } else {
            moreWidth = moreBaseWidth;
          }
        }

        if (tabsWidth + moreWidth <= budget) {
          break;
        }
        nextVisible -= 1;
      }

      if (nextVisible < 0) nextVisible = 0;

      setVisibleCount((current) => (current === nextVisible ? current : nextVisible));
    }

    recompute();

    const observer = new ResizeObserver(() => {
      recompute();
    });
    observer.observe(container);
    if (endContentRef.current) observer.observe(endContentRef.current);

    return () => observer.disconnect();
  }, [tabs, tabsSignature, hasStaticOverflow, overflow?.activeLabel, overflowItemsSignature, endContent]);

  return (
    <div
      ref={containerRef}
      // Do not set overflow-x clip here — it also clips the More menu (overflow-y becomes non-visible).
      className="relative z-20 flex min-w-0 w-full max-w-full flex-nowrap items-end justify-between gap-3 border-b"
      style={{ borderColor }}
    >
      {/*
        Measure in a zero-size overflow-hidden host so wide tab labels never expand
        document scrollWidth (mobile horizontal blank scroll).
      */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="flex w-max items-end opacity-0">
          <div ref={measureTabsRef} className="flex items-end">
            {tabs.map((tab) => (
              <span key={tab.key} className={TAB_BUTTON_INACTIVE}>
                {tab.label}
              </span>
            ))}
          </div>
          <button ref={measureMoreRef} type="button" className={MORE_BUTTON_CLASS} tabIndex={-1}>
            {overflow?.label ?? "More"}
            <ChevronDownIcon />
          </button>
          <button ref={measureActiveMoreRef} type="button" className={MORE_BUTTON_CLASS} tabIndex={-1}>
            {resolvedActiveLabel
              ?? overflow?.activeLabel
              ?? tabs.find((tab) => tab.active)?.label
              ?? overflow?.label
              ?? "More"}
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-nowrap items-end gap-0">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={tab.onClick}
            className={tab.active ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}
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

        {showMore ? (
          <div ref={overflowRef} className="relative z-30 shrink-0">
            <button
              type="button"
              onClick={() => setOverflowOpen((current) => !current)}
              className={
                resolvedActiveLabel
                  ? `${MORE_BUTTON_CLASS} text-[var(--fg-heading)]`
                  : `${MORE_BUTTON_CLASS} text-[var(--fg-muted)] hover:text-[var(--color-accent-interactive)]`
              }
            >
              {resolvedActiveLabel ?? overflow?.label ?? "More"}
              <ChevronDownIcon />
              {resolvedActiveLabel ? (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "var(--fg-heading)" }}
                />
              ) : null}
            </button>

            {overflowOpen ? (
              <div
                className="absolute left-0 top-full z-50 mt-1 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border py-1"
                style={{
                  minWidth: `${overflow?.minWidthPx ?? 200}px`,
                  background: overflow?.menuBackground ?? "var(--color-raised)",
                  borderColor,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                }}
              >
                {moreMenuItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      item.onClick();
                      setOverflowOpen(false);
                    }}
                    className={
                      item.active
                        ? "flex w-full cursor-pointer items-center justify-between whitespace-nowrap px-4 py-2 text-[0.82rem] font-semibold text-[var(--fg-heading)] transition-colors"
                        : "flex w-full cursor-pointer items-center justify-between whitespace-nowrap px-4 py-2 text-[0.82rem] font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--color-accent-interactive)]"
                    }
                    style={{
                      background: item.active
                        ? overflow?.activeBackground ?? "var(--market-stats-segment-active-bg)"
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
        <div ref={endContentRef} className="relative z-10 flex shrink-0 items-center justify-end gap-2 pb-2">
          {endContent}
        </div>
      ) : null}
    </div>
  );
}
