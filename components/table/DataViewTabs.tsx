"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export type DataViewTabChild = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
  meta?: ReactNode;
};

export type DataViewTabItem = {
  key: string;
  label: string;
  active: boolean;
  /** Leaf tabs click handler. Ignored when `children` is present. */
  onClick?: () => void;
  /** When set, render as a dropdown group. Collapsed groups flatten children into More. */
  children?: readonly DataViewTabChild[];
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
const MENU_ITEM_ACTIVE =
  "flex w-full cursor-pointer items-center justify-between whitespace-nowrap px-4 py-2 text-[0.82rem] font-semibold text-[var(--fg-heading)] transition-colors";
const MENU_ITEM_INACTIVE =
  "flex w-full cursor-pointer items-center justify-between whitespace-nowrap px-4 py-2 text-[0.82rem] font-semibold text-[var(--fg-muted)] transition-colors hover:text-[var(--color-accent-interactive)]";

function isGroupTab(tab: DataViewTabItem): boolean {
  return Array.isArray(tab.children) && tab.children.length > 0;
}

function tabIsActive(tab: DataViewTabItem): boolean {
  if (tab.active) return true;
  return tab.children?.some((child) => child.active) ?? false;
}

/** Flatten a tab for the More menu: groups contribute children only (no nesting). */
function flattenTabForMore(tab: DataViewTabItem): DataViewOverflowItem[] {
  if (isGroupTab(tab) && tab.children) {
    return tab.children.map((child) => ({
      key: child.key,
      label: child.label,
      active: child.active,
      onClick: child.onClick,
      meta: child.meta,
    }));
  }
  return [
    {
      key: tab.key,
      label: tab.label,
      active: tab.active,
      onClick: tab.onClick ?? (() => undefined),
    },
  ];
}

function activeLabelFromCollapsed(collapsedTabs: readonly DataViewTabItem[]): string | null {
  for (const tab of collapsedTabs) {
    if (isGroupTab(tab) && tab.children) {
      const activeChild = tab.children.find((child) => child.active);
      if (activeChild) return activeChild.label;
    } else if (tab.active) {
      return tab.label;
    }
  }
  return null;
}

function anyPrimaryActive(tabs: readonly DataViewTabItem[]): boolean {
  return tabs.some((tab) => tabIsActive(tab));
}

/**
 * Table tab strip with optional dropdown group tabs, static overflow menu,
 * and progressive collapse into "More". Collapsed group tabs flatten their
 * children into More — parents are never nested inside More.
 */
export default function DataViewTabs({
  tabs,
  endContent,
  borderColor,
  overflow,
}: DataViewTabsProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(tabs.length);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const endContentRef = useRef<HTMLDivElement | null>(null);
  const overflowRef = useRef<HTMLDivElement | null>(null);
  const groupsRef = useRef<HTMLDivElement | null>(null);
  const measureTabsRef = useRef<HTMLDivElement | null>(null);
  const measureMoreRef = useRef<HTMLButtonElement | null>(null);
  const measureActiveMoreRef = useRef<HTMLButtonElement | null>(null);

  const staticOverflowItems = overflow?.items ?? [];
  const hasStaticOverflow = staticOverflowItems.length > 0;

  // Prefer keeping leading tabs visible; collapse from the right.
  const clampedVisible = Math.max(0, Math.min(visibleCount, tabs.length));
  const visibleTabs = tabs.slice(0, clampedVisible);
  const collapsedTabs = tabs.slice(clampedVisible);

  const resolvedActiveLabel =
    activeLabelFromCollapsed(collapsedTabs)
    ?? (collapsedTabs.length === 0 || !anyPrimaryActive(tabs)
      ? (overflow?.activeLabel ?? null)
      : null)
    ?? null;

  const moreMenuItems: DataViewOverflowItem[] = useMemo(() => {
    const fromTabs = collapsedTabs.flatMap(flattenTabForMore);
    return [...fromTabs, ...staticOverflowItems];
  }, [collapsedTabs, staticOverflowItems]);

  const showMore = hasStaticOverflow || collapsedTabs.length > 0;

  const menuBackground = overflow?.menuBackground ?? "var(--color-raised)";
  const activeBackground = overflow?.activeBackground ?? "var(--market-stats-segment-active-bg)";
  const menuMinWidth = overflow?.minWidthPx ?? 200;

  useEffect(() => {
    if (!overflowOpen && !openGroupKey) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (overflowRef.current?.contains(target)) return;
      if (groupsRef.current?.contains(target)) return;
      setOverflowOpen(false);
      setOpenGroupKey(null);
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [overflowOpen, openGroupKey]);

  const tabsSignature = tabs
    .map((tab) => {
      const childSig = (tab.children ?? [])
        .map((child) => `${child.key}:${child.active}:${child.label}`)
        .join(",");
      return `${tab.key}:${tab.active}:${tab.label}[${childSig}]`;
    })
    .join("|");
  const overflowItemsSignature = staticOverflowItems
    .map((item) => `${item.key}:${item.active}:${item.label}`)
    .join("|");

  // Close menus when the active set of tabs changes (e.g. after selecting a filter).
  useEffect(() => {
    setOverflowOpen(false);
    setOpenGroupKey(null);
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
          const activeCollapsedLabel = activeLabelFromCollapsed(collapsedSlice);
          if (activeCollapsedLabel) {
            // Active More chip is wider; use measured active More when available.
            moreWidth = Math.max(
              moreBaseWidth,
              measureActiveMoreRef.current?.offsetWidth ?? moreBaseWidth + 24,
            );
          } else if (overflow?.activeLabel && !anyPrimaryActive(tabs)) {
            moreWidth = Math.max(
              moreBaseWidth,
              measureActiveMoreRef.current?.offsetWidth ?? moreBaseWidth,
            );
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

  function renderMenuItem(
    item: DataViewOverflowItem,
    onSelect: () => void,
  ) {
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => {
          item.onClick();
          onSelect();
        }}
        className={item.active ? MENU_ITEM_ACTIVE : MENU_ITEM_INACTIVE}
        style={{
          background: item.active ? activeBackground : "transparent",
        }}
      >
        <span>{item.label}</span>
        {item.meta ? <span className="ml-2 tabular-nums text-fg-dim">{item.meta}</span> : null}
      </button>
    );
  }

  function renderDropdownMenu(items: readonly DataViewOverflowItem[], onSelect: () => void) {
    return (
      <div
        className="absolute left-0 top-full z-50 mt-1 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border py-1"
        style={{
          minWidth: `${menuMinWidth}px`,
          background: menuBackground,
          borderColor,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        {items.map((item) => renderMenuItem(item, onSelect))}
      </div>
    );
  }

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
            {tabs.map((tab) =>
              isGroupTab(tab) ? (
                <span key={tab.key} className={MORE_BUTTON_CLASS}>
                  {tab.label}
                  <ChevronDownIcon />
                </span>
              ) : (
                <span key={tab.key} className={TAB_BUTTON_INACTIVE}>
                  {tab.label}
                </span>
              ),
            )}
          </div>
          <button ref={measureMoreRef} type="button" className={MORE_BUTTON_CLASS} tabIndex={-1}>
            {overflow?.label ?? "More"}
            <ChevronDownIcon />
          </button>
          <button ref={measureActiveMoreRef} type="button" className={MORE_BUTTON_CLASS} tabIndex={-1}>
            {resolvedActiveLabel
              ?? overflow?.activeLabel
              ?? activeLabelFromCollapsed(tabs.filter((tab) => tabIsActive(tab)))
              ?? overflow?.label
              ?? "More"}
            <ChevronDownIcon />
          </button>
        </div>
      </div>

      <div ref={groupsRef} className="flex min-w-0 flex-nowrap items-end gap-0">
        {visibleTabs.map((tab) => {
          const active = tabIsActive(tab);

          if (isGroupTab(tab) && tab.children) {
            const groupOpen = openGroupKey === tab.key;
            const childItems: DataViewOverflowItem[] = tab.children.map((child) => ({
              key: child.key,
              label: child.label,
              active: child.active,
              onClick: child.onClick,
              meta: child.meta,
            }));

            return (
              <div key={tab.key} className="relative shrink-0">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={groupOpen}
                  onClick={() => {
                    setOverflowOpen(false);
                    setOpenGroupKey((current) => (current === tab.key ? null : tab.key));
                  }}
                  className={
                    active
                      ? `${MORE_BUTTON_CLASS} text-[var(--fg-heading)]`
                      : `${MORE_BUTTON_CLASS} text-[var(--fg-muted)] hover:text-[var(--color-accent-interactive)]`
                  }
                >
                  {tab.label}
                  <ChevronDownIcon />
                  {active ? (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: "var(--fg-heading)" }}
                    />
                  ) : null}
                </button>
                {groupOpen
                  ? renderDropdownMenu(childItems, () => {
                      setOpenGroupKey(null);
                    })
                  : null}
              </div>
            );
          }

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setOpenGroupKey(null);
                setOverflowOpen(false);
                tab.onClick?.();
              }}
              className={active ? TAB_BUTTON_ACTIVE : TAB_BUTTON_INACTIVE}
            >
              {tab.label}
              {active ? (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "var(--fg-heading)" }}
                />
              ) : null}
            </button>
          );
        })}

        {showMore ? (
          <div ref={overflowRef} className="relative z-30 shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpenGroupKey(null);
                setOverflowOpen((current) => !current);
              }}
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

            {overflowOpen
              ? renderDropdownMenu(moreMenuItems, () => {
                  setOverflowOpen(false);
                })
              : null}
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
