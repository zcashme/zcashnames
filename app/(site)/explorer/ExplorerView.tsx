/**
 * ExplorerView — the client-side orchestrator for the explorer page.
 * URL is the single source of truth for navigation state (env, tab, page, name).
 * useSearchParams is read directly; handlers call router.push() to update the URL.
 * Server components own data fetching; this component handles interactivity only.
 */
"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ExplorerToolbar, { type SortBy } from "./ExplorerToolbar";
import {
  EXPLORER_PAGE_SIZE,
  clampPage,
  filterRegistrations,
  getTabEvents,
  getTotalPages,
  normalizeExplorerQuery,
  paginateRows,
  parseExplorerPage,
  parseExplorerTab,
  type ExplorerTab,
} from "./explorerFilters";
import ExplorerNameDetail from "./ExplorerNameDetail";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import PendingTransactionBanner from "@/components/landing/PendingTransactionBanner";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ActionBadge from "@/components/ActionBadge";

import { useUsdPrice } from "@/components/hooks/useUsdPrice";
import { usePendingTransaction } from "@/components/hooks/usePendingTransaction";
import CopyIconButton from "@/components/CopyIconButton";
import { zatsToZec } from "@/lib/zns/utils";
import type { Listing, Network, Registration, ResolveName, ZnsEvent } from "@/lib/types";
import type { Action } from "@/lib/types";
import { ACTIONS, ACTION_LABELS } from "@/lib/types";

function sortEvents(events: ZnsEvent[], sortBy: SortBy): ZnsEvent[] {
  return [...events].sort((a, b) => {
    if (sortBy === "height") return b.height - a.height;
    if (sortBy === "name") return a.name.localeCompare(b.name) || b.height - a.height;
    return a.action.localeCompare(b.action) || b.height - a.height;
  });
}

function sortListings(listings: Listing[], sortBy: SortBy): Listing[] {
  return [...listings].sort((a, b) => {
    if (sortBy === "height") return b.height - a.height;
    if (sortBy === "name") return a.name.localeCompare(b.name) || b.height - a.height;
    return b.height - a.height;
  });
}

function sortRegistrations(registrations: Registration[], sortBy: SortBy): Registration[] {
  return [...registrations].sort((a, b) => {
    if (sortBy === "height") return b.height - a.height || a.name.localeCompare(b.name);
    if (sortBy === "name") return a.name.localeCompare(b.name) || b.height - a.height;
    const aStatus = a.listing ? "listed" : "registered";
    const bStatus = b.listing ? "listed" : "registered";
    return aStatus.localeCompare(bStatus) || b.height - a.height || a.name.localeCompare(b.name);
  });
}

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= 0) return null;
  const totalPages = getTotalPages(totalItems, pageSize);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div
      className="border-t px-5 py-3 flex items-center justify-between gap-3"
      style={{ borderColor: "var(--leaders-card-border)" }}
      data-testid="explorer-pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoPrev}
        className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-fg-muted tabular-nums">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoNext}
        className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

const PRIMARY_TABS: { key: ExplorerTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "forsale", label: "For Sale" },
];

const MORE_TABS: { key: ExplorerTab; label: string }[] = [
  { key: "admin", label: "Admin" },
  ...ACTIONS.map(a => ({ key: a, label: ACTION_LABELS[a] })),
];

interface ExplorerViewProps {
  initialEvents: ZnsEvent[];
  initialEventsTotal: number;
  initialListings: Listing[];
  initialRegistrations: Registration[];
  stats: {
    claimed: number;
    forSale: number;
    syncedHeight: number;
    uivk: string;
  };
  uivks: {
    mainnet: string;
    testnet: string;
  };
  network: Network;
  nameQuery: string;
  nameResult: ResolveName | null;
  nameEvents: ZnsEvent[];
}

export default function ExplorerView({
  initialEvents,
  initialEventsTotal,
  initialListings,
  initialRegistrations,
  stats,
  uivks,
  network,
  nameQuery,
  nameResult,
  nameEvents,
}: ExplorerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const usdPerZec = useUsdPrice();
  const [isPending, startTransition] = useTransition();
  const [optimisticNetwork, setOptimisticNetwork] = useOptimistic(network);
  const {
    hydrated: pendingHydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
  } = usePendingTransaction(() => router.refresh());

  // ── URL-derived state (single source of truth) ────────────────────────────
  const tab = parseExplorerTab(searchParams.get("tab") ?? undefined);
  const page = parseExplorerPage(searchParams.get("page") ?? undefined);
  const selectedName = searchParams.get("name");

  // ── Local UI state (not URL-driven) ──────────────────────────────────────
  const [sortBy, setSortBy] = useState<SortBy>("height");
  const [searchQuery, setSearchQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [uivkOpen, setUivkOpen] = useState(false);
  const [copied, setCopied] = useState<"mainnet" | "testnet" | null>(null);
  const [modalState, setModalState] = useState<{ action: Action; resolveResult: ResolveName } | null>(null);

  const showNameDetail = !!selectedName;
  const nameDataReady = !!nameResult;

  // ── Tab counts (authoritative server totals; null where unknowable) ─────
  const hasSearchFilter = normalizeExplorerQuery(searchQuery).length > 0;
  const filteredRegistrations = useMemo(
    () => sortRegistrations(filterRegistrations(initialRegistrations, searchQuery), sortBy),
    [initialRegistrations, searchQuery, sortBy],
  );
  const sortedListings = useMemo(
    () => sortListings(initialListings, sortBy),
    [initialListings, sortBy],
  );
  const sortedEvents = useMemo(
    () => sortEvents(getTabEvents(tab, initialEvents), sortBy),
    [tab, initialEvents, sortBy],
  );

  function getTabCount(key: ExplorerTab): number | null {
    if (key === "registered") {
      return hasSearchFilter ? filteredRegistrations.length : stats.claimed;
    }
    if (key === "forsale") return stats.forSale;
    // Events-style tabs: only the active tab has a known total from the server.
    if (key === tab) return initialEventsTotal;
    return null;
  }

  // ── Active-tab pagination ────────────────────────────────────────────────
  const totalItems =
    tab === "registered" ? filteredRegistrations.length
    : tab === "forsale" ? sortedListings.length
    : initialEventsTotal;
  const safePage = clampPage(page, totalItems, EXPLORER_PAGE_SIZE);
  const visibleRegistrations = useMemo(
    () => paginateRows(filteredRegistrations, safePage, EXPLORER_PAGE_SIZE),
    [filteredRegistrations, safePage],
  );
  const visibleListings = useMemo(
    () => paginateRows(sortedListings, safePage, EXPLORER_PAGE_SIZE),
    [sortedListings, safePage],
  );

  const isMoreTabActive = MORE_TABS.some((t) => t.key === tab);
  const activeMoreLabel = MORE_TABS.find((t) => t.key === tab)?.label;

  // ── URL builder ───────────────────────────────────────────────────────────
  function buildUrl(opts: {
    network?: Network;
    name?: string | null;
    tab?: ExplorerTab;
    page?: number;
  }) {
    const params = new URLSearchParams();
    const net = opts.network ?? optimisticNetwork;
    const tabParam = opts.tab ?? tab;
    const pageParam = opts.page ?? page;
    if (net !== "mainnet") params.set("env", net);
    if (tabParam !== "all") params.set("tab", tabParam);
    if (pageParam > 1) params.set("page", String(pageParam));
    const name = opts.name === undefined ? selectedName : opts.name;
    if (name) params.set("name", name);
    const qs = params.toString();
    return qs ? `/explorer?${qs}` : "/explorer";
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleNetworkChange(net: Network) {
    startTransition(() => {
      setOptimisticNetwork(net);
      router.push(buildUrl({ network: net, page: 1 }));
    });
  }

  function handleSearchSubmit() {
    const q = searchQuery.trim();
    if (!q) return;
    startTransition(() => {
      router.push(buildUrl({ name: q, page: 1 }));
    });
  }

  function handleSearchChange(nextQuery: string) {
    const wasEmpty = !searchQuery;
    setSearchQuery(nextQuery);
    if (nextQuery && wasEmpty && (tab !== "registered" || page !== 1)) {
      startTransition(() => {
        router.push(buildUrl({ tab: "registered", page: 1 }));
      });
    }
  }

  function handleNameClick(name: string) {
    startTransition(() => {
      router.push(buildUrl({ name, page: 1 }));
    });
  }

  function clearNameDetail() {
    startTransition(() => {
      router.push(buildUrl({ name: null, page: 1 }));
    });
  }

  function handleTabChange(nextTab: ExplorerTab) {
    startTransition(() => {
      router.push(buildUrl({ tab: nextTab, page: 1, name: null }));
    });
  }

  function handleSortChange(nextSortBy: SortBy) {
    setSortBy(nextSortBy);
    if (page !== 1) {
      startTransition(() => {
        router.push(buildUrl({ page: 1 }));
      });
    }
  }

  function handlePageChange(nextPage: number) {
    const clamped = Math.max(1, nextPage);
    startTransition(() => {
      router.push(buildUrl({ page: clamped }));
    });
  }

  function handleDetailAction(action: Action) {
    if (!nameDataReady || !nameResult) return;
    setModalState({ action, resolveResult: nameResult });
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
        network={optimisticNetwork}
        onNetworkChange={handleNetworkChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
      />

      {pendingHydrated && pendingTransaction && (
        <PendingTransactionBanner
          pendingTransaction={pendingTransaction}
          onResume={() => {}}
          onDismiss={clearPendingTransaction}
        />
      )}

      {/* Tabs */}
      <div
        className="flex items-end gap-0 border-b"
        style={{ borderColor: "var(--leaders-card-border)" }}
      >
        {PRIMARY_TABS.map((t) => {
          const count = getTabCount(t.key);
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className="relative shrink-0 cursor-pointer px-4 py-2.5 text-[0.82rem] font-semibold transition-colors whitespace-nowrap"
              style={{ color: tab === t.key ? "var(--fg-heading)" : "var(--fg-muted)" }}
            >
              {t.label}
              {count != null && (
                <>
                  {" "}
                  <span className="ml-1 tabular-nums">({count})</span>
                </>
              )}
              {tab === t.key && (
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
                  const count = getTabCount(t.key);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        handleTabChange(t.key);
                        setMoreOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-[0.82rem] font-semibold transition-colors"
                      style={{
                        color: tab === t.key ? "var(--fg-heading)" : "var(--fg-muted)",
                        background: tab === t.key ? "var(--market-stats-segment-active-bg)" : "transparent",
                      }}
                    >
                      <span>{t.label}</span>
                      {count != null && (
                        <span className="ml-2 tabular-nums text-fg-dim">({count})</span>
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

      {/* Tab tables (hidden while name detail is showing) */}
      <div className={showNameDetail ? "hidden" : ""}>
        <div className={isPending && !showNameDetail ? "opacity-60 pointer-events-none transition-opacity" : "transition-opacity"}>
          <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}>
            <div className="overflow-x-auto">
              {tab === "registered" ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr
                      className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                      style={{ borderColor: "var(--leaders-card-border)" }}
                    >
                      <th className="px-4 py-3 sm:px-6">Name</th>
                      <th className="px-4 py-3 sm:px-6">Status</th>
                      <th className="hidden sm:table-cell px-4 py-3 sm:px-6">Address</th>
                      <th className="px-4 py-3 text-right sm:px-6">Block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRegistrations.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                          No registered names found.
                        </td>
                      </tr>
                    ) : (
                      visibleRegistrations.map((r) => (
                        <tr
                          key={`${r.name}:${r.txid}`}
                          className="border-b last:border-b-0 transition-colors"
                          style={{ borderColor: "var(--leaders-card-border)" }}
                        >
                          <td className="px-4 py-3 sm:px-6">
                            <button
                              type="button"
                              onClick={() => handleNameClick(r.name)}
                              className="font-semibold text-fg-heading hover:underline cursor-pointer"
                            >
                              {r.name}
                            </button>
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <span
                              className="rounded px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                              style={{ background: "var(--market-stats-segment-active-bg)" }}
                            >
                              {r.listing ? "Listed" : "Registered"}
                            </span>
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 sm:px-6">
                            <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">{r.address}</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">{r.height.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : tab === "forsale" ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr
                      className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                      style={{ borderColor: "var(--leaders-card-border)" }}
                    >
                      <th className="px-4 py-3 sm:px-6">Name</th>
                      <th className="px-4 py-3 text-right sm:px-6">Price</th>
                      <th className="px-4 py-3 sm:px-6">Status</th>
                      <th className="px-4 py-3 text-right sm:px-6">Block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleListings.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                          No names listed for sale.
                        </td>
                      </tr>
                    ) : (
                      visibleListings.map((l) => (
                        <tr
                          key={l.txid}
                          className="border-b last:border-b-0 transition-colors"
                          style={{ borderColor: "var(--leaders-card-border)" }}
                        >
                          <td className="px-4 py-3 sm:px-6">
                            <button
                              type="button"
                              onClick={() => handleNameClick(l.name)}
                              className="font-semibold text-fg-heading hover:underline cursor-pointer"
                            >
                              {l.name}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-fg-muted sm:px-6">{zatsToZec(l.price)} ZEC</td>
                          <td className="px-4 py-3 sm:px-6">
                            <span
                              className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                              style={{ background: "var(--market-stats-segment-active-bg)" }}
                            >
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">{l.height.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr
                      className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                      style={{ borderColor: "var(--leaders-card-border)" }}
                    >
                      <th className="px-4 py-3 sm:px-6">Action</th>
                      <th className="px-4 py-3 sm:px-6">Name</th>
                      <th className="hidden sm:table-cell px-4 py-3 sm:px-6">Address</th>
                      <th className="px-4 py-3 text-right sm:px-6">Block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                          No events found.
                        </td>
                      </tr>
                    ) : (
                      sortedEvents.map((ev) => (
                        <tr
                          key={ev.id}
                          className="border-b last:border-b-0 transition-colors"
                          style={{ borderColor: "var(--leaders-card-border)" }}
                        >
                          <td className="px-4 py-3 sm:px-6">
                            <ActionBadge action={ev.action} />
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            {ev.name ? (
                              <button
                                type="button"
                                onClick={() => handleNameClick(ev.name)}
                                className="font-semibold text-fg-heading hover:underline cursor-pointer"
                              >
                                {ev.name}
                              </button>
                            ) : (
                              <span className="text-fg-muted">(admin)</span>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-4 py-3 sm:px-6">
                            {ev.ua ? (
                              <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">{ev.ua}</span>
                            ) : (
                              <span className="text-fg-muted">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">{ev.height.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
            <PaginationControls
              page={safePage}
              totalItems={totalItems}
              pageSize={EXPLORER_PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          </div>
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
              <h2 className="font-bold tracking-tight" style={{ fontSize: "var(--type-section-subtitle)", color: "var(--fg-heading)" }}>
                Unified incoming view key
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
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">Mainnet</div>
                  <CopyIconButton
                    onClick={() => copyUivk("mainnet")}
                    ariaLabel="Copy mainnet UIVK"
                    title={copied === "mainnet" ? "Copied!" : "Copy mainnet UIVK"}
                    copied={copied === "mainnet"}
                    disabled={!uivks.mainnet}
                  />
                </div>
                <p className="font-mono text-xs text-fg-muted break-all leading-relaxed">{uivks.mainnet || "Unavailable"}</p>
              </div>

              <div className="h-px w-full bg-[var(--leaders-card-border)]" />

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">Testnet</div>
                  <CopyIconButton
                    onClick={() => copyUivk("testnet")}
                    ariaLabel="Copy testnet UIVK"
                    title={copied === "testnet" ? "Copied!" : "Copy testnet UIVK"}
                    copied={copied === "testnet"}
                    disabled={!uivks.testnet}
                  />
                </div>
                <p className="font-mono text-xs text-fg-muted break-all leading-relaxed">{uivks.testnet || "Unavailable"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedName && modalState && (
        <Zip321Modal
          action={modalState.action}
          name={modalState.resolveResult.query}
          network={optimisticNetwork}
          resolveResult={modalState.resolveResult}
          onClose={() => setModalState(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
