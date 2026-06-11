export type FeedbackProgram = "v1" | "v2";

export interface FeedbackRow {
  id: string;
  created_at: string;
  tester_id: string | null;
  tester_name_snapshot: string;
  beta_version: FeedbackProgram;
  stage: "testnet" | "mainnet";
  item_id: string | null;
  severity: "high" | "low" | "none";
  experience_rating: number | null;
  wallet: string | null;
  wallet_variant_id: string | null;
  steps: string | null;
  expected: string | null;
  actual: string | null;
  txid: string | null;
  notes: string | null;
  screenshot_paths: string[];
  user_agent: string | null;
  client_env: string | null;
}

export interface FeedbackStats {
  totalSubmissions: number;
  uniqueTesters: number;
  avgRating: number | null;
  highSeverity: number;
  testnet: number;
  mainnet: number;
  v1: number;
  v2: number;
}

export interface ChecklistCountEntry {
  count: number;
  ratingSum: number;
  ratingCount: number;
}

export interface RatingBoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface RatingPlotPoint {
  id: string;
  testerName: string;
  rating: number;
  category: string;
}

export interface WalletVariantCount {
  walletVariantId: string | null;
  count: number;
}

function normalizeProgram(value: unknown): FeedbackProgram {
  return value === "v2" ? "v2" : "v1";
}

function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
}

export async function getAllFeedback(): Promise<FeedbackRow[]> {
  const { db } = await import("@/lib/db");
  const { data, error } = await db
    .from("beta_feedback")
    .select(
      "id, created_at, tester_id, tester_name_snapshot, beta_version, stage, item_id, severity, experience_rating, wallet, wallet_variant_id, steps, expected, actual, txid, notes, screenshot_paths, user_agent, client_env",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    created_at: row.created_at as string,
    tester_id: (row.tester_id as string | null) ?? null,
    tester_name_snapshot: (row.tester_name_snapshot as string) ?? "anonymous",
    beta_version: normalizeProgram(row.beta_version),
    stage: row.stage === "testnet" ? "testnet" : "mainnet",
    item_id: (row.item_id as string | null) ?? null,
    severity: row.severity === "high" || row.severity === "low" ? row.severity : "none",
    experience_rating:
      typeof row.experience_rating === "number" ? row.experience_rating : null,
    wallet: (row.wallet as string | null) ?? null,
    wallet_variant_id: (row.wallet_variant_id as string | null) ?? null,
    steps: (row.steps as string | null) ?? null,
    expected: (row.expected as string | null) ?? null,
    actual: (row.actual as string | null) ?? null,
    txid: (row.txid as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    screenshot_paths: Array.isArray(row.screenshot_paths)
      ? row.screenshot_paths.filter((value): value is string => typeof value === "string")
      : [],
    user_agent: (row.user_agent as string | null) ?? null,
    client_env: (row.client_env as string | null) ?? null,
  }));
}

export function computeStats(rows: FeedbackRow[]): FeedbackStats {
  const ratings = rows
    .map((row) => row.experience_rating)
    .filter((rating): rating is number => rating !== null);
  const uniqueTesters = new Set(
    rows.map((row) => row.tester_id || `snapshot:${row.tester_name_snapshot}`),
  ).size;

  return {
    totalSubmissions: rows.length,
    uniqueTesters,
    avgRating:
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null,
    highSeverity: rows.filter((row) => row.severity === "high").length,
    testnet: rows.filter((row) => row.stage === "testnet").length,
    mainnet: rows.filter((row) => row.stage === "mainnet").length,
    v1: rows.filter((row) => row.beta_version === "v1").length,
    v2: rows.filter((row) => row.beta_version === "v2").length,
  };
}

export function countByChecklistItem(rows: FeedbackRow[]): Map<string, ChecklistCountEntry> {
  const counts = new Map<string, ChecklistCountEntry>();
  for (const row of rows) {
    if (!row.item_id) continue;
    const existing = counts.get(row.item_id) ?? { count: 0, ratingSum: 0, ratingCount: 0 };
    existing.count += 1;
    if (row.experience_rating !== null) {
      existing.ratingSum += row.experience_rating;
      existing.ratingCount += 1;
    }
    counts.set(row.item_id, existing);
  }
  return counts;
}

export function computeRatingBoxPlot(rows: FeedbackRow[]): RatingBoxPlotStats | null {
  const ratings = rows
    .map((row) => row.experience_rating)
    .filter((rating): rating is number => rating !== null)
    .sort((a, b) => a - b);
  if (ratings.length === 0) return null;

  return {
    min: ratings[0],
    q1: quantile(ratings, 0.25),
    median: quantile(ratings, 0.5),
    q3: quantile(ratings, 0.75),
    max: ratings[ratings.length - 1],
  };
}

export function buildRatingPlotPoints(
  rows: FeedbackRow[],
  categorize: (itemId: string | null, row: FeedbackRow) => string,
): RatingPlotPoint[] {
  return rows
    .filter((row): row is FeedbackRow & { experience_rating: number } => row.experience_rating !== null)
    .map((row) => ({
      id: row.id,
      testerName: row.tester_name_snapshot,
      rating: row.experience_rating,
      category: categorize(row.item_id, row),
    }));
}

export function countByWalletVariant(rows: FeedbackRow[]): WalletVariantCount[] {
  const counts = new Map<string | null, number>();
  for (const row of rows) {
    if (row.beta_version !== "v2") continue;
    const key = row.wallet_variant_id ?? null;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([walletVariantId, count]) => ({ walletVariantId, count }))
    .sort((a, b) => b.count - a.count || (a.walletVariantId ?? "").localeCompare(b.walletVariantId ?? ""));
}
