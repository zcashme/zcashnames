"use client";

import { useEffect, useMemo, useState } from "react";
import { getEvents, getListings } from "@/lib/zns/resolve";
import { zatsToZec } from "@/lib/zns/name";
import type { Network } from "@/lib/zns/name";
import type { ZnsEvent, ZnsListing } from "@/lib/zns/client";
import type { Environment, SortBy } from "./ExplorerToolbar";
import ActionBadge from "@/components/ActionBadge";

export type ExplorerTab = "all" | "registered" | "forsale" | "admin" | "CLAIM" | "BUY" | "LIST" | "DELIST" | "UPDATE" | "RELEASE";

export type TabCounts = Record<string, number>;

const ACTION_TYPES = ["CLAIM", "BUY", "LIST", "DELIST", "UPDATE", "RELEASE"] as const;

function Skeleton({ w = "w-12" }: { w?: string }) {
  return <span className={`inline-block h-[0.85em] ${w} animate-pulse rounded-md bg-fg-dim/20 align-middle`} />;
}

type TaggedEvent = ZnsEvent & { network: Network };
type TaggedListing = ZnsListing & { network: Network };

function getNetworks(env: Environment): Network[] {
  if (env === "all") return ["testnet", "mainnet"];
  return [env];
}

function sortEvents(events: TaggedEvent[], sortBy: SortBy): TaggedEvent[] {
  return [...events].sort((a, b) => {
    if (sortBy === "height") return b.height - a.height;
    if (sortBy === "name") return a.name.localeCompare(b.name) || b.height - a.height;
    return a.action.localeCompare(b.action) || b.height - a.height;
  });
}

function sortListings(listings: TaggedListing[], sortBy: SortBy): TaggedListing[] {
  return [...listings].sort((a, b) => {
    if (sortBy === "height") return b.height - a.height;
    if (sortBy === "name") return a.name.localeCompare(b.name) || b.height - a.height;
    return b.height - a.height;
  });
}

export default function ExplorerContent({
  tab,
  environment,
  sortBy,
  searchQuery,
  onNameClick,
  onCountsChange,
}: {
  tab: ExplorerTab;
  environment: Environment;
  sortBy: SortBy;
  searchQuery: string;
  onNameClick: (name: string) => void;
  onCountsChange: (counts: TabCounts) => void;
}) {
  const [events, setEvents] = useState<TaggedEvent[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [offsets, setOffsets] = useState<Record<Network, number>>({ testnet: 0, mainnet: 0 });

  const [listings, setListings] = useState<TaggedListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const networks = useMemo(() => getNetworks(environment), [environment]);

  // Fetch events
  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    setOffsets({ testnet: 0, mainnet: 0 });

    Promise.all(
      networks.map((n) => getEvents({ limit: 100 }, n).then((r) => ({
        events: r.events.map((ev) => ({ ...ev, network: n })),
        total: r.total,
        network: n,
      })))
    ).then((results) => {
      if (cancelled) return;
      const merged = results.flatMap((r) => r.events);
      const total = results.reduce((sum, r) => sum + r.total, 0);
      setEvents(merged);
      setEventsTotal(total);
      setEventsLoading(false);
    });

    return () => { cancelled = true; };
  }, [environment]);

  // Fetch listings
  useEffect(() => {
    let cancelled = false;
    setListingsLoading(true);

    Promise.all(
      networks.map((n) => getListings(n).then((items) => items.map((l) => ({ ...l, network: n }))))
    ).then((results) => {
      if (cancelled) return;
      setListings(results.flat());
      setListingsLoading(false);
    });

    return () => { cancelled = true; };
  }, [environment]);

  // Report counts
  useEffect(() => {
    if (eventsLoading || listingsLoading) return;
    const counts: TabCounts = {
      all: events.length,
      forsale: listings.length,
      registered: events.filter((ev) => ev.action === "CLAIM").length,
      admin: events.filter((ev) => ev.name === "").length,
    };
    for (const action of ACTION_TYPES) {
      counts[action] = events.filter((ev) => ev.action === action).length;
    }
    onCountsChange(counts);
  }, [eventsLoading, listingsLoading, events, listings]);

  async function loadMoreEvents() {
    const results = await Promise.all(
      networks.map((n) => {
        const newOffset = (offsets[n] || 0) + 100;
        return getEvents({ limit: 100, offset: newOffset }, n).then((r) => ({
          events: r.events.map((ev) => ({ ...ev, network: n })),
          network: n,
          newOffset,
        }));
      })
    );

    const newEvents = results.flatMap((r) => r.events);
    setEvents((prev) => [...prev, ...newEvents]);
    setOffsets((prev) => {
      const next = { ...prev };
      for (const r of results) next[r.network] = r.newOffset;
      return next;
    });
  }

  // Pick events for active tab
  const activeEvents = useMemo(() => {
    if (tab === "all") return events;
    if (tab === "registered") return events.filter((ev) => ev.action === "CLAIM");
    if (tab === "admin") return events.filter((ev) => ev.name === "");
    // Per-action tab
    if (ACTION_TYPES.includes(tab as typeof ACTION_TYPES[number])) {
      return events.filter((ev) => ev.action === tab);
    }
    return events;
  }, [tab, events]);

  // Filter + sort
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q ? activeEvents.filter((ev) => ev.name.toLowerCase().includes(q) || ev.action.toLowerCase().includes(q)) : activeEvents;
    return sortEvents(filtered, sortBy);
  }, [activeEvents, searchQuery, sortBy]);

  const filteredListings = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = q ? listings.filter((l) => l.name.toLowerCase().includes(q)) : listings;
    return sortListings(filtered, sortBy);
  }, [listings, searchQuery, sortBy]);

  const loading = tab === "forsale" ? listingsLoading : eventsLoading;

  // For Sale tab — table
  if (tab === "forsale") {
    return (
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <th className="px-4 py-3 sm:px-6">Name</th>
                <th className="px-4 py-3 text-right sm:px-6">Price</th>
                <th className="px-4 py-3 text-right sm:px-6">Block</th>
                {environment === "all" && <th className="px-4 py-3 text-right sm:px-6">Net</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b last:border-b-0" style={{ borderColor: "var(--leaders-card-border)" }}>
                    <td className="px-4 py-3 sm:px-6"><Skeleton w="w-24" /></td>
                    <td className="px-4 py-3 text-right sm:px-6"><Skeleton w="w-16" /></td>
                    <td className="px-4 py-3 text-right sm:px-6"><Skeleton w="w-14" /></td>
                    {environment === "all" && <td className="px-4 py-3 text-right sm:px-6"><Skeleton w="w-6" /></td>}
                  </tr>
                ))
              ) : filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={environment === "all" ? 4 : 3} className="px-4 py-12 text-center text-fg-muted">
                    No names listed for sale.
                  </td>
                </tr>
              ) : (
                filteredListings.map((l) => (
                  <tr
                    key={`${l.network}:${l.txid}`}
                    className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <button
                        type="button"
                        onClick={() => onNameClick(l.name)}
                        className="font-semibold text-fg-heading hover:underline cursor-pointer"
                      >
                        {l.name}.zcash
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted sm:px-6">
                      {zatsToZec(l.price)} ZEC
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">
                      {l.height.toLocaleString()}
                    </td>
                    {environment === "all" && (
                      <td className="px-4 py-3 text-right sm:px-6">
                        <span className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                          style={{ background: "var(--market-stats-segment-active-bg)" }}
                        >
                          {l.network === "testnet" ? "T" : "M"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Events-based tabs — table
  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              <th className="px-4 py-3 sm:px-6">Action</th>
              <th className="px-4 py-3 sm:px-6">Name</th>
              <th className="hidden sm:table-cell px-4 py-3 sm:px-6">Address</th>
              <th className="px-4 py-3 text-right sm:px-6">Block</th>
              {environment === "all" && <th className="px-4 py-3 text-right sm:px-6">Net</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-b-0" style={{ borderColor: "var(--leaders-card-border)" }}>
                  <td className="px-4 py-3 sm:px-6"><Skeleton w="w-16" /></td>
                  <td className="px-4 py-3 sm:px-6"><Skeleton w="w-24" /></td>
                  <td className="hidden sm:table-cell px-4 py-3 sm:px-6"><Skeleton w="w-28" /></td>
                  <td className="px-4 py-3 text-right sm:px-6"><Skeleton w="w-14" /></td>
                  {environment === "all" && <td className="px-4 py-3 text-right sm:px-6"><Skeleton w="w-6" /></td>}
                </tr>
              ))
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={environment === "all" ? 5 : 4} className="px-4 py-12 text-center text-fg-muted">
                  No events found.
                </td>
              </tr>
            ) : (
              <>
                {filteredEvents.map((ev) => (
                  <tr
                    key={`${ev.network}:${ev.id}`}
                    className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <ActionBadge action={ev.action} />
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      {ev.name ? (
                        <button
                          type="button"
                          onClick={() => onNameClick(ev.name)}
                          className="font-semibold text-fg-heading hover:underline cursor-pointer"
                        >
                          {ev.name}
                        </button>
                      ) : (
                        <span className="text-fg-muted">(admin)</span>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 sm:px-6">
                      {ev.ua ? (
                        <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">
                          {ev.ua}
                        </span>
                      ) : (
                        <span className="text-fg-muted">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">
                      {ev.height.toLocaleString()}
                    </td>
                    {environment === "all" && (
                      <td className="px-4 py-3 text-right sm:px-6">
                        <span className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                          style={{ background: "var(--market-stats-segment-active-bg)" }}
                        >
                          {ev.network === "testnet" ? "T" : "M"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
      {events.length < eventsTotal && !loading && (
        <div className="border-t px-5 py-3" style={{ borderColor: "var(--leaders-card-border)" }}>
          <button
            type="button"
            onClick={loadMoreEvents}
            className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
