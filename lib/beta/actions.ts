"use server";

import { cookies, headers } from "next/headers";
import { createHash, randomBytes, randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { Network } from "@/lib/zns/name";
import { findTesterByCode } from "./testers";
import {
  BETA_COOKIE_NAME,
  BETA_STAGE_COOKIE_NAME,
  betaCookieOptions,
  buildBetaCookieValue,
  readCurrentStage,
  readCurrentTester,
  setStageCookie,
} from "./gate";
import { sendBetaApplicationNotice } from "@/lib/email/beta-application";

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

async function setTesterCookie(testerId: string) {
  const { value, expiresAt } = buildBetaCookieValue(testerId);
  const store = await cookies();
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);
  store.set(BETA_COOKIE_NAME, value, betaCookieOptions(maxAge));
}

// ---------------------------------------------------------------------------
// Network access — checked from StatusToggle. Accepts EITHER:
//   1. The plaintext network password (MAINNET_PASSWORD/TESTNET_PASSWORD env)
//      → returns { ok: true, attributedTo: null }  (anonymous tester)
//   2. A beta tester's invite code
//      → sets the zn_beta cookie, returns { ok: true, attributedTo: name }
//
// Either path also stamps the zn_beta_stage cookie so the standalone feedback
// window knows which stage to log against. One code unlocks BOTH networks.
// ---------------------------------------------------------------------------

export type NetworkAccessResult =
  | { ok: true; attributedTo: string | null }
  | { ok: false; error: string };

export async function verifyNetworkAccess(
  network: Network,
  password: string,
): Promise<NetworkAccessResult> {
  const trimmed = (password ?? "").trim();
  if (!trimmed) return { ok: false, error: "Password required." };

  // 1. Beta invite code path (sets attribution cookie).
  const tester = await findTesterByCode(trimmed);
  if (tester) {
    await setTesterCookie(tester.id);
    await setStageCookie(network);
    // Fire-and-forget status flip: applied|invited → active. Never overwrites
    // an existing activated_at, never re-flips revoked rows (the lookup
    // already filters revoked).
    db.from("beta_testers")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", tester.id)
      .in("status", ["applied", "invited"])
      .then((r) => {
        if (r.error) console.error("[beta] status flip failed:", r.error);
      });
    return { ok: true, attributedTo: tester.displayName };
  }

  // 2. Plain network password path (anonymous).
  const expected =
    network === "mainnet" ? process.env.MAINNET_PASSWORD : process.env.TESTNET_PASSWORD;
  if (expected && trimmed === expected) {
    await setStageCookie(network);
    return { ok: true, attributedTo: null };
  }

  return { ok: false, error: "Incorrect password." };
}

/** Read the current tester's display name from the cookie, or null. */
export async function getCurrentTesterName(): Promise<string | null> {
  const tester = await readCurrentTester();
  return tester?.displayName ?? null;
}

/** Read the current beta stage from the 30-day stage cookie, or null. */
export async function getCurrentBetaStage(): Promise<"testnet" | "mainnet" | null> {
  return readCurrentStage();
}

/**
 * Read the current tester's stated focus areas from beta_testers.focus_areas.
 * Anonymous testers (no cookie) → empty array.
 */
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
// Feedback submission — allows anonymous submissions (no cookie).
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

// ---------------------------------------------------------------------------
// Public beta application — anyone can submit. Generates an invite code at
// submission time and inserts a row with status='applied'. The admin (you)
// reviews rows in the Supabase table editor and DMs the code to chosen
// applicants. The applicant never sees the code in the response.
// ---------------------------------------------------------------------------

const CONTACT_KINDS = ["email", "signal", "discord", "x", "telegram", "forum"] as const;
type ContactKind = (typeof CONTACT_KINDS)[number];

export type BetaApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

const APP_MAX_NAME = 60;
const APP_MIN_WHY = 20;
const APP_MAX_WHY = 2000;
const APP_MAX_TEXT = 2000;
const APP_MAX_CONTACT = 200;

function slugifyId(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const suffix = randomBytes(3).toString("hex");
  return `tester_${slug || "anon"}_${suffix}`;
}

function generateInviteCode(): string {
  // 12 url-safe chars (~72 bits of entropy). Plenty for a closed beta.
  return randomBytes(9).toString("base64url");
}

function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const secret = process.env.BETA_GATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
}

async function readClientMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : h.get("x-real-ip");
  const userAgent = h.get("user-agent");
  return { ip: ip || null, userAgent: userAgent || null };
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function submitBetaApplication(
  formData: FormData,
): Promise<BetaApplicationResult> {
  // Required fields
  const displayName = String(formData.get("display_name") ?? "").trim();
  const why = String(formData.get("why") ?? "").trim();
  const focusRaw = String(formData.get("focus_areas") ?? "").trim();
  const focusAreas: ("user" | "sdk")[] = focusRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is "user" | "sdk" => s === "user" || s === "sdk");
  const experience = String(formData.get("experience") ?? "").trim();
  const referralSource = String(formData.get("referral_source") ?? "").trim();

  if (!displayName) return { ok: false, error: "Display name is required." };
  if (displayName.length > APP_MAX_NAME) return { ok: false, error: "Display name is too long." };
  if (!why) return { ok: false, error: "Tell us why you want to join." };
  if (why.length < APP_MIN_WHY) {
    return { ok: false, error: `Please write at least ${APP_MIN_WHY} characters about why you want to join.` };
  }
  if (why.length > APP_MAX_WHY) return { ok: false, error: "Why field is too long." };
  if (focusAreas.length === 0) {
    return { ok: false, error: "Pick at least one thing you want to test." };
  }
  for (const [k, v] of [["experience", experience], ["referral_source", referralSource]] as const) {
    if (v.length > APP_MAX_TEXT) return { ok: false, error: `${k} is too long.` };
  }

  // Contacts (one column per kind, plus a best_contact_kind enum)
  const contacts: Record<ContactKind, string> = {
    email: "",
    signal: "",
    discord: "",
    x: "",
    telegram: "",
    forum: "",
  };
  for (const kind of CONTACT_KINDS) {
    const v = String(formData.get(`contact_${kind}`) ?? "").trim();
    if (v.length > APP_MAX_CONTACT) {
      return { ok: false, error: `${kind} contact is too long.` };
    }
    contacts[kind] = v;
  }
  if (contacts.email && !isValidEmail(contacts.email)) {
    return { ok: false, error: "Email address is not valid." };
  }

  const filledKinds = CONTACT_KINDS.filter((k) => contacts[k].length > 0);
  if (filledKinds.length === 0) {
    return { ok: false, error: "Add at least one contact method." };
  }

  let bestContactKind = String(formData.get("best_contact_kind") ?? "").trim() as ContactKind | "";
  if (filledKinds.length === 1) {
    bestContactKind = filledKinds[0];
  } else if (!bestContactKind || !filledKinds.includes(bestContactKind as ContactKind)) {
    return { ok: false, error: "Pick which contact you'd like us to use." };
  }

  // Generate id + code
  const testerId = slugifyId(displayName);
  const inviteCode = generateInviteCode();
  const codeHash = hashInviteCode(inviteCode);

  const submittedAtIso = new Date().toISOString();
  const { ip, userAgent } = await readClientMeta();

  const { error: insertError } = await db.from("beta_testers").insert({
    id: testerId,
    display_name: displayName,
    code_hash: codeHash,
    invite_code: inviteCode,
    status: "applied",
    submitted_at: submittedAtIso,
    why,
    focus_areas: focusAreas,
    experience: experience || null,
    referral_source: referralSource || null,
    contact_email: contacts.email || null,
    contact_signal: contacts.signal || null,
    contact_discord: contacts.discord || null,
    contact_x: contacts.x || null,
    contact_telegram: contacts.telegram || null,
    contact_forum: contacts.forum || null,
    best_contact_kind: bestContactKind,
    ip_hash: hashIp(ip),
    user_agent: userAgent,
  });

  if (insertError) {
    // Soft email-dedupe via the partial unique index.
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      return { ok: false, error: "An application with that email is already in the queue." };
    }
    console.error("[beta-apply] insert failed:", insertError);
    return { ok: false, error: "Couldn't save your application. Try again." };
  }

  await sendBetaApplicationNotice({
    testerId,
    displayName,
    inviteCode,
    why,
    focusAreas,
    experience: experience || null,
    referralSource: referralSource || null,
    contacts: filledKinds.map((kind) => ({
      kind,
      value: contacts[kind],
      isBest: kind === bestContactKind,
    })),
    submittedAt: submittedAtIso,
  });

  return { ok: true };
}
