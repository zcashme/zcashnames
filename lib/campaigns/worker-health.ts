import "server-only";

import { db } from "@/lib/db";

const DEFAULT_WORKER_KEY = "default";

export interface CampaignWorkerHealthRecord {
  worker_key: string;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_success_at: string | null;
  last_processed_at: string | null;
  last_error: string | null;
  last_campaign_id: string | null;
  last_processed_count: number;
  updated_at: string;
}

function mapWorkerHealth(
  row: Record<string, unknown>,
): CampaignWorkerHealthRecord {
  return {
    worker_key: String(row.worker_key),
    last_started_at: row.last_started_at ? String(row.last_started_at) : null,
    last_finished_at: row.last_finished_at ? String(row.last_finished_at) : null,
    last_success_at: row.last_success_at ? String(row.last_success_at) : null,
    last_processed_at: row.last_processed_at ? String(row.last_processed_at) : null,
    last_error: row.last_error ? String(row.last_error) : null,
    last_campaign_id: row.last_campaign_id ? String(row.last_campaign_id) : null,
    last_processed_count: Number(row.last_processed_count ?? 0),
    updated_at: String(row.updated_at),
  };
}

async function upsertWorkerHealth(
  patch: Record<string, string | number | null>,
): Promise<void> {
  const nowIso = new Date().toISOString();
  const { error } = await db.from("campaign_worker_health").upsert({
    worker_key: DEFAULT_WORKER_KEY,
    updated_at: nowIso,
    ...patch,
  });
  if (error) throw new Error(error.message);
}

export async function markCampaignWorkerStarted(
  campaignId: string | null,
): Promise<void> {
  const nowIso = new Date().toISOString();
  await upsertWorkerHealth({
    last_started_at: nowIso,
    last_campaign_id: campaignId,
    last_error: null,
  });
}

export async function markCampaignWorkerFinished(args: {
  campaignId: string | null;
  processedCount: number;
  successful: boolean;
  error?: string | null;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const patch: Record<string, string | number | null> = {
    last_finished_at: nowIso,
    last_campaign_id: args.campaignId,
    last_processed_count: args.processedCount,
    last_error: args.error?.trim() || null,
  };
  if (args.successful) patch.last_success_at = nowIso;
  if (args.processedCount > 0) patch.last_processed_at = nowIso;
  await upsertWorkerHealth(patch);
}

export async function getCampaignWorkerHealth(): Promise<CampaignWorkerHealthRecord | null> {
  const { data, error } = await db
    .from("campaign_worker_health")
    .select("*")
    .eq("worker_key", DEFAULT_WORKER_KEY)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapWorkerHealth(data as Record<string, unknown>) : null;
}
