import "server-only";

import fs from "node:fs";
import path from "node:path";

const MAIN_ROOT = path.resolve(process.cwd(), "..", "dotzcash_main");
const FALLBACK_CAMPAIGN_SERIES = ["general", "builders", "updates", "launch"] as const;

function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function extractConstArrayStrings(source: string, constName: string): string[] {
  const pattern = new RegExp(`${constName}\\s*=\\s*\\[([^\\]]*)\\]`, "s");
  const match = source.match(pattern);
  if (!match) return [];
  return [...match[1].matchAll(/"([a-z0-9_-]+)"/gi)].map((item) => item[1]);
}

function extractSlugProperties(source: string): string[] {
  return [...source.matchAll(/slug:\s*"([a-z0-9_-]+)"/gi)].map((match) => match[1]);
}

function unique(values: Iterable<string>): string[] {
  return [...new Set([...values].map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export function getCampaignSeriesOptions(): string[] {
  const subscriptionSource = readFile(
    path.join(MAIN_ROOT, "lib", "email", "subscription-series.ts"),
  );
  const blogSource = readFile(path.join(MAIN_ROOT, "lib", "blog-series.ts"));
  const subscriptionSeries = extractConstArrayStrings(
    subscriptionSource,
    "EMAIL_SUBSCRIPTION_SERIES",
  );
  const blogSeries = extractSlugProperties(blogSource);

  const merged = unique([
    ...subscriptionSeries,
    ...blogSeries,
    ...FALLBACK_CAMPAIGN_SERIES,
  ]).filter((value) => /^[a-z][a-z0-9_-]*$/.test(value));

  const preferredOrder = new Map<string, number>(
    FALLBACK_CAMPAIGN_SERIES.map((value, index) => [value, index]),
  );

  return merged.sort((a, b) => {
    const aRank = preferredOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bRank = preferredOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
}

export function getDefaultCampaignSeries(): string {
  return getCampaignSeriesOptions()[0] ?? "general";
}

export function isSupportedCampaignSeries(value: string): boolean {
  return getCampaignSeriesOptions().includes(value.trim().toLowerCase());
}
