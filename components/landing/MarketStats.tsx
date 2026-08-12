"use client";

import { useState } from "react";
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

function formatSignedCount(value: number | null): string {
  if (value === null) return "--";
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

function formatSignedZecDecimal(value: number | null): string {
  if (value === null) return "--";
  const formatted = Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value > 0 ? "+" : value < 0 ? "-" : ""}${formatted}`;
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
        deltaDayValue: formatSignedZecDecimal(stats.deltas.rewardsPot.day),
        deltaWeekValue: formatSignedZecDecimal(stats.deltas.rewardsPot.week),
        deltaMonthValue: formatSignedZecDecimal(stats.deltas.rewardsPot.month),
      },
    ];
  }
  return [
    { key: "claimed", label: "Claimed", value: stats.claimed.toLocaleString(), helpText: "Claimed means this .zcash name is already registered to an owner on-chain." },
    { key: "forSale", label: "For Sale", value: stats.forSale.toLocaleString(), helpText: "For Sale means the current owner has listed the name and can accept a purchase." },
    { key: "syncedHeight", label: "Block", value: stats.syncedHeight.toLocaleString(), helpText: "The latest block height synced by the ZNS indexer." },
  ];
}

export default function MarketStats({
  stats,
  sectionId,
}: {
  stats: NetworkStats;
  sectionId?: string;
}) {
  const [activeKey, setActiveKey] = useState<StatKey | null>(null);
  const [hoverKey, setHoverKey] = useState<StatKey | null>(null);

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
  const deltaSideWidthCh = Math.max(deltaValueWidthCh, 3);
  const activeItem = items.find((item) => item.key === activeKey);
  const isHelpVisible = Boolean(activeItem);

  return (
    <section
      id={sectionId}
      className="relative z-[2] w-full px-4 pb-10 sm:px-6 sm:pb-12 max-[700px]:pb-8"
    >
      <div className="mx-auto w-full max-w-2xl rounded-[24px] p-3 sm:max-w-3xl sm:p-4 xl:max-w-4xl">
        <div className="relative grid grid-cols-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/3 top-0 w-px -translate-x-1/2"
            style={{ background: "var(--partner-card-border)" }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-2/3 top-0 w-px -translate-x-1/2"
            style={{ background: "var(--partner-card-border)" }}
          />
          {items.map((item) => {
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
                className="cursor-pointer px-3 py-2 text-center transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)] sm:px-5 sm:py-3"
              >
                <div
                  className={`mx-1 rounded-[0.8rem] px-2 transition-colors duration-200 ease-out sm:px-3 ${isWaitlistMode ? "py-3 sm:py-3.5" : "py-2 sm:py-2.5"}`}
                >
                  {isWaitlistMode ? (
                    <div className="flex min-h-[8.75rem] flex-col items-center justify-center gap-3 text-center">
                      <div
                        className="text-[0.74rem] font-semibold uppercase tracking-[0.08em] sm:text-[0.78rem]"
                        style={{ color: isHighlighted ? "var(--color-accent-interactive)" : "var(--fg-dim)" }}
                      >
                        {item.label}
                      </div>
                      <div
                        className="tabular-nums text-[clamp(1.4rem,2.8vw,2rem)] font-semibold leading-none tracking-[-0.015em] transition-colors"
                        style={{ color: isHighlighted ? "var(--color-accent-interactive)" : "var(--fg-heading)" }}
                      >
                        {item.value}
                      </div>
                      <div
                        className="flex flex-col items-center gap-1 tabular-nums text-[0.68rem] font-medium leading-none transition-colors sm:text-[0.72rem]"
                        style={{ color: isHighlighted ? "var(--color-accent-interactive)" : "var(--fg-muted)" }}
                      >
                        {[
                          { value: item.deltaDayValue ?? "--", label: "1d" },
                          { value: item.deltaWeekValue ?? "--", label: "7d" },
                          { value: item.deltaMonthValue ?? "--", label: "30d" },
                        ].map((delta) => (
                          <div
                            key={`${item.key}-${delta.label}`}
                            className="grid items-baseline justify-center"
                            style={{ gridTemplateColumns: `${deltaSideWidthCh}ch 0.9ch ${deltaSideWidthCh}ch` }}
                          >
                            <span className="inline-block text-right">
                              {delta.value}
                            </span>
                            <span aria-hidden="true" />
                            <span className="inline-block text-left">{delta.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="tabular-nums text-[clamp(1.25rem,2.5vw,1.85rem)] font-semibold leading-none tracking-[-0.015em] transition-colors"
                        style={{ color: isHighlighted ? "var(--color-accent-interactive)" : "var(--fg-heading)" }}
                      >
                        {item.value}
                      </div>
                      <div
                        className="mt-1 text-[0.74rem] font-semibold uppercase tracking-[0.08em] transition-colors sm:mt-1.5 sm:text-[0.78rem]"
                        style={{ color: isHighlighted ? "var(--color-accent-interactive)" : "var(--fg-dim)" }}
                      >
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
            className="px-4 py-2 text-center text-[0.78rem] font-medium leading-relaxed sm:text-sm"
            style={{ color: "var(--market-stats-help-text)" }}
          >
            {activeItem?.helpText}
          </p>
        </div>
      </div>
    </section>
  );
}
