/**
 * ExplorerView — the client-side orchestrator for the explorer page.
 * Name-detail search remains URL/server-driven; list-table navigation is
 * handled client-side through URL-synced params plus a cached fetch layer.
 */
"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import ExplorerToolbar from "./ExplorerToolbar";
import ExplorerNameDetail from "./ExplorerNameDetail";
import ExplorerListPane from "./ExplorerListPane";
import ResumeReplacementDialog from "@/components/purchases/ResumeReplacementDialog";
import { useUsdPrice } from "@/components/hooks/useUsdPrice";
import CopyIconButton from "@/components/CopyIconButton";
import SearchResultsSummary from "@/components/table/SearchResultsSummary";
import { getResumeToReplace, clearResume } from "@/lib/purchases/resume";
import { nameActionHref } from "@/lib/purchases/nameActionHref";
import type { ResumeSnapshot } from "@/lib/purchases/resume";
import type { ResolveName, ZnsEvent } from "@/lib/types";
import type { Action } from "@/lib/types";
import {
  normalizeExplorerSort,
  parseExplorerNetwork,
  parseExplorerPage,
  parseExplorerPageSize,
  parseExplorerSearchMode,
  parseExplorerTab,
  type ExplorerSearchMode,
} from "./listConfig";
import type { ExplorerListData } from "./listData";

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

function KeyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <circle cx="7.5" cy="12" r="3.5" />
      <path d="M11 12h8" />
      <path d="M16 12v-2.5" />
      <path d="M19 12v-2.5" />
    </svg>
  );
}

export default function ExplorerView({
  initialListData,
  nameQuery,
  nameResult,
  nameEvents,
}: {
  initialListData: ExplorerListData;
  nameQuery: string;
  nameResult: ResolveName | null;
  nameEvents: ZnsEvent[];
}) {
  const router = useAppRouter();
  const searchParams = useSearchParams();
  const usdPerZec = useUsdPrice();
  const [isPending, startTransition] = useTransition();
  const [isListRefreshing, setIsListRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(
    initialListData.searchMode === "contains" && initialListData.searchQuery
      ? initialListData.searchQuery
      : nameQuery,
  );
  const [searchMode, setSearchMode] = useState<ExplorerSearchMode>(
    nameQuery ? "exact" : (initialListData.searchMode ?? "contains"),
  );
  const [uivkOpen, setUivkOpen] = useState(false);
  const [uivkCopied, setUivkCopied] = useState(false);
  const [listRefreshNonce, setListRefreshNonce] = useState(0);
  const [currentListData, setCurrentListData] = useState(initialListData);
  const [pendingReplacement, setPendingReplacement] = useState<{
    action: Action;
    resolveResult: ResolveName;
    existing: ResumeSnapshot;
  } | null>(null);
  // Icon-only pills when description + full Block/UIVK chips cannot share one row.
  const [compactHeaderPills, setCompactHeaderPills] = useState(false);
  const headerRowRef = useRef<HTMLDivElement | null>(null);
  const headerDescMeasureRef = useRef<HTMLSpanElement | null>(null);
  const headerPillsFullMeasureRef = useRef<HTMLDivElement | null>(null);

  const selectedName = searchParams.get("name");
  const currentNetwork = parseExplorerNetwork(searchParams.get("env"));
  const currentTab = parseExplorerTab(searchParams.get("tab") ?? undefined);
  const currentPage = parseExplorerPage(searchParams.get("page"));
  const currentPageSize = parseExplorerPageSize(searchParams.get("pageSize"));
  const currentContainsSearch = searchParams.get("search") ?? "";
  const urlSearchMode = parseExplorerSearchMode(searchParams.get("searchMode"));
  const currentSort = normalizeExplorerSort(
    currentTab,
    searchParams.get("sortKey"),
    searchParams.get("sortDirection"),
  );
  const showNameDetail = !!selectedName;
  const nameDataReady = !!nameResult;
  const activeSearchMode: ExplorerSearchMode = showNameDetail ? "exact" : urlSearchMode;
  const activeSearchQuery = showNameDetail ? (selectedName ?? "") : currentContainsSearch.trim();
  const activeSearchMatchCount = showNameDetail ? (nameResult ? 1 : 0) : currentListData.totalCount;
  const showActiveSearchMatchCount = showNameDetail ? !isPending : !isListRefreshing;

  useEffect(() => {
    if (showNameDetail) {
      setSearchQuery(nameQuery);
      setSearchMode("exact");
      return;
    }

    if (currentContainsSearch.trim()) {
      setSearchQuery(currentContainsSearch);
      setSearchMode("contains");
      return;
    }

    setSearchQuery("");
    setSearchMode("contains");
  }, [currentContainsSearch, nameQuery, showNameDetail]);

  useEffect(() => {
    setCurrentListData(initialListData);
  }, [initialListData]);

  function buildUrl(opts: {
    network?: typeof currentNetwork;
    name?: string | null;
    tab?: typeof currentTab;
    page?: number;
    pageSize?: number;
    sortKey?: typeof currentSort.sortKey;
    sortDirection?: typeof currentSort.sortDirection;
    search?: string | null;
    searchMode?: ExplorerSearchMode | null;
  }) {
    const nextNetwork = opts.network ?? currentNetwork;
    const nextTab = opts.tab ?? currentTab;
    const nextPage = opts.page ?? currentPage;
    const nextPageSize = opts.pageSize ?? currentPageSize;
    const nextSort = normalizeExplorerSort(
      nextTab,
      opts.sortKey ?? currentSort.sortKey,
      opts.sortDirection ?? currentSort.sortDirection,
    );
    const params = new URLSearchParams();

    if (nextNetwork !== "mainnet") params.set("env", nextNetwork);
    if (nextTab !== "all") params.set("tab", nextTab);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextPageSize !== 25) params.set("pageSize", String(nextPageSize));

    const defaultSort = normalizeExplorerSort(nextTab, null, null);
    if (
      nextSort.sortKey !== defaultSort.sortKey
      || nextSort.sortDirection !== defaultSort.sortDirection
    ) {
      params.set("sortKey", nextSort.sortKey);
      params.set("sortDirection", nextSort.sortDirection);
    }

    const nextSearchMode = opts.searchMode === undefined ? activeSearchMode : opts.searchMode;
    const nextName = opts.name === undefined ? selectedName : opts.name;
    const nextSearch = opts.search === undefined ? currentContainsSearch : opts.search;

    if (nextSearchMode === "exact" && nextName) {
      params.set("name", nextName);
      params.set("searchMode", "exact");
    } else if (nextSearchMode === "contains" && nextSearch?.trim()) {
      params.set("search", nextSearch.trim());
      params.set("searchMode", "contains");
    }

    return params.toString() ? `/explorer?${params.toString()}` : "/explorer";
  }

  function handleNetworkChange(nextNetwork: typeof currentNetwork) {
    if (showNameDetail) {
      startTransition(() => {
        router.push(buildUrl({ network: nextNetwork, page: 1 }));
      });
      return;
    }

    window.history.pushState(null, "", buildUrl({ network: nextNetwork, page: 1 }));
  }

  function handleSearchSubmit() {
    const query = searchQuery.trim();
    if (!query) return;
    if (searchMode === "exact") {
      startTransition(() => {
        router.push(buildUrl({ name: query, search: null, searchMode: "exact", page: 1 }));
      });
      return;
    }

    window.history.pushState(null, "", buildUrl({ name: null, search: query, searchMode: "contains", page: 1 }));
  }

  function goToAction(action: Action, resolveResult: ResolveName) {
    router.push(nameActionHref(action, resolveResult.query, currentNetwork));
  }

  function handleDetailAction(action: Action) {
    if (!nameDataReady || !nameResult) return;
    const existing = getResumeToReplace({ action, name: nameResult.query, network: currentNetwork });
    if (existing) {
      setPendingReplacement({ action, resolveResult: nameResult, existing });
      return;
    }
    goToAction(action, nameResult);
  }

  function clearNameDetail() {
    setSearchQuery("");
    setSearchMode("contains");
    if (showNameDetail) {
      startTransition(() => {
        router.push(buildUrl({ name: null, search: null, searchMode: null, page: 1 }));
      });
      return;
    }

    window.history.pushState(null, "", buildUrl({ name: null, search: null, searchMode: null, page: 1 }));
  }

  function handleRefresh() {
    if (showNameDetail) {
      startTransition(() => {
        router.refresh();
      });
      return;
    }

    setListRefreshNonce((current) => current + 1);
  }

  function copyUivk() {
    if (!currentListData.stats.uivk) return;
    navigator.clipboard.writeText(currentListData.stats.uivk);
    setUivkCopied(true);
    window.setTimeout(() => setUivkCopied(false), 2000);
  }

  const blockHeightLabel = isPending
    ? "…"
    : currentListData.stats.syncedHeight.toLocaleString();
  const blockPillTitle = `Block ${
    isPending ? "…" : currentListData.stats.syncedHeight.toLocaleString()
  } · Refresh`;

  useLayoutEffect(() => {
    const row = headerRowRef.current;
    if (!row) return;

    function recompute() {
      const containerWidth = headerRowRef.current?.clientWidth ?? 0;
      if (containerWidth <= 0) return;
      const descWidth = headerDescMeasureRef.current?.offsetWidth ?? 0;
      const fullPillsWidth = headerPillsFullMeasureRef.current?.offsetWidth ?? 0;
      const gap = 12; // gap-3
      const fits = descWidth + gap + fullPillsWidth <= containerWidth;
      setCompactHeaderPills((current) => {
        const next = !fits;
        return current === next ? current : next;
      });
    }

    recompute();
    const observer = new ResizeObserver(() => recompute());
    observer.observe(row);
    return () => observer.disconnect();
  }, [blockHeightLabel, currentListData.stats.uivk, isPending]);

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-6">
      <div
        ref={headerRowRef}
        className="relative flex min-w-0 w-full max-w-full flex-nowrap items-center justify-between gap-3 overflow-x-clip"
      >
        {/* Zero-size host so measure chips never expand page scrollWidth on mobile. */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="flex w-max items-center gap-3 opacity-0">
            <span ref={headerDescMeasureRef} className="whitespace-nowrap text-[1.35rem] font-semibold leading-none tracking-tight sm:text-2xl">
              Explorer
            </span>
            <div ref={headerPillsFullMeasureRef} className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] tabular-nums"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                Block {blockHeightLabel}
                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.3-3.56" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M12.5 2v3h-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {currentListData.stats.uivk ? (
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
                  style={{ borderColor: "var(--leaders-card-border)" }}
                >
                  <span>UIVK</span>
                  <KeyIcon />
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <h1
          className="m-0 min-w-0 flex-1 truncate text-[1.35rem] font-semibold leading-none tracking-tight sm:text-2xl"
          style={{ color: "var(--fg-heading)" }}
        >
          Explorer
        </h1>
        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5 sm:gap-2 self-center">
          <button
            type="button"
            onClick={handleRefresh}
            className={
              compactHeaderPills
                ? "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-fg-muted transition-colors hover:text-[var(--color-accent-interactive)]"
                : "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted tabular-nums transition-colors hover:text-[var(--color-accent-interactive)]"
            }
            style={{ borderColor: "var(--leaders-card-border)" }}
            title={blockPillTitle}
            aria-label={blockPillTitle}
          >
            {!compactHeaderPills ? (
              <>
                Block{" "}
                {isPending ? (
                  <span className="inline-block h-[0.75em] w-14 animate-pulse rounded-md bg-fg-dim/20 align-middle" />
                ) : (
                  currentListData.stats.syncedHeight.toLocaleString()
                )}
              </>
            ) : null}
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
          {currentListData.stats.uivk ? (
            <button
              type="button"
              onClick={() => setUivkOpen(true)}
              className={
                compactHeaderPills
                  ? "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-fg-muted transition-colors hover:text-[var(--color-accent-interactive)]"
                  : "inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-[var(--color-accent-interactive)]"
              }
              style={{ borderColor: "var(--leaders-card-border)" }}
              title="Unified incoming view key"
              aria-label="Open UIVK"
            >
              {!compactHeaderPills ? <span>UIVK</span> : null}
              <KeyIcon />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <ExplorerToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={() => {
            setSearchQuery("");
            setSearchMode("contains");
          }}
          network={currentNetwork}
          onNetworkChange={handleNetworkChange}
        />

        {activeSearchQuery ? (
          <SearchResultsSummary
            query={activeSearchQuery}
            matchCount={showActiveSearchMatchCount ? activeSearchMatchCount : null}
            onClear={clearNameDetail}
          />
        ) : null}

        <ExplorerListPane
          initialData={initialListData}
          refreshNonce={listRefreshNonce}
          onDataChange={setCurrentListData}
          onLoadingChange={setIsListRefreshing}
        />
      </div>

      {showNameDetail ? (
        <ExplorerNameDetail
          query={selectedName}
          result={nameDataReady ? nameResult : null}
          events={nameDataReady ? nameEvents : []}
          isPending={isPending && !nameDataReady}
          usdPerZec={usdPerZec}
          onAction={handleDetailAction}
        />
      ) : null}

      {uivkOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-3 sm:items-center sm:p-4"
          style={{
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
            paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setUivkOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="explorer-uivk-title"
            className="my-auto flex w-full min-w-0 max-w-md flex-col gap-4 overflow-y-auto rounded-2xl border px-4 py-5 sm:gap-5 sm:px-8 sm:py-7"
            style={{
              background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
              borderColor: "var(--leaders-card-border)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
              maxHeight: "min(100dvh - 1.5rem, 40rem)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <h2
                id="explorer-uivk-title"
                className="min-w-0 flex-1 font-bold tracking-tight text-balance"
                style={{ fontSize: "var(--type-section-subtitle)", color: "var(--fg-heading)" }}
              >
                Unified incoming view key
              </h2>
              <button
                type="button"
                onClick={() => setUivkOpen(false)}
                className="shrink-0 cursor-pointer text-fg-muted transition-colors hover:text-[var(--color-accent-interactive)]"
                aria-label="Close"
              >
                <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                    {currentNetwork === "mainnet" ? "Mainnet" : "Testnet"}
                  </div>
                  <UivkVerifiedBadge value={currentListData.stats.uivk} verified={currentListData.stats.uivkVerified} />
                </div>
                <CopyIconButton
                  onClick={copyUivk}
                  ariaLabel={`Copy ${currentNetwork} UIVK`}
                  title={uivkCopied ? "Copied!" : `Copy ${currentNetwork} UIVK`}
                  copied={uivkCopied}
                  disabled={!currentListData.stats.uivk}
                />
              </div>
              <p className="min-w-0 break-all font-mono text-xs leading-relaxed text-fg-muted">
                {currentListData.stats.uivk || "Unavailable"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {pendingReplacement ? (
        <ResumeReplacementDialog
          existing={pendingReplacement.existing}
          onCancel={() => setPendingReplacement(null)}
          onContinue={() => {
            clearResume();
            goToAction(pendingReplacement.action, pendingReplacement.resolveResult);
            setPendingReplacement(null);
          }}
        />
      ) : null}
    </div>
  );
}
