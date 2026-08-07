"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import PaginationControls from "@/components/PaginationControls";
import ProtectedNameDetailsModal from "@/components/protected/ProtectedNameDetailsModal";
import { InlineSearchField } from "@/components/search/InlineSearchField";
import DataViewTabs from "@/components/table/DataViewTabs";
import SearchResultsSummary from "@/components/table/SearchResultsSummary";
import {
  TableIconButton,
  TableRowsMenu,
  TableSortMenu,
} from "@/components/table/TableIconMenus";
import TableLoadingOverlay from "@/components/table/TableLoadingOverlay";
import useCachedRemoteTableData from "@/components/table/useCachedRemoteTableData";
import type {
  ProtectedViewData,
  ProtectedViewRow,
  ProtectedViewSearchMode,
  ProtectedViewSortDirection,
  ProtectedViewSortKey,
} from "@/lib/protected/view";

const PROTECTED_VIEW_CACHE_LIMIT = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const SORT_OPTIONS: Array<{
  key: string;
  label: string;
  sortKey: ProtectedViewSortKey;
  sortDirection: ProtectedViewSortDirection;
}> = [
  { key: "normalized_name-asc", label: "name (A-Z)", sortKey: "normalized_name", sortDirection: "asc" },
  { key: "normalized_name-desc", label: "name (Z-A)", sortKey: "normalized_name", sortDirection: "desc" },
  { key: "parent_name-asc", label: "parent_name (A-Z)", sortKey: "parent_name", sortDirection: "asc" },
  { key: "parent_name-desc", label: "parent_name (Z-A)", sortKey: "parent_name", sortDirection: "desc" },
  { key: "category-asc", label: "category (A-Z)", sortKey: "category", sortDirection: "asc" },
  { key: "category-desc", label: "category (Z-A)", sortKey: "category", sortDirection: "desc" },
  { key: "status-asc", label: "status (A-Z)", sortKey: "status", sortDirection: "asc" },
  { key: "status-desc", label: "status (Z-A)", sortKey: "status", sortDirection: "desc" },
  { key: "redeemed-desc", label: "redeemed (true first)", sortKey: "redeemed", sortDirection: "desc" },
  { key: "redeemed-asc", label: "redeemed (false first)", sortKey: "redeemed", sortDirection: "asc" },
  { key: "protected_at-desc", label: "protected_at (newest first)", sortKey: "protected_at", sortDirection: "desc" },
  { key: "protected_at-asc", label: "protected_at (oldest first)", sortKey: "protected_at", sortDirection: "asc" },
  { key: "expires_at-desc", label: "expires_at (newest first)", sortKey: "expires_at", sortDirection: "desc" },
  { key: "expires_at-asc", label: "expires_at (oldest first)", sortKey: "expires_at", sortDirection: "asc" },
  { key: "updated_at-desc", label: "updated_at (newest first)", sortKey: "updated_at", sortDirection: "desc" },
  { key: "updated_at-asc", label: "updated_at (oldest first)", sortKey: "updated_at", sortDirection: "asc" },
  { key: "created_at-desc", label: "created_at (newest first)", sortKey: "created_at", sortDirection: "desc" },
  { key: "created_at-asc", label: "created_at (oldest first)", sortKey: "created_at", sortDirection: "asc" },
];

function buildProtectedViewCacheKey(args: {
  page: number;
  pageSize: number;
  sortKey: ProtectedViewSortKey;
  sortDirection: ProtectedViewSortDirection;
  searchQuery: string;
  searchMode: ProtectedViewSearchMode;
  redeemedOnly: boolean;
  underReviewOnly: boolean;
  rejectedOnly: boolean;
}) {
  return JSON.stringify({
    page: args.page,
    pageSize: args.pageSize,
    sortKey: args.sortKey,
    sortDirection: args.sortDirection,
    searchQuery: args.searchQuery.trim(),
    searchMode: args.searchMode,
    redeemedOnly: args.redeemedOnly,
    underReviewOnly: args.underReviewOnly,
    rejectedOnly: args.rejectedOnly,
  });
}

function buildProtectedViewUrl(args: {
  page: number;
  pageSize: number;
  sortKey: ProtectedViewSortKey;
  sortDirection: ProtectedViewSortDirection;
  searchQuery: string;
  searchMode: ProtectedViewSearchMode;
  redeemedOnly: boolean;
  underReviewOnly: boolean;
  rejectedOnly: boolean;
}) {
  const searchParams = new URLSearchParams({
    page: String(args.page),
    pageSize: String(args.pageSize),
    sortKey: args.sortKey,
    sortDirection: args.sortDirection,
    searchMode: args.searchMode,
    redeemedOnly: String(args.redeemedOnly),
    underReviewOnly: String(args.underReviewOnly),
    rejectedOnly: String(args.rejectedOnly),
  });

  if (args.searchQuery.trim()) {
    searchParams.set("search", args.searchQuery.trim());
  }

  return `/api/protected/view?${searchParams.toString()}`;
}

function EllipsisIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function getStatusLabel(status: string) {
  if (status.toLowerCase() === "under_review") return "Under Review";
  if (status.toLowerCase() === "protected") return "Protected";
  if (status.toLowerCase() === "rejected") return "Rejected";
  return status.replaceAll("_", " ");
}

function getStatusStyle(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "protected") {
    return {
      color: "var(--accent-green, #27b36a)",
      background:
        "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
    };
  }

  if (normalizedStatus === "under_review") {
    return {
      color: "var(--accent-yellow, #d6a852)",
      background:
        "color-mix(in srgb, var(--accent-yellow, #d6a852) 12%, transparent)",
    };
  }

  if (normalizedStatus === "rejected") {
    return {
      color: "var(--accent-red, #e05252)",
      background:
        "color-mix(in srgb, var(--accent-red, #e05252) 12%, transparent)",
    };
  }

  return {
    color: "var(--fg-muted)",
    background: "var(--market-stats-segment-active-bg)",
  };
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function UnderReviewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function RejectedIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function ProtectedViewClient({
  initialData,
}: {
  initialData: ProtectedViewData;
}) {
  const [draftSearch, setDraftSearch] = useState(initialData.searchQuery);
  const [appliedSearch, setAppliedSearch] = useState(initialData.searchQuery);
  const [searchMode, setSearchMode] = useState<ProtectedViewSearchMode>(
    initialData.searchQuery.trim() ? initialData.searchMode : "contains",
  );
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [sortKey, setSortKey] = useState<ProtectedViewSortKey>(initialData.sortKey);
  const [sortDirection, setSortDirection] = useState<ProtectedViewSortDirection>(
    initialData.sortDirection,
  );
  const [redeemedOnly, setRedeemedOnly] = useState(initialData.redeemedOnly);
  const [underReviewOnly, setUnderReviewOnly] = useState(initialData.underReviewOnly);
  const [rejectedOnly, setRejectedOnly] = useState(initialData.rejectedOnly);
  const [detailsRow, setDetailsRow] = useState<ProtectedViewRow | null>(null);
  const router = useRouter();
  const initialDataRef = useRef(initialData);
  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const stableInitialData = initialDataRef.current;
  const effectiveSearchMode: ProtectedViewSearchMode = appliedSearch.trim()
    ? searchMode
    : "contains";
  const initialCacheKey = buildProtectedViewCacheKey({
    page: stableInitialData.page,
    pageSize: stableInitialData.pageSize,
    sortKey: stableInitialData.sortKey,
    sortDirection: stableInitialData.sortDirection,
    searchQuery: stableInitialData.searchQuery,
    searchMode: stableInitialData.searchQuery.trim()
      ? stableInitialData.searchMode
      : "contains",
    redeemedOnly: stableInitialData.redeemedOnly,
    underReviewOnly: stableInitialData.underReviewOnly,
    rejectedOnly: stableInitialData.rejectedOnly,
  });
  const queryKey = buildProtectedViewCacheKey({
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery: appliedSearch,
    searchMode: effectiveSearchMode,
    redeemedOnly,
    underReviewOnly,
    rejectedOnly,
  });
  const { data, isRefreshing, loadError } = useCachedRemoteTableData({
    initialCacheKey,
    initialData: stableInitialData,
    queryKey,
    cacheLimit: PROTECTED_VIEW_CACHE_LIMIT,
    fetchData: async () => {
      const response = await fetch(
        buildProtectedViewUrl({
          page,
          pageSize,
          sortKey,
          sortDirection,
          searchQuery: appliedSearch,
          searchMode: effectiveSearchMode,
          redeemedOnly,
          underReviewOnly,
          rejectedOnly,
        }),
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to refresh protected rows.");
      }

      return (await response.json()) as ProtectedViewData;
    },
  });
  const hasSearchInput = !!draftSearch.trim();
  const totalPages = Math.max(1, Math.ceil(data.totalCount / pageSize));
  const activeSortOptionKey =
    SORT_OPTIONS.find(
      (option) => option.sortKey === sortKey && option.sortDirection === sortDirection,
    )?.key ?? SORT_OPTIONS[0].key;
  const allActive =
    !redeemedOnly &&
    !underReviewOnly &&
    !rejectedOnly &&
    appliedSearch.trim() === "";

  function applySearch() {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
  }

  function applySortOption(optionKey: string) {
    const option = SORT_OPTIONS.find((entry) => entry.key === optionKey);
    if (!option) return;
    setPage(1);
    setSortKey(option.sortKey);
    setSortDirection(option.sortDirection);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <section
        className="rounded-2xl border px-6 py-8 sm:px-8 sm:py-10"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
        }}
      >
        <div className="grid gap-6">
          <div className="min-w-0 text-center">
            <h1
              className="text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
              style={{ color: "var(--fg-heading)" }}
            >
              Protected Names
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-lg leading-8"
              style={{ color: "var(--fg-body)" }}
            >
              Search names, check protection status, and review protected name activity.
            </p>
            <div className="mt-6 hidden flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:flex lg:text-base">
              <span className="inline-flex items-center gap-2" style={{ color: "var(--fg-body)" }}>
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-accent-interactive-soft)",
                    color: "var(--color-accent-interactive)",
                  }}
                >
                  <SearchIcon />
                </span>
                <span>
                  <strong style={{ color: "var(--fg-heading)" }}>
                    {data.heroAllCount.toLocaleString()}
                  </strong>{" "}
                  names
                </span>
              </span>
              <span className="inline-flex items-center gap-2" style={{ color: "var(--fg-body)" }}>
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-accent-interactive-soft)",
                    color: "var(--color-accent-interactive)",
                  }}
                >
                  <UnderReviewIcon />
                </span>
                <span>
                  <strong style={{ color: "var(--fg-heading)" }}>
                    {data.heroUnderReviewCount.toLocaleString()}
                  </strong>{" "}
                  under review
                </span>
              </span>
              <span className="inline-flex items-center gap-2" style={{ color: "var(--fg-body)" }}>
                <span
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: "var(--color-accent-interactive-soft)",
                    color: "var(--color-accent-interactive)",
                  }}
                >
                  <RejectedIcon />
                </span>
                <span>
                  <strong style={{ color: "var(--fg-heading)" }}>
                    {data.heroRejectedCount.toLocaleString()}
                  </strong>{" "}
                  rejected
                </span>
              </span>
            </div>
            <div
              className="mx-auto mt-6 max-w-[30rem] border-t pt-5 text-center text-base leading-7"
              style={{
                color: "var(--fg-body)",
                borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
              }}
            >
              <span>Want to protect a name that is missing here?</span>
              <span className="mt-1 block text-center text-base">
                <Link
                  href="/protected/suggest"
                  className="font-normal underline"
                  style={{ color: "var(--color-accent-interactive)" }}
                >
                  Suggest one
                </Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="min-w-0 max-w-full">
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <InlineSearchField
            value={draftSearch}
            onChange={setDraftSearch}
            onSubmit={applySearch}
            variant="table"
            placeholder="parent name or variant"
            ariaLabel="Search protected names"
            searchMode={searchMode}
            onSearchModeChange={(value) => setSearchMode(value as ProtectedViewSearchMode)}
            onClear={() => {
              setDraftSearch("");
              setSearchMode("contains");
            }}
            submitDisabled={!hasSearchInput}
            showClear={hasSearchInput}
            clearAriaLabel="Clear protected search text"
          />
        </div>
      </section>

      {appliedSearch.trim() ? (
        <SearchResultsSummary
          query={appliedSearch}
          matchCount={isRefreshing ? null : data.totalCount}
          onClear={() => {
            setDraftSearch("");
            setAppliedSearch("");
            setSearchMode("contains");
            setPage(1);
          }}
        />
      ) : null}

      <DataViewTabs
        borderColor="var(--faq-border)"
        tabs={[
          {
            key: "all",
            label: `All (${data.allCount})`,
            active: allActive,
            onClick: () => {
              setDraftSearch("");
              setAppliedSearch("");
              setSearchMode("contains");
              setPage(1);
              setRedeemedOnly(false);
              setUnderReviewOnly(false);
              setRejectedOnly(false);
            },
          },
          {
            key: "redeemed",
            label: `Redeemed (${data.redeemedCount})`,
            active: redeemedOnly,
            onClick: () => {
              setPage(1);
              setRedeemedOnly(true);
              setUnderReviewOnly(false);
              setRejectedOnly(false);
            },
          },
          {
            key: "under-review",
            label: `Under Review (${data.underReviewCount})`,
            active: underReviewOnly,
            onClick: () => {
              setPage(1);
              setUnderReviewOnly(true);
              setRedeemedOnly(false);
              setRejectedOnly(false);
            },
          },
          {
            key: "rejected",
            label: `Rejected (${data.rejectedCount})`,
            active: rejectedOnly,
            onClick: () => {
              setPage(1);
              setRejectedOnly(true);
              setUnderReviewOnly(false);
              setRedeemedOnly(false);
            },
          },
        ]}
        endContent={
          <>
            <TableIconButton
              ariaLabel="Suggest a protected name"
              borderColor="var(--faq-border)"
              icon={<PlusIcon />}
              onClick={() => router.push("/protected/suggest")}
            />
            <TableSortMenu
              value={activeSortOptionKey}
              options={SORT_OPTIONS}
              onChange={applySortOption}
              borderColor="var(--faq-border)"
            />
            <TableRowsMenu
              value={pageSize}
              options={PAGE_SIZE_OPTIONS}
              onChange={(next) => {
                setPage(1);
                setPageSize(next);
              }}
              borderColor="var(--faq-border)"
            />
          </>
        }
      />

      <div
        ref={tableShellRef}
        className="relative overflow-hidden rounded-2xl border"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "color-mix(in srgb, var(--color-bg-elevated, transparent) 72%, transparent)",
        }}
      >
        <div className="overflow-x-auto">
          <div className="min-w-full">
            <table
              className="min-w-full w-full table-auto border-separate border-spacing-0"
              style={{ color: "var(--fg-body)" }}
              data-testid="protected-table"
            >
              <thead>
                <tr>
                  {["name", "category", "status", "redeemed", "details"].map(
                    (column, index) => (
                      <th
                        key={column}
                        className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] align-middle sm:px-6"
                        style={{
                          background: "color-mix(in srgb, var(--color-raised) 72%, transparent)",
                          borderBottom: "1px solid var(--faq-border)",
                          borderRight:
                            index === 4
                              ? "none"
                              : "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                          color: "var(--fg-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {loadError ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-4 text-sm"
                      style={{ color: "var(--accent-red, #e05252)" }}
                    >
                      {loadError}
                    </td>
                  </tr>
                ) : null}

                {data.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {isRefreshing
                        ? "Loading names..."
                        : "No protected names matched your current search."}
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row: ProtectedViewRow) => (
                    <tr key={row.name}>
                      <td
                        className="px-5 py-4 text-sm sm:px-6"
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                          borderRight:
                            "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                        }}
                      >
                        <span
                          className="block"
                          style={{ color: "var(--fg-body)" }}
                          title={row.normalized_name}
                        >
                          {row.normalized_name}
                        </span>
                        {row.parent_name ? (
                          <span
                            className="mt-1 block text-xs"
                            style={{ color: "var(--fg-muted)" }}
                            title={row.parent_name.toLowerCase()}
                          >
                            {row.parent_name.toLowerCase()}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className="px-5 py-4 text-sm sm:px-6"
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                          borderRight:
                            "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.category}
                      </td>
                      <td
                        className="px-5 py-4 text-sm sm:px-6"
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                          borderRight:
                            "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                          style={getStatusStyle(row.status)}
                        >
                          {getStatusLabel(row.status)}
                        </span>
                      </td>
                      <td
                        className="px-5 py-4 text-sm sm:px-6"
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                          borderRight:
                            "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {String(row.redeemed)}
                      </td>
                      <td
                        className="px-5 py-4 text-sm sm:px-6"
                        style={{
                          borderBottom:
                            "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <div className="flex justify-center">
                          <button
                            type="button"
                            aria-label={`Details for ${row.normalized_name}`}
                            onClick={() => setDetailsRow(row)}
                            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[color:var(--fg-body)] transition-colors hover:text-[var(--color-accent-interactive)]"
                          >
                            <EllipsisIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {data.rows.length > 0 ? (
          <PaginationControls
            page={page}
            totalPages={totalPages}
            onPageChange={goToPage}
            disabled={isRefreshing}
            style={{
              borderTop: "1px solid var(--faq-border)",
            }}
            testId="protected-pagination"
          />
        ) : null}

        <TableLoadingOverlay
          active={isRefreshing}
          anchorElement={tableShellRef.current}
          label="Loading names..."
        />
      </div>

      <ProtectedNameDetailsModal
        row={detailsRow}
        isOpen={!!detailsRow}
        onClose={() => setDetailsRow(null)}
        onDispute={(row) => {
          setDetailsRow(null);
          router.push(
            `/protected/dispute?${new URLSearchParams({
              name: row.name,
            }).toString()}`,
          );
        }}
      />
    </div>
  );
}
