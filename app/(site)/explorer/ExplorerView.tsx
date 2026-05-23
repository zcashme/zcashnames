/**
 * ExplorerView — the client-side orchestrator for the explorer page.
 * URL is the single source of truth for navigation state (env, tab, page, name).
 * useSearchParams is read directly; handlers call router.push() to update the URL.
 * Server components own data fetching; this component handles interactivity only.
 */
"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ExplorerToolbar from "./ExplorerToolbar";
import { PAGE_SIZE, parseExplorerTab, type ExplorerTab } from "./tabs";
import ExplorerNameDetail from "./ExplorerNameDetail";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import ResumeBanner from "@/components/purchases/ResumeBanner";
import { usePurchaseResume } from "@/components/hooks/usePurchaseResume";
import { resolveName } from "@/lib/zns/resolve";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ActionBadge from "@/components/ActionBadge";

import { useUsdPrice } from "@/components/hooks/useUsdPrice";
import CopyIconButton from "@/components/CopyIconButton";
import { filterRegistrations, zatsToZec } from "@/lib/zns/utils";
import type { Listing, Network, Registration, ResolveName, ZnsEvent } from "@/lib/types";
import type { Action } from "@/lib/types";
import { ACTIONS, ACTION_LABELS } from "@/lib/types";

function PaginationControls({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
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

function UivkVerifiedBadge({ value, verified }: { value: string; verified: boolean }) {
  if (!value) return null;
  if (verified) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]"
        style={{ background: "rgba(34,197,94,0.15)", color: "rgb(34,197,94)" }}
        title="Matches the UIVK baked into the SDK for this network"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
          <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em]"
      style={{ background: "rgba(239,68,68,0.15)", color: "rgb(239,68,68)" }}
      title="Indexer returned a UIVK that does not match the SDK's known value for this network"
    >
      <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
        <path d="M8 3v6M8 12v.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      Unverified
    </span>
  );
}

const PRIMARY_TABS: { key: ExplorerTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "forsale", label: "For Sale" },
];

const MORE_TABS: { key: ExplorerTab; label: string }[] = ACTIONS.map((a) => ({
  key: a,
  label: ACTION_LABELS[a],
}));

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
    uivkVerified: boolean;
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

  // ── URL-derived state (single source of truth) ────────────────────────────
  const tab = parseExplorerTab(searchParams.get("tab") ?? undefined);
  const rawPage = Number.parseInt(searchParams.get("page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const selectedName = searchParams.get("name");

  // ── Local UI state (not URL-driven) ──────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [uivkOpen, setUivkOpen] = useState(false);
  const [uivkCopied, setUivkCopied] = useState(false);
  const [modalState, setModalState] = useState<{ action: Action; resolveResult: ResolveName } | null>(null);
  const { snapshot: resumeSnap, visible: resumeVisible, dismiss: resumeDismiss } = usePurchaseResume();

  async function handleResume() {
    if (!resumeSnap) return;
    const fresh = await resolveName(resumeSnap.name, resumeSnap.network);
    setModalState({ action: resumeSnap.action, resolveResult: fresh });
  }

  const showNameDetail = !!selectedName;
  const nameDataReady = !!nameResult;

  // ── Tab counts (authoritative server totals; null where unknowable) ─────
  const hasSearchFilter = searchQuery.trim().length > 0;
  const filteredRegistrations = useMemo(
    () => filterRegistrations(initialRegistrations, searchQuery),
    [initialRegistrations, searchQuery],
  );
  const sortedListings = useMemo(
    () => [...initialListings].sort((a, b) => b.height - a.height),
    [initialListings],
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
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const visibleRegistrations = useMemo(
    () => filteredRegistrations.slice(sliceStart, sliceStart + PAGE_SIZE),
    [filteredRegistrations, sliceStart],
  );
  const visibleListings = useMemo(
    () => sortedListings.slice(sliceStart, sliceStart + PAGE_SIZE),
    [sortedListings, sliceStart],
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

  function copyUivk() {
    if (!stats.uivk) return;
    navigator.clipboard.writeText(stats.uivk);
    setUivkCopied(true);
    setTimeout(() => setUivkCopied(false), 2000);
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
          {stats.uivk && (
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
      />

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
                    {initialEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                          No events found.
                        </td>
                      </tr>
                    ) : (
                      initialEvents.map((ev) => (
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
                              <span className="text-fg-muted">-</span>
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
              totalPages={totalPages}
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

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    {network === "mainnet" ? "Mainnet" : "Testnet"}
                  </div>
                  <UivkVerifiedBadge value={stats.uivk} verified={stats.uivkVerified} />
                </div>
                <CopyIconButton
                  onClick={copyUivk}
                  ariaLabel={`Copy ${network} UIVK`}
                  title={uivkCopied ? "Copied!" : `Copy ${network} UIVK`}
                  copied={uivkCopied}
                  disabled={!stats.uivk}
                />
              </div>
              <p className="font-mono text-xs text-fg-muted break-all leading-relaxed">{stats.uivk || "Unavailable"}</p>
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
      {resumeVisible && resumeSnap && (
        <ResumeBanner snapshot={resumeSnap} onResume={handleResume} onDismiss={resumeDismiss} />
      )}
    </div>
  );
}
