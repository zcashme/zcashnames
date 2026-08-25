import { getChainStats } from "@/lib/network-stats";
import type { Listing, Network, Registration, ZnsEvent } from "@/lib/types";
import { getCurrentRegistrations, getEvents, getListings } from "@/lib/zns/resolve";
import { ACTIONS } from "@/lib/types";
import { filterEvents, filterListings, filterRegistrations } from "@/lib/zns/utils";
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
  listings: Listing[];
  events: ZnsEvent[];
  stats: {
    claimed: number;
    forSale: number;
    syncedHeight: number;
    uivk: string;
    uivkVerified: boolean;
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

    if (sortKey === "status") {
      const leftStatus = left.listing ? "listed" : "registered";
      const rightStatus = right.listing ? "listed" : "registered";
      const result = compareStrings(leftStatus, rightStatus, sortDirection);
      return result || compareNumbers(left.height, right.height, "desc");
    }

    return compareNumbers(left.height, right.height, sortDirection) || compareStrings(left.name, right.name, "asc");
  });
}

function sortListings(
  rows: Listing[],
  sortKey: ExplorerSortKey,
  sortDirection: ExplorerSortDirection,
) {
  return [...rows].sort((left, right) => {
    if (sortKey === "name") {
      const result = compareStrings(left.name, right.name, sortDirection);
      return result || compareNumbers(left.height, right.height, "desc");
    }

    if (sortKey === "price") {
      const result = compareNumbers(left.price, right.price, sortDirection);
      return result || compareNumbers(left.height, right.height, "desc");
    }

    if (sortKey === "status") {
      return compareNumbers(left.height, right.height, "desc");
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

    return compareNumbers(left.height, right.height, sortDirection) || compareStrings(left.action, right.action, "asc");
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
  listings: Listing[];
  events: ZnsEvent[];
}): ExplorerTabCounts {
  const { registrations, listings, events } = args;
  const actionCounts = Object.fromEntries(
    ACTIONS.map((action) => [
      action,
      events.filter((row) => row.action === action).length,
    ]),
  ) as Record<(typeof ACTIONS)[number], number>;

  return {
    all: events.length,
    registered: registrations.length,
    forsale: listings.length,
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
  const [stats, allRegistrations, allListingsResult, allEventsResult] = await Promise.all([
    statsPromise,
    getCurrentRegistrations(network),
    getListings(network),
    getAllEvents(network),
  ]);
  const filteredRegistrations = filterRegistrations(allRegistrations, activeSearchQuery);
  const filteredListings = filterListings(allListingsResult.listings, activeSearchQuery);
  const filteredEvents = filterEvents(allEventsResult.events, activeSearchQuery);
  const tabCounts = buildTabCounts({
    registrations: filteredRegistrations,
    listings: filteredListings,
    events: filteredEvents,
  });

  if (tab === "registered") {
    const filtered = filteredRegistrations;
    const sorted = sortRegistrations(filtered, sortKey, sortDirection);
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
      listings: [],
      events: [],
      stats,
    };
  }

  if (tab === "forsale") {
    const filtered = filteredListings;
    const sorted = sortListings(filtered, sortKey, sortDirection);
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
      listings: paginateRows(sorted, page, pageSize),
      events: [],
      stats,
    };
  }

  const action = ACTIONS.includes(tab as (typeof ACTIONS)[number]) ? tab : undefined;
  const filtered = action
    ? filteredEvents.filter((row) => row.action === action)
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
    listings: [],
    events: paginateRows(sorted, page, pageSize),
    stats,
  };
}
