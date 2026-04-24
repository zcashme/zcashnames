"use client";

import { useEffect, useMemo } from "react";
import { zatsToZec } from "@/lib/zns/client";
import type { Network } from "@/lib/zns/client";
import type { Environment, SortBy } from "./ExplorerToolbar";
import {
  clampPage,
  filterEvents,
  filterListings,
  filterRegistrations,
  getTabEvents,
  getTotalPages,
  normalizeExplorerQuery,
  paginateRows,
  type ExplorerTab,
  type TaggedEvent,
  type TaggedListing,
  type TaggedRegistration,
} from "./explorerFilters";
import ActionBadge from "@/components/ActionBadge";

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

function sortRegistrations(registrations: TaggedRegistration[], sortBy: SortBy): TaggedRegistration[] {
  return [...registrations].sort((a, b) => {
    if (sortBy === "height") return b.height - a.height || a.name.localeCompare(b.name);
    if (sortBy === "name") return a.name.localeCompare(b.name) || b.height - a.height;
    const aStatus = a.listing ? "listed" : "registered";
    const bStatus = b.listing ? "listed" : "registered";
    return aStatus.localeCompare(bStatus) || b.height - a.height || a.name.localeCompare(b.name);
  });
}

function PaginationControls({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= 0) return null;
  const totalPages = getTotalPages(totalItems, pageSize);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div
      className="border-t px-5 py-3 flex items-center justify-between gap-3"
      style={{ borderColor: "var(--leaders-card-border)" }}
      data-testid="explorer-pagination"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoPrev}
        className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="text-[0.76rem] font-semibold uppercase tracking-[0.08em] text-fg-muted tabular-nums">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoNext}
        className="cursor-pointer text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-fg-muted transition-colors hover:text-fg-heading disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

export default function ExplorerContent({
  tab,
  environment,
  sortBy,
  searchQuery,
  currentPage,
  pageSize,
  onPageChange,
  onNameClick,
  initialEvents,
  initialEventsTotal,
  initialListings,
  initialRegistrations,
}: {
  tab: ExplorerTab;
  environment: Environment;
  sortBy: SortBy;
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onNameClick: (name: string, network?: Network) => void;
  initialEvents: TaggedEvent[];
  initialEventsTotal: number;
  initialListings: TaggedListing[];
  initialRegistrations: TaggedRegistration[];
}) {
  const hasSearchFilter = normalizeExplorerQuery(searchQuery).length > 0;
  const activeEvents = useMemo(() => getTabEvents(tab, initialEvents), [tab, initialEvents]);

  const filteredEvents = useMemo(() => {
    return sortEvents(filterEvents(activeEvents, searchQuery), sortBy);
  }, [activeEvents, searchQuery, sortBy]);

  const filteredListings = useMemo(() => {
    return sortListings(filterListings(initialListings, searchQuery), sortBy);
  }, [initialListings, searchQuery, sortBy]);

  const filteredRegistrations = useMemo(() => {
    return sortRegistrations(filterRegistrations(initialRegistrations, searchQuery), sortBy);
  }, [initialRegistrations, searchQuery, sortBy]);

  const totalItems = useMemo(() => {
    if (tab === "registered") return filteredRegistrations.length;
    if (tab === "forsale") return filteredListings.length;
    return hasSearchFilter ? filteredEvents.length : initialEventsTotal;
  }, [tab, filteredRegistrations.length, filteredListings.length, filteredEvents.length, hasSearchFilter, initialEventsTotal]);

  const safePage = clampPage(currentPage, totalItems, pageSize);

  useEffect(() => {
    if (safePage !== currentPage) onPageChange(safePage);
  }, [safePage, currentPage, onPageChange]);

  const visibleRegistrations = useMemo(
    () => paginateRows(filteredRegistrations, safePage, pageSize),
    [filteredRegistrations, safePage, pageSize],
  );
  const visibleListings = useMemo(
    () => paginateRows(filteredListings, safePage, pageSize),
    [filteredListings, safePage, pageSize],
  );
  const visibleEvents = filteredEvents;

  if (tab === "registered") {
    return (
      <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                <th className="px-4 py-3 sm:px-6">Name</th>
                <th className="px-4 py-3 sm:px-6">Status</th>
                <th className="hidden sm:table-cell px-4 py-3 sm:px-6">Address</th>
                <th className="px-4 py-3 text-right sm:px-6">Block</th>
                {environment === "all" && <th className="px-4 py-3 text-right sm:px-6">Net</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={environment === "all" ? 5 : 4} className="px-4 py-12 text-center text-fg-muted">
                    No registered names found.
                  </td>
                </tr>
              ) : (
                visibleRegistrations.map((r) => (
                  <tr
                    key={`${r.network}:${r.name}:${r.txid}`}
                    className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <button
                        type="button"
                        onClick={() => onNameClick(r.name, r.network)}
                        className="font-semibold text-fg-heading hover:underline cursor-pointer"
                      >
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span
                        className="rounded px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
                        style={{ background: "var(--market-stats-segment-active-bg)" }}
                      >
                        {r.listing ? "Listed" : "Registered"}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 sm:px-6">
                      <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">{r.address}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">{r.height.toLocaleString()}</td>
                    {environment === "all" && (
                      <td className="px-4 py-3 text-right sm:px-6">
                        <span
                          className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                          style={{ background: "var(--market-stats-segment-active-bg)" }}
                        >
                          {r.network === "testnet" ? "T" : "M"}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls page={safePage} totalItems={totalItems} pageSize={pageSize} onPageChange={onPageChange} />
      </div>
    );
  }

  if (tab === "forsale") {
    return (
      <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}>
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
              {visibleListings.length === 0 ? (
                <tr>
                  <td colSpan={environment === "all" ? 4 : 3} className="px-4 py-12 text-center text-fg-muted">
                    No names listed for sale.
                  </td>
                </tr>
              ) : (
                visibleListings.map((l) => (
                  <tr
                    key={`${l.network}:${l.txid}`}
                    className="border-b last:border-b-0 transition-colors"
                    style={{ borderColor: "var(--leaders-card-border)" }}
                  >
                    <td className="px-4 py-3 sm:px-6">
                      <button
                        type="button"
                        onClick={() => onNameClick(l.name, l.network)}
                        className="font-semibold text-fg-heading hover:underline cursor-pointer"
                      >
                        {l.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted sm:px-6">{zatsToZec(l.price)} ZEC</td>
                    <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">{l.height.toLocaleString()}</td>
                    {environment === "all" && (
                      <td className="px-4 py-3 text-right sm:px-6">
                        <span
                          className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
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
        <PaginationControls page={safePage} totalItems={totalItems} pageSize={pageSize} onPageChange={onPageChange} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}>
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
            {visibleEvents.length === 0 ? (
              <tr>
                <td colSpan={environment === "all" ? 5 : 4} className="px-4 py-12 text-center text-fg-muted">
                  No events found.
                </td>
              </tr>
            ) : (
              visibleEvents.map((ev) => (
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
                        onClick={() => onNameClick(ev.name, ev.network)}
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
                      <span className="font-mono text-fg-muted text-xs truncate max-w-[14rem] inline-block align-middle">{ev.ua}</span>
                    ) : (
                      <span className="text-fg-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-fg-muted text-xs sm:px-6">{ev.height.toLocaleString()}</td>
                  {environment === "all" && (
                    <td className="px-4 py-3 text-right sm:px-6">
                      <span
                        className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                        style={{ background: "var(--market-stats-segment-active-bg)" }}
                      >
                        {ev.network === "testnet" ? "T" : "M"}
                      </span>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls page={safePage} totalItems={totalItems} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}