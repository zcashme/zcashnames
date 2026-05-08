"use server";

import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { Network } from "@/lib/types";
import {
  BETA_COOKIE_NAME,
  BETA_STAGE_COOKIE_NAME,
  betaCookieOptions,
  readCurrentStage,
  readCurrentTester,
  setStageCookie,
} from "./gate";

const FEEDBACK_BUCKET = "beta-feedback";

// ---------------------------------------------------------------------------
// Beta gate session helpers.
// ---------------------------------------------------------------------------

export async function signOutBetaTester(): Promise<{ ok: true }> {
  const store = await cookies();
  store.set(BETA_COOKIE_NAME, "", betaCookieOptions(0));
  store.set(BETA_STAGE_COOKIE_NAME, "", betaCookieOptions(0));
  return { ok: true };
}

export async function switchToNetwork(network: Network): Promise<void> {
  await setStageCookie(network);
}

export async function clearStageCookie(): Promise<void> {
  const store = await cookies();
  store.set(BETA_STAGE_COOKIE_NAME, "", betaCookieOptions(0));
}

export async function getCurrentTesterName(): Promise<string | null> {
  const tester = await readCurrentTester();
  return tester?.displayName ?? null;
}

export async function getCurrentBetaStage(): Promise<"testnet" | "mainnet" | null> {
  return readCurrentStage();
}

export async function getCurrentTesterFocus(): Promise<("user" | "sdk")[]> {
  const tester = await readCurrentTester();
  if (!tester) return [];
  const { data, error } = await db
    .from("beta_testers")
    .select("focus_areas")
    .eq("id", tester.id)
    .maybeSingle();
  if (error || !data?.focus_areas) return [];
  const raw = data.focus_areas as unknown[];
  return raw.filter((v): v is "user" | "sdk" => v === "user" || v === "sdk");
}

// ---------------------------------------------------------------------------

export interface FeedbackPayload {
  severity: "high" | "low" | "none";
  experienceRating?: number | null;
  wallet: string;
  network: "testnet" | "mainnet";
  steps: string;
  expected: string;
  actual: string;
  txid?: string;
  notes?: string;
}

export type FeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_FIELD_LEN = 4000;
const MAX_SCREENSHOTS = 5;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  // Strip path separators + anything weird, keep extension.
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
}

export async function submitBetaFeedback(formData: FormData): Promise<FeedbackResult> {
  const tester = await readCurrentTester();
  const testerId = tester?.id ?? null;
  const testerName = tester?.displayName ?? "anonymous";

  const reqHeaders = await headers();
  const userAgent = reqHeaders.get("user-agent")?.slice(0, 500) ?? null;

  const severity = String(formData.get("severity") ?? "");
  const wallet = String(formData.get("wallet") ?? "").trim();
  const network = String(formData.get("network") ?? "");
  const steps = String(formData.get("steps") ?? "").trim();
  const expected = String(formData.get("expected") ?? "").trim();
  const actual = String(formData.get("actual") ?? "").trim();
  const txid = String(formData.get("txid") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const experienceRatingRaw = String(formData.get("experience_rating") ?? "").trim();
  const checklistItemId = String(formData.get("checklistItemId") ?? "").trim().slice(0, 64);
  const clientEnv = String(formData.get("client_env") ?? "").trim().slice(0, 200);
  const experienceRating = experienceRatingRaw ? Number(experienceRatingRaw) : null;

  if (severity !== "high" && severity !== "low" && severity !== "none") {
    return { ok: false, error: "Pick a severity." };
  }
  if (network !== "testnet" && network !== "mainnet") {
    return { ok: false, error: "Pick a network." };
  }
  if (
    experienceRating !== null &&
    (!Number.isInteger(experienceRating) || experienceRating < 1 || experienceRating > 5)
  ) {
    return { ok: false, error: "Pick a rating from 1 to 5." };
  }
  for (const [k, v] of [["wallet", wallet], ["steps", steps], ["expected", expected], ["actual", actual], ["txid", txid], ["notes", notes]] as const) {
    if (v.length > MAX_FIELD_LEN) return { ok: false, error: `${k} is too long.` };
  }

  const hasMinimumContent = !!notes || experienceRating !== null || !!expected || !!actual;
  if (!hasMinimumContent) {
    return {
      ok: false,
      error: "Add notes, a rating, expected behavior, or actual behavior before submitting.",
    };
  }

  const validFiles: File[] = [];
  const rawFiles = formData.getAll("screenshots");
  if (rawFiles.length > MAX_SCREENSHOTS) {
    return { ok: false, error: `Up to ${MAX_SCREENSHOTS} screenshots.` };
  }
  for (const f of rawFiles) {
    if (!(f instanceof File)) continue;
    if (f.size === 0) continue;
    if (!f.type.startsWith("image/")) {
      return { ok: false, error: "Screenshots must be images." };
    }
    if (f.size > MAX_SCREENSHOT_BYTES) {
      return { ok: false, error: "Each screenshot must be under 5 MB." };
    }
    validFiles.push(f);
  }

  // Allocate a UUID up front so screenshot paths can use it as a folder.
  const reportId = randomUUID();
  const screenshotPaths: string[] = [];
  const screenshotUrls: string[] = [];

  for (const f of validFiles) {
    const path = `${testerId ?? "anonymous"}/${reportId}/${sanitizeFilename(f.name)}`;
    const { error: uploadError } = await db.storage
      .from(FEEDBACK_BUCKET)
      .upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type,
      });
    if (uploadError) {
      console.error("[beta-feedback] storage upload failed:", uploadError);
      return { ok: false, error: "Couldn't upload a screenshot. Try again." };
    }
    screenshotPaths.push(path);
    const { data } = db.storage.from(FEEDBACK_BUCKET).getPublicUrl(path);
    screenshotUrls.push(data.publicUrl);
  }

  const { error: insertError } = await db.from("beta_feedback").insert({
    id: reportId,
    tester_id: testerId,
    tester_name_snapshot: testerName,
    stage: network,
    item_id: checklistItemId || null,
    severity,
    experience_rating: experienceRating,
    wallet: wallet || null,
    steps: steps || null,
    expected: expected || null,
    actual: actual || null,
    txid: txid || null,
    notes: notes || null,
    screenshot_paths: screenshotUrls,
    user_agent: userAgent,
    client_env: clientEnv || null,
  });

  if (insertError) {
    console.error("[beta-feedback] insert failed:", insertError);
    // Best-effort cleanup of any uploaded screenshots so we don't leak orphans.
    if (screenshotPaths.length > 0) {
      await db.storage.from(FEEDBACK_BUCKET).remove(screenshotPaths).catch(() => {});
    }
    return { ok: false, error: "Couldn't save your report. Try again." };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Checklist progress — fired on every tick toggle. Anonymous testers get
// localStorage-only persistence (early return).
// ---------------------------------------------------------------------------

export interface ChecklistProgressInput {
  stage: "testnet" | "mainnet";
  itemId: string;
  completed: boolean;
}

export async function saveChecklistProgress(
  input: ChecklistProgressInput,
): Promise<{ ok: true }> {
  const tester = await readCurrentTester();
  if (!tester) return { ok: true };

  const itemId = String(input.itemId ?? "").slice(0, 64);
  if (!itemId) return { ok: true };
  if (input.stage !== "testnet" && input.stage !== "mainnet") return { ok: true };

  const { error } = await db
    .from("beta_checklist_progress")
    .upsert(
      {
        tester_id: tester.id,
        stage: input.stage,
        item_id: itemId,
        completed: !!input.completed,
      },
      { onConflict: "tester_id,stage,item_id" },
    );

  if (error) {
    console.error("[beta-checklist] upsert failed:", error);
  }

  return { ok: true };
}

/** Load the current tester's progress for a given stage. Anonymous → empty. */
export async function loadChecklistProgress(
  stage: "testnet" | "mainnet",
): Promise<Record<string, boolean>> {
  const tester = await readCurrentTester();
  if (!tester) return {};
  if (stage !== "testnet" && stage !== "mainnet") return {};

  const { data, error } = await db
    .from("beta_checklist_progress")
    .select("item_id, completed")
    .eq("tester_id", tester.id)
    .eq("stage", stage);

  if (error) {
    console.error("[beta-checklist] load failed:", error);
    return {};
  }

  const out: Record<string, boolean> = {};
  for (const row of data ?? []) {
    out[row.item_id as string] = !!row.completed;
  }
  return out;
}

