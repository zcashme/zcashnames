import { getCurrentRegistrations, getEvents, getListings, getHomeStats, resolveName } from "@/lib/zns/resolve";
import type { Network, Event } from "@/lib/zns/client";
import type { ResolveName } from "@/lib/types";
import ExplorerShell from "./ExplorerShell";
import {
  ACTION_TYPES,
  EXPLORER_PAGE_SIZE,
  getPaginationOffset,
  paginateRows,
  parseExplorerPage,
  parseExplorerTab,
  type ExplorerTab,
} from "./explorerFilters";

type Environment = "all" | "mainnet" | "testnet";

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
        url: "https://www.zcashnames.com/og/explorer.png",
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
    images: ["https://www.zcashnames.com/og/explorer.png"],
  },
};
function parseEnvironment(env: string | undefined): Environment {
  if (env === "all" || env === "mainnet" || env === "testnet") return env;
  return "mainnet";
}

function getNetworks(env: Environment): Network[] {
  if (env === "all") return ["testnet", "mainnet"];
  return [env];
}

function getEventActionFilter(tab: ExplorerTab): Event["action"] | undefined {
  return ACTION_TYPES.includes(tab as typeof ACTION_TYPES[number])
    ? (tab as Event["action"])
    : undefined;
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string; name?: string; tab?: string; page?: string }>;
}) {
  const params = await searchParams;
  const env = parseEnvironment(params.env);
  const tab = parseExplorerTab(params.tab);
  const page = parseExplorerPage(params.page);
  const nameQuery = params.name ?? "";
  const networks = getNetworks(env);
  const effectiveNetwork: Network = env === "all" ? "mainnet" : env;
  const action = getEventActionFilter(tab);
  const shouldClientPaginateEvents = env === "all" || tab === "admin";
  const eventLimit = shouldClientPaginateEvents ? EXPLORER_PAGE_SIZE * page : EXPLORER_PAGE_SIZE;
  const eventOffset = shouldClientPaginateEvents ? 0 : getPaginationOffset(page, EXPLORER_PAGE_SIZE);

  const [eventsResults, listingsResults, registrationsResults, mainnetStats, testnetStats] = await Promise.all([
    Promise.all(
      networks.map((n) =>
        getEvents({ action, limit: eventLimit, offset: eventOffset }, n).then((r) => ({
          events: r.events.map((ev: Event) => ({ ...ev, network: n })),
          total: r.total,
        }))
      )
    ),
    Promise.all(
      networks.map((n) =>
        getListings(n).then((items) => items.map((l) => ({ ...l, network: n })))
      )
    ),
    Promise.all(
      networks.map((n) =>
        getCurrentRegistrations(n).then((items) => items.map((r) => ({ ...r, network: n })))
      )
    ),
    getHomeStats("mainnet"),
    getHomeStats("testnet"),
  ]);
  const stats = effectiveNetwork === "mainnet" ? mainnetStats : testnetStats;
  const uivks = {
    mainnet: mainnetStats.uivk,
    testnet: testnetStats.uivk,
  };

  const eventRows = eventsResults.flatMap((r) => r.events);
  const scopedEvents = tab === "admin" ? eventRows.filter((ev) => ev.name === "") : eventRows;
  const initialEvents = shouldClientPaginateEvents
    ? paginateRows(scopedEvents, page, EXPLORER_PAGE_SIZE)
    : scopedEvents;
  const initialEventsTotal = tab === "admin"
    ? scopedEvents.length
    : eventsResults.reduce((sum, r) => sum + r.total, 0);
  const initialListings = listingsResults.flat();
  const initialRegistrations = registrationsResults.flat();

  let nameResult: ResolveName | null = null;
  let nameEvents: typeof initialEvents = [];
  if (nameQuery) {
    try {
      const [resolved, evResult] = await Promise.all([
        resolveName(nameQuery, effectiveNetwork),
        getEvents({ name: nameQuery, limit: 20 }, effectiveNetwork),
      ]);
      nameResult = resolved;
      nameEvents = evResult.events.map((ev: Event) => ({ ...ev, network: effectiveNetwork }));
    } catch {
      // name resolution failed (invalid name, indexer down, etc.)
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      <ExplorerShell
        initialEvents={initialEvents}
        initialEventsTotal={initialEventsTotal}
        initialListings={initialListings}
        initialRegistrations={initialRegistrations}
        stats={stats}
        uivks={uivks}
        environment={env}
        initialTab={tab}
        initialPage={page}
        nameQuery={nameQuery}
        nameResult={nameResult}
        nameEvents={nameEvents}
      />
    </main>
  );
}


