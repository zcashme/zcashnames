/**
 * Explorer filter utilities — pure functions shared between page.tsx (server),
 * ExplorerShell.tsx, and ExplorerContent.tsx.
 *
 * Types:  ExplorerTab is the union of primary tabs ("all", "registered", "forsale",
 *         "admin") plus ZNS action types ("CLAIM", "BUY", "LIST", …).
 *         TaggedEvent/Listing/Registration extend their base types with a `network`
 *         field so "all" mode can merge mainnet+testnet rows.
 *
 * Primary exports: tab parsing, pagination helpers, search filtering, event scoping.
 */
import type { Network, Listing, Registration, ZnsEvent } from "@/lib/types";
import { validateAddress } from "@/lib/zns/utils";

export type ExplorerTab = "all" | "registered" | "forsale" | "admin" | "CLAIM" | "BUY" | "LIST" | "DELIST" | "UPDATE" | "RELEASE";
export type TabCounts = Record<string, { filtered: number; total: number }>;
export type TaggedEvent = ZnsEvent & { network: Network };
export type TaggedListing = Listing & { network: Network };
export type TaggedRegistration = Registration & { network: Network };

export const ACTION_TYPES = ["CLAIM", "BUY", "LIST", "DELIST", "UPDATE", "RELEASE"] as const;
export const EXPLORER_PAGE_SIZE = 25;

const ALL_TABS: ExplorerTab[] = ["all", "registered", "forsale", "admin", ...ACTION_TYPES];

export function parseExplorerTab(tab: string | undefined): ExplorerTab {
  if (!tab) return "all";
  return ALL_TABS.includes(tab as ExplorerTab) ? (tab as ExplorerTab) : "all";
}

export function parseExplorerPage(page: string | undefined): number {
  const value = Number.parseInt(page ?? "", 10);
  if (!Number.isFinite(value) || value < 1) return 1;
  return value;
}

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
  const isUAddress = validateAddress(q).status === "unified";
  return registrations.filter((registration) =>
    registration.name.toLowerCase().includes(q) ||
    (!isUAddress && registration.address.toLowerCase().includes(q)) ||
    (isUAddress && registration.address.toLowerCase() === q)
  );
}

export function getTabCountLabel(count: { filtered: number; total: number }, hasSearchFilter: boolean): string {
  return hasSearchFilter ? `${count.filtered}/${count.total}` : `${count.total}`;
}

export function getPaginationOffset(page: number, pageSize: number = EXPLORER_PAGE_SIZE): number {
  return Math.max(0, (Math.max(1, page) - 1) * pageSize);
}

export function getTotalPages(totalItems: number, pageSize: number = EXPLORER_PAGE_SIZE): number {
  const safeTotal = Math.max(0, totalItems);
  const safePageSize = Math.max(1, pageSize);
  return Math.max(1, Math.ceil(safeTotal / safePageSize));
}

export function clampPage(page: number, totalItems: number, pageSize: number = EXPLORER_PAGE_SIZE): number {
  const totalPages = getTotalPages(totalItems, pageSize);
  return Math.min(Math.max(1, page), totalPages);
}

export function paginateRows<T>(rows: T[], page: number, pageSize: number = EXPLORER_PAGE_SIZE): T[] {
  const safePage = clampPage(page, rows.length, pageSize);
  const offset = getPaginationOffset(safePage, pageSize);
  return rows.slice(offset, offset + pageSize);
}
