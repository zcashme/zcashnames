import "server-only";

import { BLOG_SUBSCRIPTION_OPTIONS } from "@/lib/blog-series";
import { EMAIL_SUBSCRIPTION_SERIES } from "@/lib/email/subscription-series";

function uniqueInOrder(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function getCanonicalSubscriberSeries(): string[] {
  return uniqueInOrder([
    ...EMAIL_SUBSCRIPTION_SERIES,
    ...BLOG_SUBSCRIPTION_OPTIONS.map((option) => option.slug),
  ]);
}

export async function listDistinctSubscriberSeries(): Promise<string[]> {
  return uniqueInOrder(getCanonicalSubscriberSeries());
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
  return uniqueInOrder([...series, canonicalTokenSeries]);
}
