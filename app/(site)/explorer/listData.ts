import { getChainStats } from "@/lib/network-stats";
import { getMintConfig } from "@/lib/zns/mint-config";
import type { Network, Registration, ZnsEvent } from "@/lib/types";
import { getCurrentRegistrations, getEvents } from "@/lib/zns/resolve";
import { ACTIONS, ACTION_VERB } from "@/lib/types";
import { filterEvents, filterRegistrations } from "@/lib/zns/utils";
import type {
  ExplorerSearchMode,
  ExplorerSortDirection,
  ExplorerSortKey,
  ExplorerTab,
} from "./listConfig";

type ExplorerTabCounts = Record<ExplorerTab, number>;

export type ExplorerListData = {
  network: Network;
  tab: ExplorerTab;
  page: number;
  pageSize: number;
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
  searchQuery: string;
  searchMode: ExplorerSearchMode;
  totalCount: number;
  allEventsCount: number;
  tabCounts: ExplorerTabCounts;
  registrations: Registration[];
  events: ZnsEvent[];
  stats: {
    online: boolean;
    claimed: number;
    syncedHeight: number;
    synced: boolean;
    /** The Mint registry UFVK baked into this deployment (null for offline networks). */
    registryUfvk: string | null;
  };
};

function compareStrings(a: string, b: string, direction: ExplorerSortDirection) {
  const result = a.localeCompare(b);
  return direction === "asc" ? result : -result;
}

function compareNumbers(a: number, b: number, direction: ExplorerSortDirection) {
  return direction === "asc" ? a - b : b - a;
}

function sortRegistrations(
  rows: Registration[],
  sortKey: ExplorerSortKey,
  sortDirection: ExplorerSortDirection,
) {
  return [...rows].sort((left, right) => {
    if (sortKey === "name") {
      const result = compareStrings(left.name, right.name, sortDirection);
      return result || compareNumbers(left.height, right.height, "desc");
    }

    return compareNumbers(left.height, right.height, sortDirection) || compareStrings(left.name, right.name, "asc");
  });
}

function sortEvents(
  rows: ZnsEvent[],
  sortKey: ExplorerSortKey,
  sortDirection: ExplorerSortDirection,
) {
  return [...rows].sort((left, right) => {
    if (sortKey === "action") {
      const result = compareStrings(left.action, right.action, sortDirection);
      return result || compareNumbers(left.height, right.height, "desc");
    }

    if (sortKey === "name") {
      const result = compareStrings(left.name ?? "", right.name ?? "", sortDirection);
      return result || compareNumbers(left.height, right.height, "desc");
    }

    // Default: canonical order (height asc, then action index) reads like a
    // ledger — but newest-first is the explorer convention, so flip height.
    return (
      compareNumbers(left.height, right.height, sortDirection) ||
      compareNumbers(left.actionIndex, right.actionIndex, sortDirection)
    );
  });
}

function paginateRows<T>(rows: T[], page: number, pageSize: number) {
  const offset = (page - 1) * pageSize;
  return rows.slice(offset, offset + pageSize);
}

function normalizeSearchQuery(searchQuery: string) {
  return searchQuery.trim();
}

const EVENTS_BATCH_SIZE = 500;

async function getAllEvents(network: Network) {
  const firstPage = await getEvents({ limit: EVENTS_BATCH_SIZE, offset: 0 }, network);
  const total = firstPage.total ?? firstPage.events.length;

  if (firstPage.events.length >= total) {
    return firstPage;
  }

  const pages = await Promise.all(
    Array.from(
      { length: Math.ceil(total / EVENTS_BATCH_SIZE) - 1 },
      (_, index) => getEvents(
        {
          limit: EVENTS_BATCH_SIZE,
          offset: (index + 1) * EVENTS_BATCH_SIZE,
        },
        network,
      ),
    ),
  );

  return {
    total,
    events: [...firstPage.events, ...pages.flatMap((page) => page.events)],
  };
}

function buildTabCounts(args: {
  registrations: Registration[];
  events: ZnsEvent[];
}): ExplorerTabCounts {
  const { registrations, events } = args;
  const actionCounts = Object.fromEntries(
    ACTIONS.map((action) => [
      action,
      events.filter((row) => row.action === ACTION_VERB[action]).length,
    ]),
  ) as Record<(typeof ACTIONS)[number], number>;

  return {
    all: events.length,
    registered: registrations.length,
    ...actionCounts,
  };
}

export async function getExplorerListData(args: {
  network: Network;
  tab: ExplorerTab;
  page: number;
  pageSize: number;
  sortKey: ExplorerSortKey;
  sortDirection: ExplorerSortDirection;
  searchQuery?: string;
  searchMode?: ExplorerSearchMode;
}): Promise<ExplorerListData> {
  const {
    network,
    tab,
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery = "",
    searchMode = "contains",
  } = args;
  const statsPromise = getChainStats(network);
  const activeSearchQuery = searchMode === "contains" ? normalizeSearchQuery(searchQuery) : "";
  const [stats, allRegistrations, allEventsResult] = await Promise.all([
    statsPromise,
    getCurrentRegistrations(network),
    getAllEvents(network),
  ]);
  const filteredRegistrations = filterRegistrations(allRegistrations, activeSearchQuery);
  const filteredEvents = filterEvents(allEventsResult.events, activeSearchQuery);
  const tabCounts = buildTabCounts({
    registrations: filteredRegistrations,
    events: filteredEvents,
  });

  if (tab === "registered") {
    const sorted = sortRegistrations(filteredRegistrations, sortKey, sortDirection);
    return {
      network,
      tab,
      page,
      pageSize,
      sortKey,
      sortDirection,
      searchQuery: activeSearchQuery,
      searchMode,
      totalCount: sorted.length,
      allEventsCount: allEventsResult.total,
      tabCounts,
      registrations: paginateRows(sorted, page, pageSize),
      events: [],
      stats,
    };
  }

  const action = ACTIONS.includes(tab as (typeof ACTIONS)[number]) ? tab : undefined;
  const filtered = action
    ? filteredEvents.filter(
        (row) => action !== undefined && row.action === ACTION_VERB[action as keyof typeof ACTION_VERB],
      )
    : filteredEvents;
  const sorted = sortEvents(filtered, sortKey, sortDirection);
  return {
    network,
    tab,
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery: activeSearchQuery,
    searchMode,
    totalCount: sorted.length,
    allEventsCount: allEventsResult.total,
    tabCounts,
    registrations: [],
    events: paginateRows(sorted, page, pageSize),
    stats,
  };
}
