"use client";

import { useState } from "react";
import type { NetworkStats } from "@/lib/network-stats";

type StatKey = "claimed" | "forSale" | "syncedHeight" | "waitlist" | "referred" | "rewardsPot";

type StatItem = {
  key: StatKey;
  label: string;
  value: string;
  helpText: string;
};

function buildItems(stats: NetworkStats): StatItem[] {
  if (stats.mode === "waitlist") {
    return [
      { key: "waitlist", label: "Waitlist", value: stats.waitlist.toLocaleString(), helpText: "Number of people gaining early access to claim their ZcashName." },
      { key: "referred", label: "Referred", value: stats.referred.toLocaleString(), helpText: "Number of waitlist members who were referred by someone." },
      { key: "rewardsPot", label: "Rewards", value: `${stats.rewardsPot.toFixed(3)} ZEC`, helpText: "Estimated total rewards to be issued when names are purchased during early access." },
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

  const items = buildItems(stats);
  const activeItem = items.find((item) => item.key === activeKey);
  const isHelpVisible = Boolean(activeItem);

  return (
    <section className="relative z-[2] w-full px-4 pb-10 sm:px-6 sm:pb-12 max-[700px]:pb-8">
      <div className="mx-auto w-full max-w-2xl rounded-[24px] p-3 sm:max-w-3xl sm:p-4 xl:max-w-4xl">
        <div className="grid grid-cols-3">
          {items.map((item, index) => {
            const isHighlighted = hoverKey === item.key || activeKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={activeKey === item.key}
                aria-controls="market-stats-help"
                onClick={() => setActiveKey((curr) => curr === item.key ? null : item.key)}
                onMouseEnter={() => setHoverKey(item.key)}
                onMouseLeave={() => setHoverKey((curr) => curr === item.key ? null : curr)}
                onFocus={() => setHoverKey(item.key)}
                onBlur={() => setHoverKey((curr) => curr === item.key ? null : curr)}
                className={`cursor-pointer px-3 py-2 text-center transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)] sm:px-5 sm:py-3 ${index > 0 ? "border-l" : ""}`}
                style={{ borderColor: "var(--partner-card-border)" }}
              >
                <div
                  className="mx-1 rounded-[0.8rem] px-2 py-2 transition-colors duration-200 ease-out sm:px-3 sm:py-2.5"
                  style={{ background: isHighlighted ? "var(--market-stats-segment-active-bg)" : "transparent" }}
                >
                  <div className="tabular-nums text-[clamp(1.25rem,2.5vw,1.85rem)] font-semibold leading-none tracking-[-0.015em] text-fg-heading">
                    {item.value}
                  </div>
                  <div className="mt-1 text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-dim sm:mt-1.5 sm:text-[0.78rem]">
                    {item.label}
                  </div>
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
