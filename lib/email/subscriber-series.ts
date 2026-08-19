import "server-only";

import { getCampaignSeriesOptions } from "@/lib/campaigns/series";
import { WAITLIST_CAMPAIGN_SERIES } from "@/lib/campaigns/types";

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(
    [...values]
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

export async function listDistinctSubscriberSeries(): Promise<string[]> {
  return uniqueSorted([...getCampaignSeriesOptions(), WAITLIST_CAMPAIGN_SERIES]);
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
