import { PROTECTED_NAME_CATEGORIES } from "@/lib/protected/shared";

type SearchParamValue = string | undefined;

type WaitlistViewOgParams = {
  search?: SearchParamValue;
  searchMode?: SearchParamValue;
  details?: SearchParamValue;
  tab?: SearchParamValue;
};

type ProtectedViewOgParams = {
  search?: SearchParamValue;
  searchMode?: SearchParamValue;
  details?: SearchParamValue;
  redeemedOnly?: SearchParamValue;
  underReviewOnly?: SearchParamValue;
  rejectedOnly?: SearchParamValue;
  disputedOnly?: SearchParamValue;
  categoryOnly?: SearchParamValue;
  ensOnly?: SearchParamValue;
  zmOnly?: SearchParamValue;
};

const SITE_URL = "https://www.zcashnames.com";
const MAX_PILL_TEXT_LENGTH = 52;

function cleanValue(value: SearchParamValue): string {
  return (value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
}

function truncatePillText(value: string): string {
  if (value.length <= MAX_PILL_TEXT_LENGTH) return value;
  return `${value.slice(0, MAX_PILL_TEXT_LENGTH - 3).trimEnd()}...`;
}

function safePillText(value: string | null): string | null {
  const cleaned = cleanValue(value ?? undefined);
  if (!cleaned) return null;
  return truncatePillText(cleaned);
}

function isTruthyParam(value: SearchParamValue): boolean {
  return value === "1" || value === "true";
}

function hasDetails(value: SearchParamValue): boolean {
  return isTruthyParam(value) || cleanValue(value).length > 0;
}

function formatCategoryLabel(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function withPill(imagePath: string, pillText: string | null): string {
  if (!pillText) return imagePath;
  const params = new URLSearchParams({ pill: pillText });
  return `${imagePath}?${params.toString()}`;
}

function tableUrl(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return `${SITE_URL}${path}${query ? `?${query}` : ""}`;
}

function addSearchParams(params: URLSearchParams, args: { search?: string; searchMode?: string }) {
  if (!args.search) return;
  params.set("search", args.search);
  if (args.searchMode === "exact" || args.searchMode === "contains") {
    params.set("searchMode", args.searchMode);
  }
}

function waitlistContextLabel(tab: SearchParamValue): string | null {
  if (tab === "reserved") return "Reserved";
  if (tab === "protected") return "Protected";
  return null;
}

export function buildWaitlistViewOgMetadata(params: WaitlistViewOgParams) {
  const search = cleanValue(params.search);
  const tabLabel = waitlistContextLabel(params.tab);
  const urlParams = new URLSearchParams();

  if (params.tab === "reserved" || params.tab === "protected") {
    urlParams.set("tab", params.tab);
  }
  addSearchParams(urlParams, { search, searchMode: params.searchMode });
  if (search && hasDetails(params.details)) {
    urlParams.set("details", "1");
  }

  const pillText = safePillText(
    search && hasDetails(params.details)
      ? `Details: ${search}`
      : search
        ? `${tabLabel ? `${tabLabel} search` : "Search"}: ${search}`
        : tabLabel
          ? `${tabLabel} names`
          : null,
  );

  return {
    pageUrl: tableUrl("/waitlist/view", urlParams),
    imageUrl: withPill("/og/waitlist-view.png", pillText),
  };
}

function protectedContextLabel(params: ProtectedViewOgParams): string | null {
  if (isTruthyParam(params.redeemedOnly)) return "Redeemed";
  if (isTruthyParam(params.underReviewOnly)) return "Under review";
  if (isTruthyParam(params.rejectedOnly)) return "Rejected";
  if (isTruthyParam(params.disputedOnly)) return "Disputed";
  if (
    params.categoryOnly
    && PROTECTED_NAME_CATEGORIES.includes(params.categoryOnly as (typeof PROTECTED_NAME_CATEGORIES)[number])
  ) {
    return formatCategoryLabel(params.categoryOnly);
  }
  if (isTruthyParam(params.ensOnly)) return "ENS priority";
  if (isTruthyParam(params.zmOnly)) return "Zcash.me priority";
  return null;
}

function appendProtectedFilterParams(urlParams: URLSearchParams, params: ProtectedViewOgParams) {
  if (isTruthyParam(params.redeemedOnly)) {
    urlParams.set("redeemedOnly", "true");
    return;
  }
  if (isTruthyParam(params.underReviewOnly)) {
    urlParams.set("underReviewOnly", "true");
    return;
  }
  if (isTruthyParam(params.rejectedOnly)) {
    urlParams.set("rejectedOnly", "true");
    return;
  }
  if (isTruthyParam(params.disputedOnly)) {
    urlParams.set("disputedOnly", "true");
    return;
  }
  if (
    params.categoryOnly
    && PROTECTED_NAME_CATEGORIES.includes(params.categoryOnly as (typeof PROTECTED_NAME_CATEGORIES)[number])
  ) {
    urlParams.set("categoryOnly", params.categoryOnly);
    return;
  }
  if (isTruthyParam(params.ensOnly)) {
    urlParams.set("ensOnly", "true");
    return;
  }
  if (isTruthyParam(params.zmOnly)) {
    urlParams.set("zmOnly", "true");
  }
}

export function buildProtectedViewOgMetadata(params: ProtectedViewOgParams) {
  const search = cleanValue(params.search);
  const contextLabel = protectedContextLabel(params);
  const urlParams = new URLSearchParams();

  appendProtectedFilterParams(urlParams, params);
  addSearchParams(urlParams, { search, searchMode: params.searchMode });
  if (search && hasDetails(params.details)) {
    urlParams.set("details", "1");
  }

  const pillText = safePillText(
    search && hasDetails(params.details)
      ? `Details: ${search}`
      : search
        ? `${contextLabel ? `${contextLabel} search` : "Search"}: ${search}`
        : contextLabel
          ? `${contextLabel} names`
          : null,
  );

  return {
    pageUrl: tableUrl("/protected", urlParams),
    imageUrl: withPill("/og/protected.png", pillText),
  };
}
