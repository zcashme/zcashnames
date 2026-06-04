/**
 * Server-side collections page — the single data-fetching entry point.
 *
 * Names you're collecting live in the URL (?names=alice,bob,u1...) so a
 * collection is a shareable link, resolved server-side into co-owned clusters.
 * ?focus= picks which name's full detail panel to render (defaults to the first
 * resolved name); the same ExplorerNameDetail the explorer uses is reused here.
 *
 * Network is inherited from the shared stage cookie (set on the home page).
 */
import { readCurrentStage } from "@/lib/beta/gate";
import { buildCollection } from "@/lib/zns/collection";
import { resolveName, getEvents } from "@/lib/zns/resolve";
import type { Network, ResolveName, ZnsEvent } from "@/lib/types";
import { decodeNames } from "./codec";
import CollectionsView from "./CollectionsView";

export const metadata = {
  title: "Collections - ZcashNames",
  description: "Track the names you own and the names you're watching — no account required.",
  alternates: {
    canonical: "https://www.zcashnames.com/collections",
  },
  openGraph: {
    title: "Collections | ZcashNames",
    description: "Track the names you own and the names you're watching — no account required.",
    url: "https://www.zcashnames.com/collections",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "ZcashNames collections" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Collections | ZcashNames",
    description: "Track the names you own and the names you're watching — no account required.",
    images: ["/og/home.png"],
  },
};

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; focus?: string }>;
}) {
  const params = await searchParams;
  const network: Network = (await readCurrentStage()) ?? "mainnet";
  // The collection rides in one base64url ?c= token. Cap keeps a pasted URL
  // from fanning out unbounded.
  const names = decodeNames(params.c).slice(0, 50);

  const collection = names.length > 0
    ? await buildCollection(names, network)
    : { seeds: [], clusters: [] };

  // Pick the focused name: the ?focus= value if it's actually in the collection,
  // else the first resolved name we can find. Its full detail panel is resolved
  // exactly like the explorer does, so we reuse ExplorerNameDetail downstream.
  const allNames = collection.clusters.flatMap((c) => c.names.map((n) => n.name));
  const focused =
    (params.focus && allNames.includes(params.focus) ? params.focus : null) ??
    collection.seeds.find((s) => s.kind === "name" && s.status === "found")?.seed ??
    allNames[0] ??
    null;

  let nameResult: ResolveName | null = null;
  let nameEvents: ZnsEvent[] = [];
  if (focused) {
    try {
      const [resolved, ev] = await Promise.all([
        resolveName(focused, network),
        getEvents({ name: focused, limit: 20 }, network),
      ]);
      nameResult = resolved;
      nameEvents = ev.events;
    } catch {
      /* indexer hiccup — fall back to clusters only */
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-4 sm:px-6">
      <CollectionsView
        network={network}
        collection={collection}
        focused={focused}
        nameResult={nameResult}
        nameEvents={nameEvents}
      />
    </main>
  );
}
