/**
 * Explorer filter utilities — pure functions shared between page.tsx (server)
 * and ExplorerView.tsx. ExplorerTab is the union of primary tabs ("all",
 * "registered", "forsale", "admin") plus ZNS action types ("CLAIM", "BUY",
 * "LIST", …).
 */
import type { Network, Registration, ZnsEvent, Action } from "@/lib/types";
import { ACTIONS } from "@/lib/types";
import { validateAddress } from "@/lib/zns/utils";

export type ExplorerTab = "all" | "registered" | "forsale" | "admin" | Action;

export const EXPLORER_PAGE_SIZE = 25;

const ALL_TABS: ExplorerTab[] = ["all", "registered", "forsale", "admin", ...ACTIONS];

export function parseExplorerTab(tab: string | undefined): ExplorerTab {
  if (!tab) return "all";
  return ALL_TABS.includes(tab as ExplorerTab) ? (tab as ExplorerTab) : "all";
}

export function parseNetwork(env: string | undefined): Network {
  return env === "testnet" ? "testnet" : "mainnet";
}

export function parseExplorerPage(page: string | undefined): number {
  const value = Number.parseInt(page ?? "", 10);
  if (!Number.isFinite(value) || value < 1) return 1;
  return value;
}

export function normalizeExplorerQuery(searchQuery: string): string {
  return searchQuery.toLowerCase().trim();
}

export function getTabEvents(tab: ExplorerTab, events: ZnsEvent[]): ZnsEvent[] {
  if (tab === "all") return events;
  if (tab === "admin") return events.filter((ev) => ev.name === "");
  if ((ACTIONS as readonly string[]).includes(tab)) {
    return events.filter((ev) => ev.action === tab);
  }
  return events;
}

export function filterRegistrations(registrations: Registration[], searchQuery: string): Registration[] {
  const q = normalizeExplorerQuery(searchQuery);
  if (!q) return registrations;
  const isUAddress = validateAddress(q).status === "unified";
  return registrations.filter((registration) =>
    registration.name.toLowerCase().includes(q) ||
    (!isUAddress && registration.address.toLowerCase().includes(q)) ||
    (isUAddress && registration.address.toLowerCase() === q)
  );
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
