import "server-only";

import { db } from "@/lib/db";
import { getCampaignSeriesOptions } from "@/lib/campaigns/series";

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(
    [...values]
      .map((value) => value.trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
}

export async function listDistinctSubscriberSeries(): Promise<string[]> {
  const { data, error } = await db
    .from("email_subscribers")
    .select("series")
    .not("series", "is", null);
  if (error) throw new Error(error.message);

  const dbSeries = ((data ?? []) as Array<{ series?: string | null }>)
    .map((row) => row.series?.trim())
    .filter((series): series is string => Boolean(series));

  return uniqueSorted([...getCampaignSeriesOptions(), ...dbSeries]);
}

export async function listDistinctSubscriberSeriesWithToken(
  tokenSeries?: string | null,
): Promise<string[]> {
  const series = await listDistinctSubscriberSeries();
  const normalizedTokenSeries = tokenSeries?.trim();
  if (!normalizedTokenSeries) return series;
  if (series.includes(normalizedTokenSeries)) return series;
  return uniqueSorted([...series, normalizedTokenSeries]);
}
