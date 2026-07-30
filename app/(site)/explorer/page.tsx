/**
 * Server-side explorer page — the single data-fetching entry point.
 * Resolves the initial list state plus optional name-detail data from URL params.
 */
import { getEvents, resolveName } from "@/lib/zns/resolve";
import type { Network } from "@/lib/types";
import type { ResolveName } from "@/lib/types";
import ExplorerView from "./ExplorerView";
import {
  normalizeExplorerSort,
  parseExplorerNetwork,
  parseExplorerPage,
  parseExplorerPageSize,
  parseExplorerSearchMode,
  parseExplorerTab,
} from "./listConfig";
import { getExplorerListData } from "./listData";

export const metadata = {
  title: "Explorer - Zcash Names",
  description: "Browse registered names, event history, and marketplace listings.",
  alternates: {
    canonical: "https://www.zcashnames.com/explorer",
  },
  openGraph: {
    title: "Name Explorer | Zcash Names",
    description: "Browse registered names, event history, and marketplace listings.",
    url: "https://www.zcashnames.com/explorer",
    images: [
      {
        url: "/og/explorer.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names explorer preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Name Explorer | Zcash Names",
    description: "Browse registered names, event history, and marketplace listings.",
    images: ["/og/explorer.png"],
  },
};

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{
    env?: string;
    name?: string;
    tab?: string;
    page?: string;
    pageSize?: string;
    sortKey?: string;
    sortDirection?: string;
    search?: string;
    searchMode?: string;
  }>;
}) {
  const params = await searchParams;
  const network: Network = parseExplorerNetwork(params.env);
  const tab = parseExplorerTab(params.tab);
  const page = parseExplorerPage(params.page);
  const pageSize = parseExplorerPageSize(params.pageSize);
  const searchMode = parseExplorerSearchMode(params.searchMode);
  const searchQuery = searchMode === "contains" ? params.search ?? "" : "";
  const { sortKey, sortDirection } = normalizeExplorerSort(tab, params.sortKey, params.sortDirection);
  const nameQuery = params.name ?? "";

  const initialListData = await getExplorerListData({
    network,
    tab,
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery,
    searchMode,
  });

  let nameResult: ResolveName | null = null;
  let nameEvents: typeof initialListData.events = [];
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
      <ExplorerView
        initialListData={initialListData}
        nameQuery={nameQuery}
        nameResult={nameResult}
        nameEvents={nameEvents}
      />
    </main>
  );
}
