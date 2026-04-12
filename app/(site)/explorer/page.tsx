import { getEvents, getListings, getHomeStats, resolveName } from "@/lib/zns/resolve";
import type { Network } from "@/lib/zns/name";
import type { ResolveName } from "@/lib/types";
import ExplorerShell from "./ExplorerShell";

type Environment = "all" | "mainnet" | "testnet";

export const metadata = {
  title: "Explorer - ZcashNames",
  description: "Browse registered .zcash names, event history, and marketplace listings.",
};

function parseEnvironment(env: string | undefined): Environment {
  if (env === "all" || env === "mainnet" || env === "testnet") return env;
  return "mainnet";
}

function getNetworks(env: Environment): Network[] {
  if (env === "all") return ["testnet", "mainnet"];
  return [env];
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string; name?: string }>;
}) {
  const params = await searchParams;
  const env = parseEnvironment(params.env);
  const nameQuery = params.name ?? "";
  const networks = getNetworks(env);
  const effectiveNetwork: Network = env === "all" ? "mainnet" : env;

  const [eventsResults, listingsResults, mainnetStats, testnetStats] = await Promise.all([
    Promise.all(
      networks.map((n) =>
        getEvents({ limit: 100 }, n).then((r) => ({
          events: r.events.map((ev) => ({ ...ev, network: n })),
          total: r.total,
        }))
      )
    ),
    Promise.all(
      networks.map((n) =>
        getListings(n).then((items) => items.map((l) => ({ ...l, network: n })))
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

  const initialEvents = eventsResults.flatMap((r) => r.events);
  const initialEventsTotal = eventsResults.reduce((sum, r) => sum + r.total, 0);
  const initialListings = listingsResults.flat();

  let nameResult: ResolveName | null = null;
  let nameEvents: typeof initialEvents = [];
  if (nameQuery) {
    try {
      const [resolved, evResult] = await Promise.all([
        resolveName(nameQuery, effectiveNetwork),
        getEvents({ name: nameQuery, limit: 20 }, effectiveNetwork),
      ]);
      nameResult = resolved;
      nameEvents = evResult.events.map((ev) => ({ ...ev, network: effectiveNetwork }));
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
        stats={stats}
        uivks={uivks}
        environment={env}
        nameQuery={nameQuery}
        nameResult={nameResult}
        nameEvents={nameEvents}
      />
    </main>
  );
}
