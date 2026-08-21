"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { getFaqItemsForSurface } from "@/lib/faq";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useCopy } from "@/components/hooks/useCopy";
import PaginationControls from "@/components/PaginationControls";
import { InlineSearchField } from "@/components/search/InlineSearchField";
import DataViewTabs from "@/components/table/DataViewTabs";
import SearchResultsSummary from "@/components/table/SearchResultsSummary";
import { TableRowsMenu, TableSortMenu } from "@/components/table/TableIconMenus";
import TableLoadingOverlay from "@/components/table/TableLoadingOverlay";
import useCachedRemoteTableData from "@/components/table/useCachedRemoteTableData";
import HeroShareButton from "@/components/HeroShareButton";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import WaitlistNameDetailsModal from "@/components/waitlist/WaitlistNameDetailsModal";
import VerifyAmbientHeroSection from "@/components/verify/VerifyAmbientHeroSection";
import { reservedReferralSpotPhrase } from "@/lib/waitlist/referral-spots";
import type {
  PublicWaitlistViewData,
  PublicWaitlistViewRow,
  WaitlistViewSearchMode,
  WaitlistViewSortDirection,
  WaitlistViewSortKey,
} from "@/lib/waitlist/view";

type WaitlistViewClientProps = {
  initialRows: PublicWaitlistViewRow[];
  initialAllCount: number;
  initialTotalCount: number;
  initialReservedOnlyCount: number;
  initialProtectedOnlyCount: number;
  initialHeroAllCount: number;
  initialHeroReservedCount: number;
  initialHeroProtectedCount: number;
  initialPage: number;
  initialPageSize: number;
  initialHasMore: boolean;
  initialSortKey: WaitlistViewSortKey;
  initialSortDirection: WaitlistViewSortDirection;
  initialSearchQuery: string;
  initialSearchMode: WaitlistViewSearchMode;
  earlyAccessStartAt: string;
  earlyAccessLabel: string;
  adminWalletUivk: string;
  referralsPerSpot: number;
  indirectReferralsPerSpot: number;
  openMatchingDetails?: boolean;
};

const WAITLIST_VIEW_CACHE_LIMIT = 25;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const SORT_OPTIONS: Array<{
  key: string;
  label: string;
  sortKey: WaitlistViewSortKey;
  sortDirection: WaitlistViewSortDirection;
}> = [
  { key: "line-asc", label: "Queue #", sortKey: "line", sortDirection: "asc" },
  { key: "name-asc", label: "Name (A-Z)", sortKey: "name", sortDirection: "asc" },
  { key: "name-desc", label: "Name (Z-A)", sortKey: "name", sortDirection: "desc" },
  { key: "interest-desc", label: "Interest (high to low)", sortKey: "interest", sortDirection: "desc" },
  { key: "interest-asc", label: "Interest (low to high)", sortKey: "interest", sortDirection: "asc" },
  { key: "protected-desc", label: "Protected first", sortKey: "protected", sortDirection: "desc" },
  { key: "reserved-desc", label: "Reserved first", sortKey: "reserved", sortDirection: "desc" },
  { key: "direct-desc", label: "Direct referrals (high to low)", sortKey: "directReferrals", sortDirection: "desc" },
  { key: "indirect-desc", label: "Indirect referrals (high to low)", sortKey: "indirectReferrals", sortDirection: "desc" },
];

function formatHeroCountdown(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { days, hours, minutes };
}

function formatHeroDeadlineLabel(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(date);
}

function buildWaitlistViewCacheKey(args: {
  page: number;
  pageSize: number;
  sortKey: WaitlistViewSortKey;
  sortDirection: WaitlistViewSortDirection;
  searchQuery: string;
  searchMode: WaitlistViewSearchMode;
  reservedOnly: boolean;
  protectedOnly: boolean;
}): string {
  return JSON.stringify({
    page: args.page,
    pageSize: args.pageSize,
    sortKey: args.sortKey,
    sortDirection: args.sortDirection,
    searchQuery: args.searchQuery.trim(),
    searchMode: args.searchMode,
    reservedOnly: args.reservedOnly,
    protectedOnly: args.protectedOnly,
  });
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

function HeaderInfoModal({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.42)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] border p-5 text-center"
        style={{ borderColor: "var(--faq-border)", background: "var(--color-raised)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-base font-bold" style={{ color: "var(--fg-heading)" }}>
          {title}
        </h3>
        <p className="mt-3 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
          {body}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 inline-flex rounded-full border border-[var(--faq-border)] bg-[color-mix(in_srgb,var(--color-bg-elevated,transparent)_78%,transparent)] px-4 py-2 text-sm font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

const WAITLIST_VIEW_FAQ_ITEMS = getFaqItemsForSurface("waitlist-view");

function WaitlistFaq({
  maskedViewKey,
  onOpenViewKey,
}: {
  maskedViewKey: string;
  onOpenViewKey: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(WAITLIST_VIEW_FAQ_ITEMS[0]?.id ?? null);
  const items = WAITLIST_VIEW_FAQ_ITEMS.map((item) => {
    if (item.id !== "waitlist-view-queue-key") return item;
    return {
      ...item,
      answer: (
        <>
          {item.answer}{" "}
          <button
            type="button"
            onClick={onOpenViewKey}
            className="cursor-pointer underline underline-offset-4 transition-colors duration-200 hover:text-[var(--color-accent-interactive)]"
            style={{ color: "var(--fg-body)" }}
          >
            <strong>{maskedViewKey}</strong>
          </button>
        </>
      ),
    };
  });

  return (
    <section className="mx-auto mt-12 w-full max-w-3xl px-0 pb-4">
      <div className="mb-8 flex items-center gap-4">
        <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
          Frequently Asked Questions
        </h2>
        <div
          className="h-px flex-1"
          style={{ background: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))" }}
        />
      </div>

      <FaqAccordion
        items={items}
        openId={openId}
        onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
        variant="card"
      />

      <div className="mt-4 flex justify-end">
        <Link
          href="/faq#waitlist-view"
          className="text-sm font-semibold transition-colors hover:text-[var(--color-accent-interactive)]"
          style={{ color: "var(--color-accent-interactive, var(--fg-heading))" }}
        >
          See all waitlist questions →
        </Link>
      </div>
    </section>
  );
}

function PadlockSymbol({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ width: "1.05em", height: "1.05em" }}
    >
      <rect x="4.5" y="9" width="11" height="7.5" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 9V6.6C7 4.61 8.57 3 10.5 3C12.43 3 14 4.61 14 6.6V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HeaderCell({
  label,
  sortable = false,
  active = false,
  direction = "asc",
  disabled = false,
  onClick,
}: {
  label: string;
  sortable?: boolean;
  active?: boolean;
  direction?: WaitlistViewSortDirection;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left transition hover:text-[var(--fg-heading)] focus:outline-none disabled:cursor-default disabled:hover:text-inherit"
      style={{
        font: "inherit",
        letterSpacing: "inherit",
        textTransform: "none",
        color: active ? "var(--fg-heading)" : undefined,
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
      }}
    >
      {sortable ? (
        <span
          aria-hidden="true"
          className="shrink-0 text-[0.72rem]"
        >
          {active ? (direction === "desc" ? "â†“" : "â†‘") : "â†•"}
        </span>
      ) : null}
      <span className="min-w-0">{label}</span>
    </button>
  );
}

function maskQueueViewKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)}`;
}

async function downloadQrPng(canvas: HTMLCanvasElement | null, filename: string): Promise<string | null> {
  if (!canvas) return "QR download is unavailable. Try again or copy the view key.";
  try {
    const padding = 96;
    const qrSize = 768;
    const out = document.createElement("canvas");
    out.width = qrSize + padding * 2;
    out.height = qrSize + padding * 2;
    const ctx = out.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, padding, padding, qrSize, qrSize);
    const blob = await new Promise<Blob>((resolve, reject) => {
      out.toBlob((value) => (value ? resolve(value) : reject(new Error("QR PNG export failed."))), "image/png");
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return null;
  } catch {
    return "Could not save the QR. Try a screenshot or copy the view key.";
  }
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M12 3v11" />
      <path d="M8 10l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function ViewKeyCopyRow({
  value,
  copied,
  onCopy,
}: {
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mx-auto inline-grid w-fit max-w-[292px] grid-cols-[1fr_auto] items-center gap-2 text-left">
      <code
        className="flex h-9 min-w-0 items-center truncate rounded-md px-2 text-xs font-mono"
        style={{ background: "var(--color-raised)", color: "var(--fg-body)", border: "1px solid var(--border-muted)" }}
        title={value}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-border-muted bg-transparent text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
        aria-label="Copy view key"
        title={copied ? "Copied!" : "Copy view key"}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function ExpandedQrModal({
  value,
  onClose,
}: {
  value: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-[28px] border bg-white p-4"
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <QRCodeSVG value={value} size={Math.min(window.innerWidth - 64, 640)} fgColor="#000000" bgColor="#ffffff" marginSize={4} />
      </div>
    </div>
  );
}

function QueueViewKeyModal({
  value,
  onClose,
}: {
  value: string;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [qrError, setQrError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { copied, copy } = useCopy();

  async function handleSavePng() {
    setQrError("");
    const error = await downloadQrPng(canvasRef.current, "zcashnames-queue-view-key.png");
    if (error) setQrError(error);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-xl rounded-[28px] border p-5 sm:p-6"
          style={{
            borderColor: "var(--faq-border)",
            background: "var(--color-raised)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mx-auto flex max-w-md flex-col items-center text-center">
            <h3 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
              Queue view key
            </h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
              Use this key to inspect incoming reservation payments. You can scan the QR, save it, expand it, or copy the full view key.
            </p>
          </div>

          <div className="mt-5 flex flex-col items-center gap-4">
            <div className="mx-auto grid w-fit grid-cols-[auto_auto_auto] items-start justify-center gap-3">
              <div className="mt-2 flex h-full min-h-[244px] flex-col justify-start">
                <button
                  type="button"
                  onClick={handleSavePng}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-border-muted bg-transparent text-xs font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                  aria-label="Save QR"
                  title="Save QR"
                >
                  <DownloadIcon />
                </button>
              </div>
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={value} size={220} fgColor="#000000" bgColor="#ffffff" marginSize={4} />
                <QRCodeCanvas
                  ref={canvasRef}
                  value={value}
                  size={768}
                  fgColor="#000000"
                  bgColor="#ffffff"
                  marginSize={4}
                  className="pointer-events-none absolute h-px w-px opacity-0"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2 flex h-full min-h-[244px] flex-col justify-start">
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-[1.5px] border-border-muted bg-transparent text-xs font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                  aria-label="Expand QR"
                  title="Expand QR"
                >
                  <ExpandIcon />
                </button>
              </div>
            </div>

            {qrError ? (
              <p className="text-center text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
                {qrError}
              </p>
            ) : null}

            <div className="flex w-full justify-center">
              <ViewKeyCopyRow value={value} copied={copied} onCopy={() => copy(value)} />
            </div>

            <div className="flex w-full justify-center pt-1">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border-[1.5px] border-border-muted bg-transparent px-3 py-1 text-sm font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {expanded ? <ExpandedQrModal value={value} onClose={() => setExpanded(false)} /> : null}
    </>
  );
}

function buildWaitlistViewUrl(args: {
  page: number;
  pageSize: number;
  sortKey: WaitlistViewSortKey;
  sortDirection: WaitlistViewSortDirection;
  searchQuery: string;
  searchMode: WaitlistViewSearchMode;
  reservedOnly: boolean;
  protectedOnly: boolean;
}) {
  const searchParams = new URLSearchParams({
    page: String(args.page),
    pageSize: String(args.pageSize),
    sortKey: args.sortKey,
    sortDirection: args.sortDirection,
    searchMode: args.searchMode,
    reservedOnly: String(args.reservedOnly),
    protectedOnly: String(args.protectedOnly),
  });
  if (args.searchQuery.trim()) {
    searchParams.set("search", args.searchQuery.trim());
  }
  return `/api/waitlist/view?${searchParams.toString()}`;
}

export default function WaitlistViewClient({
  initialRows,
  initialAllCount,
  initialTotalCount,
  initialReservedOnlyCount,
  initialProtectedOnlyCount,
  initialHeroAllCount,
  initialHeroReservedCount,
  initialHeroProtectedCount,
  initialPage,
  initialPageSize,
  initialHasMore,
  initialSortKey,
  initialSortDirection,
  initialSearchQuery,
  initialSearchMode,
  earlyAccessStartAt,
  earlyAccessLabel,
  adminWalletUivk,
  referralsPerSpot,
  indirectReferralsPerSpot,
  openMatchingDetails = false,
}: WaitlistViewClientProps) {
  const router = useAppRouter();
  const [detailsRow, setDetailsRow] = useState<PublicWaitlistViewRow | null>(null);
  const autoOpenedDetailsRef = useRef(false);
  const [draftSearch, setDraftSearch] = useState(initialSearchQuery);
  const [appliedSearch, setAppliedSearch] = useState(initialSearchQuery);
  const [searchMode, setSearchMode] = useState<WaitlistViewSearchMode>(
    initialSearchQuery.trim() ? initialSearchMode : "contains",
  );
  const [reservedOnly, setReservedOnly] = useState(false);
  const [protectedOnly, setProtectedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<WaitlistViewSortKey>(initialSortKey);
  const [sortDirection, setSortDirection] = useState<WaitlistViewSortDirection>(initialSortDirection);
  const [page, setPage] = useState(initialPage);
  const [showViewKeyModal, setShowViewKeyModal] = useState(false);
  const [headerInfo, setHeaderInfo] = useState<{ title: string; body: string } | null>(null);
  const initialDataRef = useRef<PublicWaitlistViewData>({
    rows: initialRows,
    allCount: initialAllCount,
    totalCount: initialTotalCount,
    reservedOnlyCount: initialReservedOnlyCount,
    protectedOnlyCount: initialProtectedOnlyCount,
    heroAllCount: initialHeroAllCount,
    heroReservedCount: initialHeroReservedCount,
    heroProtectedCount: initialHeroProtectedCount,
    page: initialPage,
    pageSize: initialPageSize,
    hasMore: initialHasMore,
    sortKey: initialSortKey,
    sortDirection: initialSortDirection,
    searchQuery: initialSearchQuery,
    searchMode: initialSearchMode,
    earlyAccessStartAt,
    earlyAccessLabel,
    adminWalletUivk,
    referralsPerSpot,
    indirectReferralsPerSpot,
  });
  const tableShellRef = useRef<HTMLDivElement | null>(null);
  const effectiveSearchMode: WaitlistViewSearchMode = appliedSearch.trim() ? searchMode : "contains";
  const initialData = initialDataRef.current;

  const initialCacheKey = buildWaitlistViewCacheKey({
    page: initialPage,
    pageSize: initialPageSize,
    sortKey: initialSortKey,
    sortDirection: initialSortDirection,
    searchQuery: initialSearchQuery,
    searchMode: initialSearchQuery.trim() ? initialSearchMode : "contains",
    reservedOnly: false,
    protectedOnly: false,
  });
  const queryKey = buildWaitlistViewCacheKey({
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery: appliedSearch,
    searchMode: effectiveSearchMode,
    reservedOnly,
    protectedOnly,
  });
  const { data: viewData, isRefreshing, loadError } = useCachedRemoteTableData({
    initialCacheKey,
    initialData,
    queryKey,
    cacheLimit: WAITLIST_VIEW_CACHE_LIMIT,
    fetchData: async () => {
      const response = await fetch(
        buildWaitlistViewUrl({
          page,
          pageSize,
          sortKey,
          sortDirection,
          searchQuery: appliedSearch,
          searchMode: effectiveSearchMode,
          reservedOnly,
          protectedOnly,
        }),
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error("Failed to refresh waitlist rows.");
      }

      return (await response.json()) as PublicWaitlistViewData;
    },
  });

  useEffect(() => {
    if (!openMatchingDetails || autoOpenedDetailsRef.current) return;
    const query = (appliedSearch || initialSearchQuery).trim().toLowerCase();
    if (!query) return;
    const rows = viewData.rows.length > 0 ? viewData.rows : initialRows;
    const match =
      rows.find((row) => row.name.toLowerCase() === query)
      ?? rows.find((row) => (row.displayReferralCode ?? "").toLowerCase() === query)
      ?? rows.find((row) => row.name.toLowerCase().includes(query))
      ?? rows.find((row) => (row.displayReferralCode ?? "").toLowerCase().includes(query))
      ?? null;
    if (!match) return;
    setDetailsRow(match);
    autoOpenedDetailsRef.current = true;
  }, [appliedSearch, initialRows, initialSearchQuery, openMatchingDetails, viewData.rows]);

  const allActive = !reservedOnly && !protectedOnly;
  const visibleRows = viewData.rows;
  const maskedQueueViewKey = maskQueueViewKey(adminWalletUivk);
  const hasSearchInput = !!draftSearch.trim();
  const activeSortOptionKey =
    SORT_OPTIONS.find((option) => option.sortKey === sortKey && option.sortDirection === sortDirection)?.key
    ?? SORT_OPTIONS[0].key;
  const totalPages = Math.max(1, Math.ceil(viewData.totalCount / pageSize));
  const heroNamesCount = viewData.heroAllCount;

  function applySearch() {
    setPage(1);
    setAppliedSearch(draftSearch.trim());
  }

  function setSort(nextKey: WaitlistViewSortKey, nextDirection: WaitlistViewSortDirection) {
    setPage(1);
    setSortKey(nextKey);
    setSortDirection(nextDirection);
  }

  function applySortOption(optionKey: string) {
    const option = SORT_OPTIONS.find((entry) => entry.key === optionKey);
    if (!option) return;
    setSort(option.sortKey, option.sortDirection);
  }

  function goToPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    setPage(nextPage);
  }

  function getStatusLabel(row: PublicWaitlistViewRow): "Protected" | "Reserved" | "Pending" | "Available" {
    if (row.protected) return "Protected";
    if (row.reserved) return "Reserved";
    return "Pending";
  }

  function getStatusStyle(status: ReturnType<typeof getStatusLabel>) {
    if (status === "Protected") {
      return {
        color: "var(--color-accent-interactive)",
        background: "color-mix(in srgb, var(--color-accent-interactive) 12%, transparent)",
      };
    }
    if (status === "Reserved") {
      return {
        color: "var(--accent-green, #27b36a)",
        background: "color-mix(in srgb, var(--accent-green, #27b36a) 12%, transparent)",
      };
    }
    if (status === "Pending") {
      return {
        color: "var(--accent-red, #d67452)",
        background: "color-mix(in srgb, var(--accent-red, #d67452) 12%, transparent)",
      };
    }
    return {
      color: "var(--fg-muted)",
      background: "var(--market-stats-segment-active-bg)",
    };
  }

  function formatReferrals(row: PublicWaitlistViewRow): string {
    if (row.directReferrals <= 0 && row.indirectReferrals <= 0) return "0";
    if (row.directReferrals <= 0) return `${row.indirectReferrals} indirect`;
    if (row.indirectReferrals <= 0) return `${row.directReferrals} direct`;
    return `${row.directReferrals} direct Â· ${row.indirectReferrals} indirect`;
  }

  return (
    <>
      <VerifyAmbientHeroSection
        earlyAccessStartAt={earlyAccessStartAt}
        bandInsetClassName="-mt-5 pt-5 sm:-mt-6 sm:pt-6"
        hero={
          <section
            className="relative mb-6 rounded-2xl border px-6 py-8 sm:px-8 sm:py-10"
            style={{
              borderColor: "var(--faq-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
            }}
          >
            <HeroShareButton
              message="Search the Zcash Names waitlist — check position and reservation status:"
              shareUrl="https://www.zcashnames.com/waitlist/view"
              emailSubject="Zcash Names waitlist"
            />
            <div className="grid gap-6">
              <div className="min-w-0 text-center">
                <h1
                  className="text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
                  style={{ color: "var(--fg-heading)" }}
                >
                  Waitlist
                </h1>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8" style={{ color: "var(--fg-body)" }}>
                  Search names, check position, and view reservation status.
                </p>
                <div className="mt-6 hidden flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm sm:flex lg:text-base">
                  <span className="inline-flex items-center gap-2" style={{ color: "var(--fg-body)" }}>
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: "var(--color-accent-interactive-soft)", color: "var(--color-accent-interactive)" }}
                    >
                      <SearchIcon />
                    </span>
                    <span>
                      <strong style={{ color: "var(--fg-heading)" }}>{heroNamesCount.toLocaleString()}</strong> names
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2" style={{ color: "var(--fg-body)" }}>
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: "var(--color-accent-interactive-soft)", color: "var(--color-accent-interactive)" }}
                    >
                      <CheckIcon />
                    </span>
                    <span>
                      <strong style={{ color: "var(--fg-heading)" }}>{viewData.heroReservedCount.toLocaleString()}</strong> reserved
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2" style={{ color: "var(--fg-body)" }}>
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: "var(--color-accent-interactive-soft)", color: "var(--color-accent-interactive)" }}
                    >
                      <PadlockSymbol className="h-4 w-4" />
                    </span>
                    <span><strong style={{ color: "var(--fg-heading)" }}>{viewData.heroProtectedCount.toLocaleString()}</strong> protected</span>
                  </span>
                </div>
                <div
                  className="mx-auto mt-6 max-w-[30rem] border-t pt-5 text-center text-base leading-7"
                  style={{
                    color: "var(--fg-body)",
                    borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)",
                  }}
                >
                  <span>Already on the waitlist? Complete your reservation to purchase your name during Early Access.</span>
                  <span className="mt-1 block text-center text-base">
                    <Link
                      href="/reserve"
                      className="font-normal transition-[filter] duration-200 hover:brightness-110"
                      style={{ color: "var(--color-accent-interactive)" }}
                    >
                      Get started
                    </Link>
                  </span>
                </div>
              </div>

            </div>
          </section>
        }
      />

      <div className="min-w-0 max-w-full space-y-4">
        <section className="min-w-0 max-w-full">
          <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
            <InlineSearchField
              value={draftSearch}
              onChange={setDraftSearch}
              onSubmit={applySearch}
              variant="table"
              placeholder="Names or referral codes"
              ariaLabel="Search waitlist names or referral codes"
              searchMode={searchMode}
              onSearchModeChange={(value) => setSearchMode(value as WaitlistViewSearchMode)}
              onClear={() => {
                setDraftSearch("");
                setSearchMode("contains");
              }}
              submitDisabled={!hasSearchInput}
              showClear={hasSearchInput}
              clearAriaLabel="Clear search text"
            />
          </div>
        </section>

        {appliedSearch.trim() ? (
          <SearchResultsSummary
            query={appliedSearch}
            matchCount={isRefreshing ? null : viewData.totalCount}
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
              label: `All (${viewData.allCount})`,
              active: allActive,
              onClick: () => {
                setPage(1);
                setReservedOnly(false);
                setProtectedOnly(false);
              },
            },
            {
              key: "reserved",
              label: `Reserved only (${viewData.reservedOnlyCount})`,
              active: reservedOnly,
              onClick: () => {
                setPage(1);
                setReservedOnly(true);
                setProtectedOnly(false);
              },
            },
            {
              key: "protected",
              label: `Protected (${viewData.protectedOnlyCount})`,
              active: protectedOnly,
              onClick: () => {
                setPage(1);
                setProtectedOnly(true);
                setReservedOnly(false);
              },
            },
          ]}
          endContent={
            <>
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
            background: "var(--table-shell-bg)",
          }}
        >
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <table
                className="min-w-full w-full table-auto border-separate border-spacing-0"
                style={{ color: "var(--fg-body)" }}
              >
              <thead>
                <tr>
                  {[
                    { label: "#", info: "The verified waitlist line number in join order." },
                    {
                      label: "Adj#",
                      info: `Referral-adjusted waitlist line number. This is the original line number minus one spot for ${reservedReferralSpotPhrase("direct", viewData.referralsPerSpot)} and minus one spot for ${reservedReferralSpotPhrase("indirect", viewData.indirectReferralsPerSpot)}.`,
                    },
                    { label: "Name", info: "The waitlisted name and its referral code." },
                    { label: "Position", info: "Position among verified entries with the same name, ordered by referral-adjusted line number and then original line number as the tie-breaker." },
                    { label: "Status", info: "Protected names are held back, reserved names have paid, pending names are waiting on reservation, and available names have no current conflict or hold." },
                    { label: "Refs", info: "Reserved referral totals. When both direct and indirect counts exist, both are shown together." },
                  ].map((column, index) => (
                    <th
                      key={column.label}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] align-middle sm:px-6"
                      style={{
                        background: "var(--table-header-bg)",
                        borderBottom: "1px solid var(--faq-border)",
                        borderRight:
                          index === 5 ? "none" : "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                        color: "var(--fg-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setHeaderInfo({ title: column.label, body: column.info })}
                        className="inline-flex items-center leading-none text-[color:var(--fg-muted)] transition-colors hover:text-[var(--color-accent-interactive)]"
                        aria-label={`About ${column.label}`}
                      >
                        {column.label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadError ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-sm"
                      style={{ color: "var(--accent-red, #e05252)" }}
                    >
                      {loadError}
                    </td>
                  </tr>
                ) : null}

                {visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {isRefreshing ? "Loading waitlist names..." : "No waitlist names matched your current search."}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => {
                    const status = getStatusLabel(row);
                    const statusStyle = getStatusStyle(status);
                    return (
                      <tr
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Details for ${row.name}`}
                        onClick={() => setDetailsRow(row)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setDetailsRow(row);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_5%,transparent)]"
                      >
                        <td
                          className="px-5 py-4 text-sm sm:px-6"
                          style={{
                            borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                            borderRight: "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="font-mono font-semibold" style={{ color: "var(--fg-heading)" }}>
                            {row.basePosition}
                          </span>
                        </td>
                        <td
                          className="px-5 py-4 text-sm sm:px-6"
                          style={{
                            borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                            borderRight: "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="font-mono font-semibold" style={{ color: "var(--fg-heading)" }}>
                            {row.adjustedLineNumber}
                          </span>
                        </td>
                        <td
                          className="px-5 py-4 text-sm sm:px-6"
                          style={{
                            borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                            borderRight: "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="block" style={{ color: "var(--fg-body)" }} title={row.name}>
                            {row.name}
                          </span>
                          {row.displayReferralCode ? (
                            <span className="mt-1 block text-xs" style={{ color: "var(--fg-muted)" }} title={row.displayReferralCode}>
                              {row.displayReferralCode}
                            </span>
                          ) : null}
                        </td>
                        <td
                          className="px-5 py-4 text-sm sm:px-6"
                          style={{
                            borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                            borderRight: "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="font-mono font-semibold" style={{ color: "var(--fg-heading)" }}>
                            {row.reserved ? `${row.rankPosition} of ${row.rankTotal}` : `N/A of ${row.rankTotal}`}
                          </span>
                        </td>
                        <td
                          className="px-5 py-4 text-sm sm:px-6"
                          style={{
                            borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                            borderRight: "1px solid color-mix(in srgb, var(--faq-border) 78%, transparent)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                            style={statusStyle}
                          >
                            {status}
                          </span>
                        </td>
                        <td
                          className="px-5 py-4 text-sm sm:px-6"
                          style={{
                            borderBottom: "1px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span className="font-mono tabular-nums" style={{ color: "var(--fg-body)" }}>
                            {formatReferrals(row)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>

          {viewData.rows.length > 0 ? (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={goToPage}
              disabled={isRefreshing}
              style={{
                borderTop: "1px solid var(--faq-border)",
              }}
            />
          ) : null}

          <TableLoadingOverlay
            active={isRefreshing}
            anchorElement={tableShellRef.current}
            label="Loading waitlist..."
          />
        </div>
      </div>

      <WaitlistFaq
        maskedViewKey={maskedQueueViewKey}
        onOpenViewKey={() => setShowViewKeyModal(true)}
      />

      {showViewKeyModal ? (
        <QueueViewKeyModal value={adminWalletUivk} onClose={() => setShowViewKeyModal(false)} />
      ) : null}
      {headerInfo ? (
        <HeaderInfoModal title={headerInfo.title} body={headerInfo.body} onClose={() => setHeaderInfo(null)} />
      ) : null}
      <WaitlistNameDetailsModal
        row={detailsRow}
        isOpen={!!detailsRow}
        onClose={() => setDetailsRow(null)}
        onProtect={(row) => {
          setDetailsRow(null);
          router.push(
            `/protected/suggest?${new URLSearchParams({
              name: row.name,
            }).toString()}`,
          );
        }}
      />
    </>
  );
}

