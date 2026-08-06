"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaginationControls from "@/components/PaginationControls";
import ActionBadge from "@/components/ActionBadge";
import DataViewTabs from "@/components/table/DataViewTabs";
import { TableRowsMenu, TableSortMenu } from "@/components/table/TableIconMenus";
import TableLoadingOverlay from "@/components/table/TableLoadingOverlay";
import useCachedRemoteTableData from "@/components/table/useCachedRemoteTableData";
import { ACTIONS, ACTION_COLORS, ACTION_LABELS } from "@/lib/types";
import { zatsToZec } from "@/lib/zns/utils";
import type { Listing, Network, Registration, ZnsEvent } from "@/lib/types";
import {
  buildExplorerListCacheKey,
  EXPLORER_CACHE_LIMIT,
  getExplorerSortOptions,
  normalizeExplorerSort,
  PAGE_SIZE_OPTIONS,
  parseExplorerNetwork,
  parseExplorerPage,
  parseExplorerPageSize,
  parseExplorerSearchMode,
  parseExplorerTab,
  type ExplorerSearchMode,
  type ExplorerSortDirection,
  type ExplorerSortKey,
  type ExplorerTab,
} from "./listConfig";
import type { ExplorerListData } from "./listData";

const PRIMARY_TABS: { key: ExplorerTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "registered", label: "Registered" },
  { key: "forsale", label: "For Sale" },
];

type ExplorerListPaneProps = {
  initialData: ExplorerListData;
  refreshNonce: number;
  onDataChange: (data: ExplorerListData) => void;
  onLoadingChange?: (isLoading: boolean) => void;
};

export default function ExplorerListPane({
  initialData,
  refreshNonce,
  onDataChange,
  onLoadingChange,
}: ExplorerListPaneProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableShellRef = useRef<HTMLDivElement | null>(null);

  const selectedName = searchParams.get("name");
  const showNameDetail = !!selectedName;
  const tab = parseExplorerTab(searchParams.get("tab") ?? undefined);
  const network = parseExplorerNetwork(searchParams.get("env"));
  const page = parseExplorerPage(searchParams.get("page"));
  const pageSize = parseExplorerPageSize(searchParams.get("pageSize"));
  const searchMode = parseExplorerSearchMode(searchParams.get("searchMode"));
  const searchQuery = searchMode === "contains" ? (searchParams.get("search") ?? "") : "";
  const { sortKey, sortDirection } = normalizeExplorerSort(
    tab,
    searchParams.get("sortKey"),
    searchParams.get("sortDirection"),
  );
  const currentKey = buildExplorerListCacheKey({
    network,
    tab,
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery,
    searchMode,
  });
  const initialKey = buildExplorerListCacheKey({
    network: initialData.network,
    tab: initialData.tab,
    page: initialData.page,
    pageSize: initialData.pageSize,
    sortKey: initialData.sortKey,
    sortDirection: initialData.sortDirection,
    searchQuery: initialData.searchQuery,
    searchMode: initialData.searchMode,
  });

  function buildUrl(args: {
    network?: Network;
    tab?: ExplorerTab;
    page?: number;
    pageSize?: number;
    sortKey?: ExplorerSortKey;
    sortDirection?: ExplorerSortDirection;
    search?: string | null;
    searchMode?: ExplorerSearchMode | null;
    name?: string | null;
  }) {
    const nextNetwork = args.network ?? network;
    const nextTab = args.tab ?? tab;
    const nextPageSize = args.pageSize ?? pageSize;
    const normalizedSort = normalizeExplorerSort(
      nextTab,
      args.sortKey ?? sortKey,
      args.sortDirection ?? sortDirection,
    );
    const nextPage = args.page ?? page;
    const params = new URLSearchParams();

    if (nextNetwork !== "mainnet") params.set("env", nextNetwork);
    if (nextTab !== "all") params.set("tab", nextTab);
    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextPageSize !== 25) params.set("pageSize", String(nextPageSize));

    const defaultSort = normalizeExplorerSort(nextTab, null, null);
    if (
      normalizedSort.sortKey !== defaultSort.sortKey
      || normalizedSort.sortDirection !== defaultSort.sortDirection
    ) {
      params.set("sortKey", normalizedSort.sortKey);
      params.set("sortDirection", normalizedSort.sortDirection);
    }

    const nextSearchMode = args.searchMode === undefined ? searchMode : args.searchMode;
    const nextSearch = args.search === undefined ? searchQuery : args.search;
    const nextName = args.name === undefined ? selectedName : args.name;

    if (nextSearchMode === "contains" && nextSearch?.trim()) {
      params.set("search", nextSearch.trim());
      params.set("searchMode", "contains");
    }

    if (nextSearchMode === "exact" && nextName) {
      params.set("name", nextName);
      params.set("searchMode", "exact");
    }
    return params.toString() ? `/explorer?${params.toString()}` : "/explorer";
  }

  function updateUrl(args: {
    network?: Network;
    tab?: ExplorerTab;
    page?: number;
    pageSize?: number;
    sortKey?: ExplorerSortKey;
    sortDirection?: ExplorerSortDirection;
    name?: string | null;
  }) {
    window.history.pushState(null, "", buildUrl(args));
  }

  const { data, isRefreshing, loadError } = useCachedRemoteTableData({
    initialCacheKey: initialKey,
    initialData,
    queryKey: currentKey,
    cacheLimit: EXPLORER_CACHE_LIMIT,
    enabled: !showNameDetail,
    forceRefreshToken: refreshNonce,
    fetchData: async () => {
      const response = await fetch(
        `/api/explorer?${new URLSearchParams({
          env: network,
          tab,
          page: String(page),
          pageSize: String(pageSize),
          sortKey,
          sortDirection,
          search: searchQuery,
          searchMode,
        }).toString()}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to refresh explorer rows.");
      }

      return (await response.json()) as ExplorerListData;
    },
  });

  const totalPages = Math.max(1, Math.ceil(data.totalCount / pageSize));
  const activeEventsTotal = data.totalCount;
  const activeMoreLabel = PRIMARY_TABS.some((entry) => entry.key === tab)
    ? null
    : ACTION_LABELS[tab as (typeof ACTIONS)[number]];

  function getTabCount(key: ExplorerTab): number | null {
    return data.tabCounts[key] ?? null;
  }

  useEffect(() => {
    onLoadingChange?.(isRefreshing);
  }, [isRefreshing, onLoadingChange]);

  useEffect(() => {
    onDataChange(data);
  }, [data, onDataChange]);

  function getRegistrationStatusBadgeStyle(listing: boolean) {
    if (listing) {
      return {
        background: ACTION_COLORS.LIST.bg,
        color: ACTION_COLORS.LIST.text,
      };
    }

    return {
      background: ACTION_COLORS.CLAIM.bg,
      color: ACTION_COLORS.CLAIM.text,
    };
  }

  function renderEventsTable(rows: ZnsEvent[]) {
    return (
      <table className="w-full text-left text-sm">
        <thead>
          <tr
            className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Block
            </th>
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Action
            </th>
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Name
            </th>
            <th
              className="hidden sm:table-cell px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Address
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                No events found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b last:border-b-0 transition-colors"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <td
                  className="px-4 py-3 tabular-nums text-fg-muted text-xs sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  {row.height.toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  <ActionBadge action={row.action} />
                </td>
                <td
                  className="px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  {row.name ? (
                    <button
                      type="button"
                      onClick={() => {
                        router.push(buildUrl({ name: row.name, searchMode: "exact", search: null, page: 1 }));
                      }}
                      className="font-semibold text-fg-heading hover:underline cursor-pointer"
                    >
                      {row.name}
                    </button>
                  ) : (
                    <span className="text-fg-muted">-</span>
                  )}
                </td>
                <td
                  className="hidden sm:table-cell px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  {row.ua ? (
                    <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">{row.ua}</span>
                  ) : (
                    <span className="text-fg-muted">-</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  function renderRegistrationsTable(rows: Registration[]) {
    return (
      <table className="w-full text-left text-sm">
        <thead>
          <tr
            className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Block
            </th>
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Name
            </th>
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Status
            </th>
            <th
              className="hidden sm:table-cell px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Address
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                No registered names found.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={`${row.name}:${row.txid}`}
                className="border-b last:border-b-0 transition-colors"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <td
                  className="px-4 py-3 tabular-nums text-fg-muted text-xs sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  {row.height.toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      router.push(buildUrl({ name: row.name, searchMode: "exact", search: null, page: 1 }));
                    }}
                    className="font-semibold text-fg-heading hover:underline cursor-pointer"
                  >
                    {row.name}
                  </button>
                </td>
                <td
                  className="px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  <span
                    className="rounded px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                    style={getRegistrationStatusBadgeStyle(!!row.listing)}
                  >
                    {row.listing ? "Listed" : "Registered"}
                  </span>
                </td>
                <td
                  className="hidden sm:table-cell px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">{row.address}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  function renderListingsTable(rows: Listing[]) {
    return (
      <table className="w-full text-left text-sm">
        <thead>
          <tr
            className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
            style={{ borderColor: "var(--leaders-card-border)" }}
          >
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Block
            </th>
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Name
            </th>
            <th
              className="px-4 py-3 text-right sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Price
            </th>
            <th
              className="px-4 py-3 sm:px-6"
              style={{
                background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)",
              }}
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                No names listed for sale.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.txid}
                className="border-b last:border-b-0 transition-colors"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <td
                  className="px-4 py-3 tabular-nums text-fg-muted text-xs sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  {row.height.toLocaleString()}
                </td>
                <td
                  className="px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      router.push(buildUrl({ name: row.name, searchMode: "exact", search: null, page: 1 }));
                    }}
                    className="font-semibold text-fg-heading hover:underline cursor-pointer"
                  >
                    {row.name}
                  </button>
                </td>
                <td
                  className="px-4 py-3 text-right tabular-nums text-fg-muted sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  {zatsToZec(row.price)} ZEC
                </td>
                <td
                  className="px-4 py-3 sm:px-6"
                  style={{ borderRight: "1px solid color-mix(in srgb, var(--leaders-card-border) 78%, transparent)" }}
                >
                  <span
                    className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                    style={{ background: "var(--market-stats-segment-active-bg)" }}
                  >
                    Active
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className={showNameDetail ? "hidden space-y-4" : "space-y-4"}>
        <DataViewTabs
          borderColor="var(--leaders-card-border)"
          tabs={PRIMARY_TABS.map((entry) => {
            const count = getTabCount(entry.key);
            return {
              key: entry.key,
              label: count != null ? `${entry.label} (${count})` : entry.label,
              active: tab === entry.key,
              onClick: () => {
                updateUrl({ tab: entry.key, page: 1, name: null });
              },
            };
          })}
          overflow={{
            label: "More",
            activeLabel: activeMoreLabel,
            menuBackground: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
            items: ACTIONS.map((actionKey) => ({
              key: actionKey,
              label: ACTION_LABELS[actionKey],
              active: tab === actionKey,
              meta: getTabCount(actionKey) != null ? `(${getTabCount(actionKey)})` : undefined,
              onClick: () => {
                updateUrl({ tab: actionKey, page: 1, name: null });
              },
            })),
          }}
          endContent={
            <>
              <TableSortMenu
                value={`${sortKey}:${sortDirection}`}
                options={getExplorerSortOptions(tab).map((option) => ({
                  key: `${option.sortKey}:${option.sortDirection}`,
                  label: option.label,
                }))}
                onChange={(next) => {
                  const [nextKey, nextDirection] = next.split(":") as [
                    ExplorerSortKey,
                    ExplorerSortDirection,
                  ];
                  updateUrl({
                    page: 1,
                    sortKey: nextKey,
                    sortDirection: nextDirection,
                  });
                }}
                borderColor="var(--leaders-card-border)"
                menuBackground="var(--color-raised)"
                selectedSuffix={
                  <span className="text-xs font-semibold uppercase tracking-[0.08em]">Active</span>
                }
              />
              <TableRowsMenu
                value={pageSize}
                options={PAGE_SIZE_OPTIONS}
                onChange={(nextPageSize) => {
                  updateUrl({
                    page: 1,
                    pageSize: nextPageSize,
                  });
                }}
                borderColor="var(--leaders-card-border)"
              />
            </>
          }
        />

        <div
          ref={tableShellRef}
          className="relative overflow-hidden rounded-2xl border"
          style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
        >
          <div className="overflow-x-auto">
            {tab === "registered"
              ? renderRegistrationsTable(data.registrations)
              : tab === "forsale"
                ? renderListingsTable(data.listings)
                : renderEventsTable(data.events)}
          </div>

          {loadError ? (
            <div className="border-t px-4 py-3 text-sm sm:px-6" style={{ borderColor: "var(--leaders-card-border)", color: "var(--accent-red, #e05252)" }}>
              {loadError}
            </div>
          ) : null}

          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={(nextPage) => {
              updateUrl({ page: nextPage });
            }}
            disabled={isRefreshing}
            className="border-t"
            style={{ borderColor: "var(--leaders-card-border)" }}
            testId="explorer-pagination"
          />

          <TableLoadingOverlay
            active={isRefreshing}
            anchorElement={tableShellRef.current}
            label="Loading explorer..."
          />
        </div>
      </div>
    </>
  );
}
