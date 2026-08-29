import "server-only";

import { db } from "@/lib/db";
import type { EnsOutreachBatch, EnsOutreachItem, EnsOutreachStatus } from "./types";

const SETUP_HINT = "Apply sql/2026-08-25-ens-outreach.sql in Supabase, then retry.";

type QueueRow = {
  id: string; batch_id: string; queue_order: number; name: string; normalized_name: string; x_username: string; follower_count: number; source_reason: string; source_evidence: string;
  protected_url: string; draft_text: string; lookup_status: EnsOutreachItem["lookupStatus"]; target_tweet_id: string | null; target_tweet_url: string | null;
  target_tweet_text: string | null; png_url: string | null; status: string; error: string | null;
  reviewed_at: string | null; review_reason: string | null; sent_at: string | null; updated_at: string | null;
};

function setupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /ens_outreach/.test(message) ? `${message} ${SETUP_HINT}` : message;
}

function canonicalProtectedUrl(name: string) {
  return `https://zcashnames.com/protected?search=${encodeURIComponent(name)}&searchMode=exact&details=1`;
}

function mapItem(row: QueueRow): EnsOutreachItem {
  const protectedUrl = canonicalProtectedUrl(row.name);
  return {
    id: row.id, batchId: row.batch_id, queueOrder: row.queue_order, name: row.name, normalizedName: row.normalized_name,
    xUsername: row.x_username, followerCount: row.follower_count, sourceReason: row.source_reason, sourceEvidence: row.source_evidence, protectedUrl, draftText: row.draft_text.replace(/https?:\/\/[^\s]+\/protected\?[^\s]+/, protectedUrl),
    lookupStatus: row.lookup_status, targetTweetId: row.target_tweet_id, targetTweetUrl: row.target_tweet_url,
    targetTweetText: row.target_tweet_text, pngUrl: row.png_url, status: (row.status === "reviewed" ? "rejected" : row.status) as EnsOutreachStatus,
    error: row.error, rejectedAt: row.reviewed_at, reviewReason: row.review_reason, sentAt: row.sent_at, updatedAt: row.updated_at,
  };
}

export async function getLatestEnsOutreachBatch(): Promise<EnsOutreachBatch | null> {
  const { data: batch, error } = await db.from("ens_outreach_batches").select("id, total_items, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(setupError(error));
  if (!batch) return null;
  const { data, error: queueError } = await db.from("ens_outreach_queue").select("*").eq("batch_id", batch.id).order("queue_order");
  if (queueError) throw new Error(setupError(queueError));
  return { id: batch.id as string, totalItems: batch.total_items as number, createdAt: batch.created_at as string, items: ((data ?? []) as QueueRow[]).map(mapItem) };
}

export async function createEnsOutreachBatch(items: Array<Omit<EnsOutreachItem, "id" | "batchId" | "status" | "error" | "rejectedAt" | "reviewReason" | "sentAt" | "updatedAt" | "targetTweetId" | "targetTweetUrl" | "targetTweetText" | "pngUrl">>): Promise<EnsOutreachBatch> {
  const { data: batch, error } = await db.from("ens_outreach_batches").insert({ total_items: items.length }).select("id, total_items, created_at").single();
  if (error) throw new Error(setupError(error));
  if (items.length) {
    const { error: queueError } = await db.from("ens_outreach_queue").insert(items.map((item) => ({
      batch_id: batch.id, queue_order: item.queueOrder, name: item.name, normalized_name: item.normalizedName, x_username: item.xUsername,
      follower_count: item.followerCount, source_reason: item.sourceReason, source_evidence: item.sourceEvidence, protected_url: item.protectedUrl, draft_text: item.draftText, lookup_status: "pending", status: "pending",
    })));
    if (queueError) throw new Error(setupError(queueError));
  }
  return (await getLatestEnsOutreachBatch())!;
}

export async function updateEnsOutreachItem(id: string, values: Record<string, unknown>): Promise<void> {
  const { error } = await db.from("ens_outreach_queue").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(setupError(error));
}
