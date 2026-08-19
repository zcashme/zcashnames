import "server-only";

import { BLOG_SUBSCRIPTION_OPTIONS } from "@/lib/blog-series";
import { EMAIL_SUBSCRIPTION_SERIES } from "@/lib/email/subscription-series";

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(
    [...values]
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

function getCanonicalSubscriberSeries(): string[] {
  return uniqueSorted([
    ...EMAIL_SUBSCRIPTION_SERIES,
    ...BLOG_SUBSCRIPTION_OPTIONS.map((option) => option.slug),
  ]);
}

export async function listDistinctSubscriberSeries(): Promise<string[]> {
  return uniqueSorted(getCanonicalSubscriberSeries());
}

export async function listDistinctSubscriberSeriesWithToken(
  tokenSeries?: string | null,
): Promise<string[]> {
  const series = await listDistinctSubscriberSeries();
  const normalizedTokenSeries = tokenSeries?.trim().toLowerCase();
  if (!normalizedTokenSeries) return series;
  const canonicalTokenSeries =
    normalizedTokenSeries === "launch"
      ? "users"
      : normalizedTokenSeries === "updates"
        ? "waitlist"
        : normalizedTokenSeries;
  if (series.includes(canonicalTokenSeries)) return series;
  return uniqueSorted([...series, canonicalTokenSeries]);
}
