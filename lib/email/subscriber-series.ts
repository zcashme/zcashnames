import "server-only";

import { BLOG_SUBSCRIPTION_OPTIONS } from "@/lib/blog-series";
import { db } from "@/lib/db";
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
  const { data, error } = await db
    .from("email_subscribers")
    .select("series")
    .not("series", "is", null);
  if (error) throw new Error(error.message);

  const dbSeries = ((data ?? []) as Array<{ series?: string | null }>)
    .map((row) => row.series?.trim())
    .filter((series): series is string => Boolean(series));

  return uniqueSorted([...getCanonicalSubscriberSeries(), ...dbSeries]);
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
