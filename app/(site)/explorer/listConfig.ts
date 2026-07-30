import type { Action, Network } from "@/lib/types";
import { ACTIONS } from "@/lib/types";

export type ExplorerTab = "all" | "registered" | "forsale" | Action;
export type ExplorerSortKey = "action" | "name" | "status" | "price" | "block";
export type ExplorerSortDirection = "asc" | "desc";
export type ExplorerSearchMode = "contains" | "exact";

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const EXPLORER_CACHE_LIMIT = 25;

const ALL_TABS: ExplorerTab[] = ["all", "registered", "forsale", ...ACTIONS];

export function parseExplorerTab(tab: string | undefined): ExplorerTab {
  if (!tab) return "all";
  return ALL_TABS.includes(tab as ExplorerTab) ? (tab as ExplorerTab) : "all";
}

export function parseExplorerNetwork(env: string | null | undefined): Network {
  return env === "testnet" ? "testnet" : "mainnet";
}

export function parseExplorerPage(page: string | null | undefined): number {
  const value = Number.parseInt(page ?? "", 10);
  return Number.isFinite(value) && value >= 1 ? value : 1;
}

export function parseExplorerPageSize(pageSize: string | null | undefined): number {
  const value = Number.parseInt(pageSize ?? "", 10);
  return PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number]) ? value : DEFAULT_PAGE_SIZE;
}

export function parseExplorerSortDirection(
  direction: string | null | undefined,
): ExplorerSortDirection | null {
  if (direction === "asc" || direction === "desc") return direction;
  return null;
}

export function parseExplorerSearchMode(
  searchMode: string | null | undefined,
): ExplorerSearchMode {
  return searchMode === "exact" ? "exact" : "contains";
}

export function getDefaultExplorerSort(tab: ExplorerTab): {
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
} {
  if (tab === "registered" || tab === "forsale") {
    return { sortKey: "block", sortDirection: "desc" };
  }
  return { sortKey: "block", sortDirection: "desc" };
}

export function getExplorerSortOptions(tab: ExplorerTab): Array<{
  key: string;
  label: string;
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
}> {
  if (tab === "registered") {
    return [
      { key: "block-desc", label: "Block (newest first)", sortKey: "block", sortDirection: "desc" },
      { key: "block-asc", label: "Block (oldest first)", sortKey: "block", sortDirection: "asc" },
      { key: "name-asc", label: "Name (A-Z)", sortKey: "name", sortDirection: "asc" },
      { key: "name-desc", label: "Name (Z-A)", sortKey: "name", sortDirection: "desc" },
      { key: "status-asc", label: "Status (A-Z)", sortKey: "status", sortDirection: "asc" },
      { key: "status-desc", label: "Status (Z-A)", sortKey: "status", sortDirection: "desc" },
    ];
  }

  if (tab === "forsale") {
    return [
      { key: "block-desc", label: "Block (newest first)", sortKey: "block", sortDirection: "desc" },
      { key: "block-asc", label: "Block (oldest first)", sortKey: "block", sortDirection: "asc" },
      { key: "name-asc", label: "Name (A-Z)", sortKey: "name", sortDirection: "asc" },
      { key: "name-desc", label: "Name (Z-A)", sortKey: "name", sortDirection: "desc" },
      { key: "price-desc", label: "Price (high to low)", sortKey: "price", sortDirection: "desc" },
      { key: "price-asc", label: "Price (low to high)", sortKey: "price", sortDirection: "asc" },
      { key: "status-asc", label: "Status (A-Z)", sortKey: "status", sortDirection: "asc" },
      { key: "status-desc", label: "Status (Z-A)", sortKey: "status", sortDirection: "desc" },
    ];
  }

  return [
    { key: "block-desc", label: "Block (newest first)", sortKey: "block", sortDirection: "desc" },
    { key: "block-asc", label: "Block (oldest first)", sortKey: "block", sortDirection: "asc" },
    { key: "name-asc", label: "Name (A-Z)", sortKey: "name", sortDirection: "asc" },
    { key: "name-desc", label: "Name (Z-A)", sortKey: "name", sortDirection: "desc" },
    { key: "action-asc", label: "Action (A-Z)", sortKey: "action", sortDirection: "asc" },
    { key: "action-desc", label: "Action (Z-A)", sortKey: "action", sortDirection: "desc" },
  ];
}

export function normalizeExplorerSort(
  tab: ExplorerTab,
  sortKey: string | null | undefined,
  sortDirection: string | null | undefined,
): {
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
} {
  const options = getExplorerSortOptions(tab);
  const parsedDirection = parseExplorerSortDirection(sortDirection);
  const matched = options.find(
    (option) => option.sortKey === sortKey && option.sortDirection === parsedDirection,
  );

  if (matched) {
    return {
      sortKey: matched.sortKey,
      sortDirection: matched.sortDirection,
    };
  }

  return getDefaultExplorerSort(tab);
}

export function buildExplorerListCacheKey(args: {
  network: Network;
  tab: ExplorerTab;
  page: number;
  pageSize: number;
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
  searchQuery: string;
  searchMode: ExplorerSearchMode;
}): string {
  return JSON.stringify({
    ...args,
    searchQuery: args.searchQuery.trim().toLowerCase(),
  });
}
