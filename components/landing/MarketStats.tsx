"use client";

import { useState } from "react";
import LandingActionLink from "@/components/landing/LandingActionLink";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";
import type { NetworkStats } from "@/lib/network-stats";

type StatKey = "claimed" | "online" | "syncedHeight";

type StatItem = {
  key: StatKey;
  label: string;
  value: string;
  helpText: string;
};

function LeaderboardLink() {
  return (
    <LandingActionLink
      proximityId="leaderboard-link"
      href="/leaders"
      label="Leaderboard"
      variant="text"
      showArrow
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6.5L13.1 8.8L15.6 9.1L13.8 10.8L14.2 13.3L12 12.1L9.8 13.3L10.2 10.8L8.4 9.1L10.9 8.8L12 6.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      }
    />
  );
}

function DashboardLink() {
  return (
    <LandingActionLink
      proximityId="dashboard-link"
      href="/leaders/ref"
      label="Dashboard"
      variant="text"
      showArrow
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <rect x="3" y="4" width="8" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="4" width="8" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="13" width="8" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="17" width="8" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      }
    />
  );
}

function ExplorerLink() {
  return (
    <LandingActionLink
      proximityId="explorer-link"
      href="/explorer"
      label="Explorer"
      variant="text"
      showArrow
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      }
    />
  );
}

function actionLinkForStat(key: StatKey) {
  if (key === "claimed") return <ExplorerLink />;
  return null;
}

function buildItems(stats: NetworkStats): StatItem[] {
  return [
    {
      key: "claimed",
      label: "Claimed",
      value: stats.claimed.toLocaleString(),
      helpText: "Claimed means this .zcash name is already registered to an owner on-chain.",
    },
    {
      key: "online",
      label: "Mint",
      value: stats.online ? "Live" : "Offline",
      helpText:
        stats.mode === "testnet"
          ? "The testnet mint is live and accepting requests."
          : "The mainnet mint is not online yet. Testnet is live.",
    },
    {
      key: "syncedHeight",
      label: "Block",
      value: stats.syncedHeight.toLocaleString(),
      helpText: "The latest block height synced by the ZNS resolver.",
    },
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
  const activeItem = items.find((item) => item.key === activeKey);
  const isHelpVisible = Boolean(activeItem);
  const activeAction = activeItem ? actionLinkForStat(activeItem.key) : null;

  return (
    <section
      id={sectionId}
      className="relative z-[2] w-full px-4 pb-10 sm:px-6 sm:pb-12 max-[700px]:pb-8"
    >
      <div className="mb-3 text-center">
        <SectionHeaderPill title="Network" variant="pill" />
      </div>
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
                <div className="mx-1 rounded-[0.8rem] px-2 py-2 transition-colors duration-200 ease-out sm:px-3 sm:py-2.5">
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
                </div>
              </button>
            );
          })}
        </div>
        <div
          id="market-stats-help"
          aria-live="polite"
          className={`overflow-hidden transition-all duration-300 ease-out ${isHelpVisible ? (activeAction ? "mt-3 max-h-48 translate-y-0 opacity-100" : "mt-3 max-h-32 translate-y-0 opacity-100") : "max-h-0 -translate-y-1 opacity-0 pointer-events-none"}`}
        >
          <p
            className="px-4 py-2 text-center text-[0.78rem] font-medium leading-relaxed sm:text-sm"
            style={{ color: "var(--market-stats-help-text)" }}
          >
            {activeItem?.helpText}
          </p>
          {activeAction ? (
            <div className="flex justify-center px-4 pb-2">
              {activeAction}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
