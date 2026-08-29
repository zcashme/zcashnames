"use server";

import { createOrLoadEnsOutreachBatch, generateEnsOutreachStaticImage, prepareEnsOutreachItems } from "@/lib/ens-outreach/workflow";
import { updateEnsOutreachItem } from "@/lib/ens-outreach/store";
import type { EnsOutreachBatch } from "@/lib/ens-outreach/types";

type Result = { ok: true; batch: EnsOutreachBatch } | { ok: false; error: string };
async function result(action: () => Promise<EnsOutreachBatch>): Promise<Result> {
  try { return { ok: true, batch: await action() }; }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}

export async function createEnsOutreachBatchAction(force = false): Promise<Result> { return result(() => createOrLoadEnsOutreachBatch(force)); }
export async function prepareEnsOutreachItemsAction(batchId: string): Promise<Result> { return result(() => prepareEnsOutreachItems(batchId)); }
export async function generateEnsOutreachStaticImageAction(itemId: string): Promise<Result> { return result(() => generateEnsOutreachStaticImage(itemId)); }
export async function updateEnsOutreachItemAction(id: string, values: { draftText?: string; targetTweetUrl?: string | null; status?: "rejected" | "sent"; reviewReason?: string | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const statusValues = values.status === "rejected" ? { status: "reviewed", reviewed_at: new Date().toISOString() } : values.status === "sent" ? { status: "sent", sent_at: new Date().toISOString() } : {};
    const valuesWithReason = {
      ...(values.draftText !== undefined ? { draft_text: values.draftText } : {}),
      ...(values.targetTweetUrl !== undefined ? { target_tweet_url: values.targetTweetUrl || null } : {}),
      ...(values.reviewReason !== undefined ? { review_reason: values.reviewReason || null } : {}),
      ...statusValues,
    };
    try { await updateEnsOutreachItem(id, valuesWithReason); }
    catch (error) {
      // Older installations may not yet have the optional review_reason column.
      if (!values.status || !/review_reason|rejected_at/i.test(error instanceof Error ? error.message : String(error))) throw error;
      await updateEnsOutreachItem(id, { ...statusValues, ...(values.draftText !== undefined ? { draft_text: values.draftText } : {}), ...(values.targetTweetUrl !== undefined ? { target_tweet_url: values.targetTweetUrl || null } : {}) });
    }
    return { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}
