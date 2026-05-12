/**
 * Server-side explorer page — the single data-fetching entry point.
 * Fires 5 parallel fetches (events, listings, registrations, mainnet stats, testnet stats)
 * for the selected ?env (mainnet | testnet). Also resolves a name when ?name is set.
 * All results are passed as props to ExplorerShell for client-side interactivity.
 */
import { getCurrentRegistrations, getEvents, getListings, resolveName } from "@/lib/zns/resolve";
import { getChainStats } from "@/lib/network-stats";
import type { Action } from "@/lib/types";
import { ACTIONS } from "@/lib/types";
import type { ResolveName } from "@/lib/types";
import ExplorerShell from "./ExplorerShell";
import {
  EXPLORER_PAGE_SIZE,
  getPaginationOffset,
  paginateRows,
  parseNetwork,
  parseExplorerPage,
  parseExplorerTab,
  type ExplorerTab,
} from "./explorerFilters";

export const metadata = {
  title: "Explorer - ZcashNames",
  description: "Browse registered names, event history, and marketplace listings.",
  alternates: {
    canonical: "https://www.zcashnames.com/explorer",
  },
  openGraph: {
    title: "Name Explorer | ZcashNames",
    description: "Browse registered names, event history, and marketplace listings.",
    url: "https://www.zcashnames.com/explorer",
    images: [
      {
        url: "/og/explorer.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames explorer preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Name Explorer | ZcashNames",
    description: "Browse registered names, event history, and marketplace listings.",
    images: ["/og/explorer.png"],
  },
};

function getEventActionFilter(tab: ExplorerTab): Action | undefined {
  return (ACTIONS as readonly string[]).includes(tab) ? (tab as Action) : undefined;
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string; name?: string; tab?: string; page?: string }>;
}) {
  const params = await searchParams;
  const network = parseNetwork(params.env);
  const tab = parseExplorerTab(params.tab);
  const page = parseExplorerPage(params.page);
  const nameQuery = params.name ?? "";
  const action = getEventActionFilter(tab);

  // Admin tab filters events client-side (name === ""), so overscan from the server.
  const clientPaginateEvents = tab === "admin";
  const eventLimit = clientPaginateEvents ? EXPLORER_PAGE_SIZE * page : EXPLORER_PAGE_SIZE;
  const eventOffset = clientPaginateEvents ? 0 : getPaginationOffset(page, EXPLORER_PAGE_SIZE);

  const [eventsResult, listings, registrations, mainnetStats, testnetStats] = await Promise.all([
    getEvents({ action, limit: eventLimit, offset: eventOffset }, network),
    getListings(network),
    getCurrentRegistrations(network),
    getChainStats("mainnet"),
    getChainStats("testnet"),
  ]);
  const stats = network === "mainnet" ? mainnetStats : testnetStats;
  const uivks = {
    mainnet: mainnetStats.uivk,
    testnet: testnetStats.uivk,
  };

  const scopedEvents = tab === "admin"
    ? eventsResult.events.filter((ev) => ev.name === "")
    : eventsResult.events;
  const initialEvents = clientPaginateEvents
    ? paginateRows(scopedEvents, page, EXPLORER_PAGE_SIZE)
    : scopedEvents;
  const initialEventsTotal = tab === "admin" ? scopedEvents.length : eventsResult.total;

  let nameResult: ResolveName | null = null;
  let nameEvents: typeof initialEvents = [];
  if (nameQuery) {
    try {
      const [resolved, evResult] = await Promise.all([
        resolveName(nameQuery, network),
        getEvents({ name: nameQuery, limit: 20 }, network),
      ]);
      nameResult = resolved;
      nameEvents = evResult.events;
    } catch {
      // name resolution failed (invalid name, indexer down, etc.)
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      <ExplorerShell
        initialEvents={initialEvents}
        initialEventsTotal={initialEventsTotal}
        initialListings={listings}
        initialRegistrations={registrations}
        stats={stats}
        uivks={uivks}
        network={network}
        nameQuery={nameQuery}
        nameResult={nameResult}
        nameEvents={nameEvents}
      />
    </main>
  );
}
