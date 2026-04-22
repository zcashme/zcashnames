import type { Network, Event, Registration, Listing } from "@/lib/zns/client";

export type ExplorerTab = "all" | "registered" | "forsale" | "admin" | "CLAIM" | "BUY" | "LIST" | "DELIST" | "UPDATE" | "RELEASE";
export type TabCounts = Record<string, { filtered: number; total: number }>;
export type TaggedEvent = Event & { network: Network };
export type TaggedListing = Listing & { network: Network };
export type TaggedRegistration = Registration & { network: Network };

export const ACTION_TYPES = ["CLAIM", "BUY", "LIST", "DELIST", "UPDATE", "RELEASE"] as const;

export function normalizeExplorerQuery(searchQuery: string): string {
  return searchQuery.toLowerCase().trim();
}

export function getTabEvents(tab: ExplorerTab, events: TaggedEvent[]): TaggedEvent[] {
  if (tab === "all") return events;
  if (tab === "admin") return events.filter((ev) => ev.name === "");
  if (ACTION_TYPES.includes(tab as typeof ACTION_TYPES[number])) {
    return events.filter((ev) => ev.action === tab);
  }
  return events;
}

export function filterEvents(events: TaggedEvent[], searchQuery: string): TaggedEvent[] {
  const q = normalizeExplorerQuery(searchQuery);
  if (!q) return events;
  return events.filter((ev) =>
    ev.name.toLowerCase().includes(q) ||
    ev.action.toLowerCase().includes(q)
  );
}

export function filterListings(listings: TaggedListing[], searchQuery: string): TaggedListing[] {
  const q = normalizeExplorerQuery(searchQuery);
  if (!q) return listings;
  return listings.filter((listing) => listing.name.toLowerCase().includes(q));
}

export function filterRegistrations(registrations: TaggedRegistration[], searchQuery: string): TaggedRegistration[] {
  const q = normalizeExplorerQuery(searchQuery);
  if (!q) return registrations;
  return registrations.filter((registration) =>
    registration.name.toLowerCase().includes(q) ||
    registration.address.toLowerCase().includes(q)
  );
}

export function getTabCountLabel(count: { filtered: number; total: number }, hasSearchFilter: boolean): string {
  return hasSearchFilter ? `${count.filtered}/${count.total}` : `${count.total}`;
}
