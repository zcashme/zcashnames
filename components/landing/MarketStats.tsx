"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { NetworkStats } from "@/lib/network-stats";

type StatKey = "claimed" | "forSale" | "syncedHeight" | "waitlist" | "referred" | "rewardsPot";

type StatItem = {
  key: StatKey;
  label: string;
  value: string;
  helpText: string;
  deltaDayValue?: string | null;
  deltaWeekValue?: string | null;
  deltaMonthValue?: string | null;
};

const PROXIMITY_RADIUS = 170;

function formatSignedCount(value: number | null): string {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

function formatSignedZecInteger(value: number | null): string {
  if (value === null) return "--";
  const truncated = value < 0 ? Math.ceil(value) : Math.floor(value);
  return `${truncated > 0 ? "+" : ""}${truncated.toLocaleString()}`;
}

function buildItems(stats: NetworkStats): StatItem[] {
  if (stats.mode === "waitlist") {
    return [
      {
        key: "waitlist",
        label: "Waitlist",
        value: stats.waitlist.toLocaleString(),
        helpText: "Number of people gaining early access to claim their ZcashName.",
        deltaDayValue: formatSignedCount(stats.deltas.waitlist.day),
        deltaWeekValue: formatSignedCount(stats.deltas.waitlist.week),
        deltaMonthValue: formatSignedCount(stats.deltas.waitlist.month),
      },
      {
        key: "referred",
        label: "Referred",
        value: stats.referred.toLocaleString(),
        helpText: "Number of waitlist members who were referred by someone.",
        deltaDayValue: formatSignedCount(stats.deltas.referred.day),
        deltaWeekValue: formatSignedCount(stats.deltas.referred.week),
        deltaMonthValue: formatSignedCount(stats.deltas.referred.month),
      },
      {
        key: "rewardsPot",
        label: "Rewards",
        value: `${Math.floor(stats.rewardsPot).toLocaleString()} ZEC`,
        helpText: "Estimated total rewards to be issued when names are purchased during early access.",
        deltaDayValue: formatSignedZecInteger(stats.deltas.rewardsPot.day),
        deltaWeekValue: formatSignedZecInteger(stats.deltas.rewardsPot.week),
        deltaMonthValue: formatSignedZecInteger(stats.deltas.rewardsPot.month),
      },
    ];
  }
  return [
    { key: "claimed", label: "Claimed", value: stats.claimed.toLocaleString(), helpText: "Claimed means this .zcash name is already registered to an owner on-chain." },
    { key: "forSale", label: "For Sale", value: stats.forSale.toLocaleString(), helpText: "For Sale means the current owner has listed the name and can accept a purchase." },
    { key: "syncedHeight", label: "Block", value: stats.syncedHeight.toLocaleString(), helpText: "The latest block height synced by the ZNS indexer." },
  ];
}

export default function MarketStats({ stats }: { stats: NetworkStats }) {
  const [activeKey, setActiveKey] = useState<StatKey | null>(null);
  const [hoverKey, setHoverKey] = useState<StatKey | null>(null);
  const itemRefs = useRef(new Map<StatKey, HTMLButtonElement>());

  const items = buildItems(stats);
  const isWaitlistMode = stats.mode === "waitlist";
  const deltaValueWidthCh = isWaitlistMode
    ? Math.max(
        2,
        ...items.flatMap((item) => [
          item.deltaDayValue?.length ?? 2,
          item.deltaWeekValue?.length ?? 2,
          item.deltaMonthValue?.length ?? 2,
        ]),
      )
    : 0;
  const activeItem = items.find((item) => item.key === activeKey);
  const isHelpVisible = Boolean(activeItem);

  const register = (key: StatKey, node: HTMLButtonElement | null) => {
    if (node) {
      itemRefs.current.set(key, node);
      return;
    }
    itemRefs.current.delete(key);
  };

  const resetItems = () => {
    for (const node of itemRefs.current.values()) {
      node.style.setProperty("--stats-scale", "1");
      node.style.setProperty("--stats-shadow-opacity", "0");
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;

    for (const node of itemRefs.current.values()) {
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      const influence = Math.max(0, 1 - distance / PROXIMITY_RADIUS);
      const eased = influence * influence;

      node.style.setProperty("--stats-scale", `${1 + eased * 0.08}`);
      node.style.setProperty("--stats-shadow-opacity", `${eased * 0.22}`);
    }
  };

  return (
    <section
      className="relative z-[2] w-full px-4 pb-10 sm:px-6 sm:pb-12 max-[700px]:pb-8"
      onPointerMove={handlePointerMove}
      onPointerLeave={resetItems}
    >
      <div className="mx-auto w-full max-w-2xl rounded-[24px] p-3 sm:max-w-3xl sm:p-4 xl:max-w-4xl">
        <div className="grid grid-cols-3">
          {items.map((item, index) => {
            const isHighlighted = hoverKey === item.key || activeKey === item.key;
            return (
              <button
                ref={(node) => register(item.key, node)}
                key={item.key}
                type="button"
                aria-pressed={activeKey === item.key}
                aria-controls="market-stats-help"
                onClick={() => setActiveKey((curr) => curr === item.key ? null : item.key)}
                onMouseEnter={() => setHoverKey(item.key)}
                onMouseLeave={() => setHoverKey((curr) => curr === item.key ? null : curr)}
                onFocus={() => setHoverKey(item.key)}
                onBlur={() => setHoverKey((curr) => curr === item.key ? null : curr)}
                className={`cursor-pointer px-3 py-2 text-center transition-[transform,box-shadow,border-color] duration-200 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)] sm:px-5 sm:py-3 ${index > 0 ? "border-l" : ""}`}
                style={{
                  borderColor: "var(--partner-card-border)",
                  transform: "translateZ(0) scale(var(--stats-scale, 1))",
                  boxShadow: "0 18px 36px rgba(0, 0, 0, var(--stats-shadow-opacity, 0))",
                }}
              >
                <div
                  className={`mx-1 rounded-[0.8rem] px-2 transition-colors duration-200 ease-out sm:px-3 ${isWaitlistMode ? "py-3 sm:py-3.5" : "py-2 sm:py-2.5"}`}
                  style={{ background: isHighlighted ? "var(--market-stats-segment-active-bg)" : "transparent" }}
                >
                  {isWaitlistMode ? (
                    <div className="flex min-h-[8.75rem] flex-col items-center justify-start text-center">
                      <div className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-dim sm:text-[0.78rem]">
                        {item.label}
                      </div>
                      <div className="mt-3 tabular-nums text-[clamp(1.4rem,2.8vw,2rem)] font-semibold leading-none tracking-[-0.015em] text-fg-heading">
                        {item.value}
                      </div>
                      <div className="mt-3 flex flex-col items-center gap-1 tabular-nums text-[0.68rem] font-medium leading-none text-fg-muted sm:text-[0.72rem]">
                        {[
                          { value: item.deltaDayValue ?? "--", label: "1d" },
                          { value: item.deltaWeekValue ?? "--", label: "7d" },
                          { value: item.deltaMonthValue ?? "--", label: "30d" },
                        ].map((delta) => (
                          <div key={`${item.key}-${delta.label}`} className="flex items-baseline justify-end gap-2">
                            <span className="inline-block text-right" style={{ width: `${deltaValueWidthCh}ch` }}>
                              {delta.value}
                            </span>
                            <span className="inline-block w-[2.6ch] text-left">{delta.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="tabular-nums text-[clamp(1.25rem,2.5vw,1.85rem)] font-semibold leading-none tracking-[-0.015em] text-fg-heading">
                        {item.value}
                      </div>
                      <div className="mt-1 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-dim sm:mt-1.5 sm:text-[0.78rem]">
                        {item.label}
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div
          id="market-stats-help"
          aria-live="polite"
          className={`overflow-hidden transition-all duration-300 ease-out ${isHelpVisible ? "mt-3 max-h-32 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0 pointer-events-none"}`}
        >
          <p
            className="rounded-xl border px-4 py-2 text-[0.78rem] font-medium leading-relaxed sm:text-sm"
            style={{ background: "var(--market-stats-help-bg)", borderColor: "var(--market-stats-help-border)", color: "var(--market-stats-help-text)" }}
          >
            {activeItem?.helpText}
          </p>
        </div>
      </div>
    </section>
  );
}
