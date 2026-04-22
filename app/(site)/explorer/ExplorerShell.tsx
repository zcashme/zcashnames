"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ExplorerToolbar, { type Environment, type SortBy } from "./ExplorerToolbar";
import ExplorerContent from "./ExplorerContent";
import {
  ACTION_TYPES,
  filterEvents,
  filterListings,
  filterRegistrations,
  getTabCountLabel,
  getTabEvents,
  normalizeExplorerQuery,
  type ExplorerTab,
  type TabCounts,
  type TaggedEvent,
  type TaggedListing,
  type TaggedRegistration,
} from "./explorerFilters";
import ExplorerNameDetail from "./ExplorerNameDetail";
import Zip321Modal, { type ModalTarget } from "@/components/landing/Zip321Modal";
import PendingTransactionBanner from "@/components/landing/PendingTransactionBanner";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { useNetwork } from "@/components/hooks/useNetwork";
import { useUsdPrice } from "@/components/hooks/useUsdPrice";
import { usePendingTransaction } from "@/components/hooks/usePendingTransaction";
import type { ResolveName } from "@/lib/types";
import type { Action } from "@/lib/types";
import type { Event } from "@/lib/zns/client";
import type { Network } from "@/lib/zns/name";

const PRIMARY_TABS: { key: ExplorerTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "forsale", label: "For Sale" },
];

const MORE_TABS: { key: ExplorerTab; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "CLAIM", label: "Claim" },
  { key: "BUY", label: "Buy" },
  { key: "LIST", label: "List" },
  { key: "DELIST", label: "Delist" },
  { key: "UPDATE", label: "Update" },
  { key: "RELEASE", label: "Release" },
];

interface ExplorerShellProps {
  initialEvents: TaggedEvent[];
  initialEventsTotal: number;
  initialListings: TaggedListing[];
  initialRegistrations: TaggedRegistration[];
  stats: {
    claimed: number;
    forSale: number;
    verifiedOnZcashMe: number;
    syncedHeight: number;
    uivk: string;
  };
  uivks: {
    mainnet: string;
    testnet: string;
  };
  environment: Environment;
  nameQuery: string;
  nameResult: ResolveName | null;
  nameEvents: (Event & { network: string })[];
}

export default function ExplorerShell({
  initialEvents,
  initialEventsTotal,
  initialListings,
  initialRegistrations,
  stats,
  uivks,
  environment,
  nameQuery,
  nameResult,
  nameEvents,
}: ExplorerShellProps) {
  const router = useRouter();
  const { networkPassword } = useNetwork();
  const usdPerZec = useUsdPrice();
  const [isPending, startTransition] = useTransition();
  const [optimisticEnv, setOptimisticEnv] = useOptimistic(environment);
  const {
    hydrated: pendingHydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
    resumeTarget,
  } = usePendingTransaction(() => router.refresh());

  const [activeTab, setActiveTab] = useState<ExplorerTab>("all");
  const [sortBy, setSortBy] = useState<SortBy>("height");
  const [searchQuery, setSearchQuery] = useState(nameQuery || "");
  const [selectedName, setSelectedName] = useState(nameQuery || "");
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);

  const hasSearchFilter = normalizeExplorerQuery(searchQuery).length > 0;
  const tabCounts = useMemo(() => {
    const counts: TabCounts = {
      all: {
        filtered: filterEvents(getTabEvents("all", initialEvents), searchQuery).length,
        total: getTabEvents("all", initialEvents).length,
      },
      forsale: {
        filtered: filterListings(initialListings, searchQuery).length,
        total: initialListings.length,
      },
      registered: {
        filtered: filterRegistrations(initialRegistrations, searchQuery).length,
        total: initialRegistrations.length,
      },
      admin: {
        filtered: filterEvents(getTabEvents("admin", initialEvents), searchQuery).length,
        total: getTabEvents("admin", initialEvents).length,
      },
    };
    for (const action of ACTION_TYPES) {
      const tabEvents = getTabEvents(action, initialEvents);
      counts[action] = {
        filtered: filterEvents(tabEvents, searchQuery).length,
        total: tabEvents.length,
      };
    }
    return counts;
  }, [initialEvents, initialListings, initialRegistrations, searchQuery]);

  // Sync search input with URL name param (back/forward navigation)
  const [prevNameQuery, setPrevNameQuery] = useState(nameQuery);
  if (prevNameQuery !== nameQuery) {
    setPrevNameQuery(nameQuery);
    setSearchQuery(nameQuery);
    setSelectedName(nameQuery);
  }

  const [moreOpen, setMoreOpen] = useState(false);

  const [uivkOpen, setUivkOpen] = useState(false);
  const [copied, setCopied] = useState<"mainnet" | "testnet" | null>(null);

  const isMoreTabActive = MORE_TABS.some((t) => t.key === activeTab);
  const activeMoreLabel = MORE_TABS.find((t) => t.key === activeTab)?.label;
  const detailNetwork: Network = optimisticEnv === "all" ? "mainnet" : optimisticEnv;

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  function makeUrl(overrides: { env?: string; name?: string | null; forceEnv?: boolean }) {
    const params = new URLSearchParams();
    const env = overrides.env ?? optimisticEnv;
    if (env && (env !== "mainnet" || overrides.forceEnv)) params.set("env", env);
    const name = overrides.name === undefined ? nameQuery : overrides.name;
    if (name) params.set("name", name);
    const qs = params.toString();
    return qs ? `/explorer?${qs}` : "/explorer";
  }

  function handleEnvironmentChange(env: Environment) {
    const url = makeUrl({ env });
    startTransition(() => {
      setOptimisticEnv(env);
      router.push(url);
    });
  }

  function handleSearchSubmit() {
    const q = searchQuery.trim();
    if (!q) return;
    const url = makeUrl({ name: q });
    setSelectedName(q);
    startTransition(() => {
      router.push(url);
    });
  }

  function handleSearchChange(nextQuery: string) {
    setSearchQuery(nextQuery);
    if (selectedName) setSelectedName("");
  }

  function handleNameClick(name: string, rowNetwork?: Network) {
    setSearchQuery(name);
    setSelectedName(name);
    const nextEnv = optimisticEnv === "all" && rowNetwork ? rowNetwork : undefined;
    const url = makeUrl({ env: nextEnv, name, forceEnv: !!nextEnv });
    startTransition(() => {
      if (nextEnv) setOptimisticEnv(nextEnv);
      router.push(url);
    });
  }

  function clearNameDetail() {
    setSearchQuery("");
    setSelectedName("");
    const url = makeUrl({ name: null });
    startTransition(() => {
      router.push(url);
    });
  }

  function handleTabChange(tab: ExplorerTab) {
    setActiveTab(tab);
    if (selectedName) setSelectedName("");
  }

  function handleDetailAction(action: Action) {
    if (!nameDataReady || !nameResult) return;

    const target: ModalTarget = {
      name: nameResult.query,
      action,
      network: detailNetwork,
      networkPassword,
      isReserved: nameResult.status === "reserved",
    };

    if (nameResult.status === "registered" || nameResult.status === "listed") {
      target.registrationAddress = nameResult.registration.address;
      target.registrationNonce = nameResult.registration.nonce;
      target.registrationPubkey = nameResult.registration.pubkey ?? null;
      target.listingPriceZec = nameResult.status === "listed" ? nameResult.listingPrice.zec : undefined;
    }

    setModalTarget(target);
  }

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  function copyUivk(network: "mainnet" | "testnet") {
    const value = uivks[network];
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(network);
    setTimeout(() => setCopied(null), 2000);
  }


  const showNameDetail = !!selectedName;
  const nameDataReady = selectedName === nameQuery;

  return (
    <div className="flex flex-col gap-6">
      <SiteRouteTitle title="Explorer" />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-[220px] flex-1 text-sm" style={{ color: "var(--fg-muted)" }}>
          Browse registered ZcashNames, activity, and listings.
        </p>
        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted tabular-nums transition-colors hover:text-fg-heading"
            style={{ borderColor: "var(--leaders-card-border)" }}
            title="Refresh"
          >
            Block{" "}
            {isPending ? (
              <span className="inline-block h-[0.75em] w-14 animate-pulse rounded-md bg-fg-dim/20 align-middle" />
            ) : (
              stats.syncedHeight.toLocaleString()
            )}
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M13.5 8a5.5 5.5 0 1 1-1.3-3.56"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M12.5 2v3h-3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {(uivks.mainnet || uivks.testnet) && (
            <button
              type="button"
              onClick={() => setUivkOpen(true)}
              className="cursor-pointer whitespace-nowrap rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              UIVK
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <ExplorerToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onClearSearch={clearNameDetail}
        environment={optimisticEnv}
        onEnvironmentChange={handleEnvironmentChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {pendingHydrated && pendingTransaction && !modalTarget && (
        <PendingTransactionBanner
          pendingTransaction={pendingTransaction}
          onResume={() => {
            if (resumeTarget) setModalTarget({ ...resumeTarget, networkPassword });
          }}
          onDismiss={clearPendingTransaction}
        />
      )}

      {/* Tabs */}
      <div
        className="flex items-end gap-0 border-b"
        style={{ borderColor: "var(--leaders-card-border)" }}
      >
        {PRIMARY_TABS.map((t) => {
          const count = tabCounts?.[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className="relative shrink-0 cursor-pointer px-4 py-2.5 text-[0.82rem] font-semibold transition-colors whitespace-nowrap"
              style={{ color: activeTab === t.key ? "var(--fg-heading)" : "var(--fg-muted)" }}
            >
              {t.label}
              {count != null && (
                <>
                  {" "}
                  <span className="ml-1 tabular-nums">({getTabCountLabel(count, hasSearchFilter)})</span>
                </>
              )}
              {activeTab === t.key && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{ background: "var(--fg-heading)" }}
                />
              )}
            </button>
          );
        })}

        {/* More dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="relative flex cursor-pointer items-center gap-1 px-4 py-2.5 text-[0.82rem] font-semibold transition-colors whitespace-nowrap"
            style={{ color: isMoreTabActive ? "var(--fg-heading)" : "var(--fg-muted)" }}
          >
            {isMoreTabActive ? activeMoreLabel : "More"}
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isMoreTabActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "var(--fg-heading)" }}
              />
            )}
          </button>
          {moreOpen && (
            <>
            <div className="fixed inset-0 z-20" onClick={() => setMoreOpen(false)} />
            <div
              className="absolute left-0 top-full z-30 mt-1 min-w-[160px] rounded-xl border py-1"
              style={{
                background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
                borderColor: "var(--leaders-card-border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
              }}
            >
              {MORE_TABS.map((t) => {
                const count = tabCounts?.[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => { handleTabChange(t.key); setMoreOpen(false); }}
                    className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-[0.82rem] font-semibold transition-colors"
                    style={{
                      color: activeTab === t.key ? "var(--fg-heading)" : "var(--fg-muted)",
                      background: activeTab === t.key ? "var(--market-stats-segment-active-bg)" : "transparent",
                    }}
                  >
                    <span>{t.label}</span>
                    {count != null && (
                      <span className="ml-2 tabular-nums text-fg-dim">
                        ({getTabCountLabel(count, hasSearchFilter)})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>

      {/* Name detail (when a specific name is searched) */}
      {showNameDetail && (
        <ExplorerNameDetail
          query={selectedName}
          result={nameDataReady ? nameResult : null}
          events={nameDataReady ? nameEvents : []}
          isPending={isPending && !nameDataReady}
          usdPerZec={usdPerZec}
          onAction={handleDetailAction}
        />
      )}

      {/* Content (hidden while name detail is showing, kept mounted to preserve load-more state) */}
      <div className={showNameDetail ? "hidden" : ""}>
        <div className={isPending && !showNameDetail ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
          <ExplorerContent
            tab={activeTab}
            environment={environment}
            sortBy={sortBy}
            searchQuery={searchQuery}
            onNameClick={handleNameClick}

            initialEvents={initialEvents}
            initialEventsTotal={initialEventsTotal}
            initialListings={initialListings}
            initialRegistrations={initialRegistrations}
          />
        </div>
      </div>

      {/* UIVK Modal */}
      {uivkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setUivkOpen(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border px-8 py-7 flex flex-col gap-5"
            style={{
              background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
              borderColor: "var(--leaders-card-border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
            }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="font-bold tracking-tight"
                style={{ fontSize: "var(--type-section-subtitle)", color: "var(--fg-heading)" }}
              >
                UIVK
              </h2>
              <button
                type="button"
                onClick={() => setUivkOpen(false)}
                className="cursor-pointer text-fg-muted transition-colors hover:text-fg-heading"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Mainnet
                </div>
                <p className="font-mono text-xs text-fg-muted break-all leading-relaxed">
                  {uivks.mainnet || "Unavailable"}
                </p>
                <button
                  type="button"
                  onClick={() => copyUivk("mainnet")}
                  disabled={!uivks.mainnet}
                  className="self-start rounded-full px-5 py-2 text-sm font-bold cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--leaders-rank-gold)",
                    color: "var(--leaders-rank-text)",
                  }}
                >
                  {copied === "mainnet" ? "Copied!" : "Copy Mainnet"}
                </button>
              </div>

              <div className="h-px w-full bg-[var(--leaders-card-border)]" />

              <div className="flex flex-col gap-2">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                  Testnet
                </div>
                <p className="font-mono text-xs text-fg-muted break-all leading-relaxed">
                  {uivks.testnet || "Unavailable"}
                </p>
                <button
                  type="button"
                  onClick={() => copyUivk("testnet")}
                  disabled={!uivks.testnet}
                  className="self-start rounded-full px-5 py-2 text-sm font-bold cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: "var(--leaders-rank-gold)",
                    color: "var(--leaders-rank-text)",
                  }}
                >
                  {copied === "testnet" ? "Copied!" : "Copy Testnet"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isClientMounted && modalTarget && (
        <Zip321Modal
          target={modalTarget}
          onClose={() => setModalTarget(null)}
          onSuccess={() => router.refresh()}
          resumeState={pendingTransaction}
          onPersistState={persistPendingTransaction}
          onClearState={clearPendingTransaction}
        />
      )}
    </div>
  );
}
