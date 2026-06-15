// Beta server actions — called from client components (Feedback modal, checklist UI).
// Session: signOut / switchNetwork / getCurrentTesterName all delegate to gate.ts.
// Feedback: validates payload, uploads screenshots to Supabase Storage (beta-feedback bucket),
//   inserts row into beta_feedback. On insert failure, best-effort cleans uploaded screenshots.
// Checklist: upserts to beta_checklist_progress; anonymous testers → no-op (localStorage only on client).
"use server";

import { cookies, headers } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { Network } from "@/lib/types";
import {
  deviceLabel,
  findVariantByWalletIdAndPlatform,
  getWalletVariant,
  isWalletDeviceChoice,
  isWalletSubcategory,
  isWalletVariantId,
  subcategoryLabel,
  walletVariantLabel,
  type WalletChoice,
  type WalletDeviceChoice,
  type WalletSubcategory,
  type WalletVariantId,
} from "@/lib/wallets/catalog";
import { readPreferredWalletVariantId } from "@/lib/beta/wallet-selection";
import { validateAddress } from "@/lib/zns/address-validation";
import {
  BETA_COOKIE_NAME,
  BETA_STAGE_COOKIE_NAME,
  readCurrentBetaAccessSession,
  readCurrentStage,
  readCurrentTester,
  setStageCookie,
  setTesterCookie,
} from "./gate";
import { cookieOptions } from "@/lib/cookie";

const FEEDBACK_BUCKET = "beta-feedback";
const REBATE_BUCKET = "beta-rebate-attachments";
const FEEDBACK_PROGRAM = "v2";

// ---------------------------------------------------------------------------
// Beta gate session helpers.
// ---------------------------------------------------------------------------

export async function verifyBetaPassword(
  password: string,
  network: "mainnet" | "testnet",
): Promise<{ ok: boolean }> {
  const expected =
    network === "mainnet"
      ? process.env.MAINNET_PASSWORD
      : process.env.TESTNET_PASSWORD;
  if (expected && password === expected) {
    // Network-specific access password — no per-tester identity.
    await setTesterCookie(`shared_${network}`);
    await setStageCookie(network);
    return { ok: true };
  }

  // Invite code — try redeeming it directly.
  const { redeemBetaInviteCode } = await import("@/lib/beta-v2/actions");
  const result = await redeemBetaInviteCode(password);
  if (result.ok) {
    await setStageCookie(network);
    return { ok: true };
  }

  return { ok: false };
}

export async function signOutBetaTester(): Promise<{ ok: true }> {
  const store = await cookies();
  store.set(BETA_COOKIE_NAME, "", cookieOptions(0));
  store.set(BETA_STAGE_COOKIE_NAME, "", cookieOptions(0));
  return { ok: true };
}

export async function switchToNetwork(network: Network): Promise<void> {
  await setStageCookie(network);
}

export async function getCurrentTesterName(): Promise<string | null> {
  const tester = await readCurrentTester();
  return tester?.displayName ?? null;
}

export async function getCurrentTesterCohort(): Promise<"v1" | "v2" | null> {
  const tester = await readCurrentTester();
  return tester?.cohort ?? null;
}

export async function getCurrentBetaStage(): Promise<"testnet" | "mainnet" | null> {
  return readCurrentStage();
}

export async function getCurrentTesterFocus(): Promise<("user" | "sdk")[]> {
  const tester = await readCurrentTester();
  if (!tester) return [];
  const sourceTable = tester.cohort === "v2" ? "beta_testers_v2" : "beta_testers";
  const { data, error } = await db
    .from(sourceTable)
    .select("focus_areas")
    .eq("id", tester.id)
    .maybeSingle();
  if (error || !data?.focus_areas) return [];
  const raw = data.focus_areas as unknown[];
  return raw.filter((v): v is "user" | "sdk" => v === "user" || v === "sdk");
}

export async function getCurrentTesterPreferredWalletVariantId(): Promise<WalletVariantId | null> {
  const tester = await readCurrentTester();
  if (!tester || tester.cohort !== "v2") return null;

  const { data, error } = await db
    .from("beta_testers_v2")
    .select("planned_wallet, planned_wallets_detail")
    .eq("id", tester.id)
    .maybeSingle();
  if (error || !data) return null;

  return readPreferredWalletVariantId(data.planned_wallet, data.planned_wallets_detail);
}

export interface BetaRebateDefaults {
  identifier: string;
  displayName: string | null;
  accessCode: string | null;
  stage: "testnet" | "mainnet";
  walletLabel: string;
  walletDevice: WalletDeviceChoice;
  walletSubcategory: WalletSubcategory | "";
  walletChoice: WalletChoice | "other";
  walletOtherName: string;
  walletVariantId: WalletVariantId | null;
  contactEmail: string | null;
}

interface ResolvedRebateWallet {
  walletLabel: string;
  walletDevice: WalletDeviceChoice;
  walletSubcategory: WalletSubcategory | "";
  walletChoice: WalletChoice | "other";
  walletOtherName: string;
  walletVariantId: WalletVariantId | null;
}

function defaultRebateWallet(): ResolvedRebateWallet {
  return {
    walletLabel: "",
    walletDevice: "not_sure",
    walletSubcategory: "",
    walletChoice: "not_sure",
    walletOtherName: "",
    walletVariantId: null,
  };
}

function preferredWalletDetailRow(plannedWalletsDetail: unknown): Record<string, unknown> | null {
  if (!Array.isArray(plannedWalletsDetail)) return null;
  const primaryRows = plannedWalletsDetail.filter(
    (row) =>
      typeof row === "object" &&
      row !== null &&
      (row as Record<string, unknown>).is_primary === true,
  );
  const candidateRows = primaryRows.length > 0 ? primaryRows : plannedWalletsDetail;
  const firstRow = candidateRows.find((row) => typeof row === "object" && row !== null);
  return firstRow && typeof firstRow === "object" ? (firstRow as Record<string, unknown>) : null;
}

function resolvePreferredRebateWallet(
  plannedWallet: unknown,
  plannedWalletsDetail: unknown,
): ResolvedRebateWallet {
  const walletVariantId = readPreferredWalletVariantId(plannedWallet, plannedWalletsDetail);
  if (walletVariantId) {
    const variant = getWalletVariant(walletVariantId);
    if (variant) {
      return {
        walletLabel: walletVariantLabel(variant),
        walletDevice: variant.device,
        walletSubcategory: variant.subcategory,
        walletChoice: variant.variantId,
        walletOtherName: "",
        walletVariantId,
      };
    }
  }

  const detailRow = preferredWalletDetailRow(plannedWalletsDetail);
  if (!detailRow) return defaultRebateWallet();

  const deviceRaw = typeof detailRow.device === "string" ? detailRow.device.trim() : "";
  const device: WalletDeviceChoice = isWalletDeviceChoice(deviceRaw) ? deviceRaw : "not_sure";
  const subcategoryRaw =
    typeof detailRow.subcategory === "string" ? detailRow.subcategory.trim() : "";
  const subcategory: WalletSubcategory | "" =
    device !== "not_sure" && isWalletSubcategory(subcategoryRaw) ? subcategoryRaw : "";
  const choiceRaw = typeof detailRow.choice === "string" ? detailRow.choice.trim() : "";
  const otherName =
    typeof detailRow.other_name === "string" && detailRow.other_name.trim()
      ? detailRow.other_name.trim()
      : typeof detailRow.otherName === "string" && detailRow.otherName.trim()
        ? detailRow.otherName.trim()
        : "";
  const label =
    typeof detailRow.label === "string" && detailRow.label.trim() ? detailRow.label.trim() : "";

  if (choiceRaw === "other" && device !== "not_sure" && subcategory) {
    return {
      walletLabel: label || `Other: ${deviceLabel(device)} ${subcategoryLabel(subcategory)} - ${otherName}`,
      walletDevice: device,
      walletSubcategory: subcategory,
      walletChoice: "other",
      walletOtherName: otherName,
      walletVariantId: null,
    };
  }

  if (choiceRaw === "not_sure") {
    return {
      walletLabel:
        label ||
        (device === "not_sure"
          ? "Not sure yet"
          : subcategory
            ? `${deviceLabel(device)} ${subcategoryLabel(subcategory)}: Not sure yet`
            : `${deviceLabel(device)}: Not sure yet`),
      walletDevice: device,
      walletSubcategory: subcategory,
      walletChoice: "not_sure",
      walletOtherName: "",
      walletVariantId: null,
    };
  }

  return defaultRebateWallet();
}

function parseSubmittedRebateWallet(formData: FormData):
  | { error: string }
  | { walletLabel: string; walletVariantId: WalletVariantId | null } {
  const deviceRaw = String(formData.get("wallet_device") ?? "").trim();
  const subcategoryRaw = String(formData.get("wallet_subcategory") ?? "").trim();
  const choiceRaw = String(formData.get("wallet_choice") ?? "").trim();
  const variantIdRaw = String(formData.get("wallet_variant_id") ?? choiceRaw).trim();
  const otherName = String(formData.get("wallet_other_name") ?? "").trim();

  if (!isWalletDeviceChoice(deviceRaw)) {
    return { error: "Pick a valid wallet category." };
  }

  if (choiceRaw === "not_sure") {
    if (deviceRaw === "not_sure") {
      return { walletLabel: "Not sure yet", walletVariantId: null };
    }
    if (!isWalletSubcategory(subcategoryRaw)) {
      return { error: "Pick a valid wallet platform." };
    }
    return {
      walletLabel: `${deviceLabel(deviceRaw)} ${subcategoryLabel(subcategoryRaw)}: Not sure yet`,
      walletVariantId: null,
    };
  }

  if (deviceRaw === "not_sure") {
    return { error: "Pick a valid wallet option." };
  }
  if (!isWalletSubcategory(subcategoryRaw)) {
    return { error: "Pick a valid wallet platform." };
  }

  if (choiceRaw === "other") {
    if (!otherName) return { error: "Enter the wallet name." };
    if (otherName.length > 200) return { error: "Wallet name is too long." };
    return {
      walletLabel: `Other: ${deviceLabel(deviceRaw)} ${subcategoryLabel(subcategoryRaw)} - ${otherName}`,
      walletVariantId: null,
    };
  }

  let variant = isWalletVariantId(variantIdRaw) ? getWalletVariant(variantIdRaw) : null;
  if (!variant) {
    variant = findVariantByWalletIdAndPlatform(choiceRaw, deviceRaw, subcategoryRaw);
  }
  if (!variant || variant.device !== deviceRaw || variant.subcategory !== subcategoryRaw) {
    return { error: "Pick a valid wallet option." };
  }

  return {
    walletLabel: walletVariantLabel(variant),
    walletVariantId: variant.variantId,
  };
}

export async function getCurrentBetaRebateDefaults(): Promise<BetaRebateDefaults | null> {
  const session = await readCurrentBetaAccessSession();
  const stage = (await readCurrentStage()) ?? "mainnet";

  if (!session) return null;
  if (session.kind === "shared") {
    const walletDefaults = defaultRebateWallet();
    return {
      identifier: session.testerId,
      displayName: session.testerId,
      accessCode: null,
      stage,
      walletLabel: walletDefaults.walletLabel,
      walletDevice: walletDefaults.walletDevice,
      walletSubcategory: walletDefaults.walletSubcategory,
      walletChoice: walletDefaults.walletChoice,
      walletOtherName: walletDefaults.walletOtherName,
      walletVariantId: walletDefaults.walletVariantId,
      contactEmail: null,
    };
  }

  const tester = session.tester;
  if (tester.cohort !== "v2") {
    const walletDefaults = defaultRebateWallet();
    return {
      identifier: tester.id,
      displayName: tester.displayName,
      accessCode: null,
      stage,
      walletLabel: walletDefaults.walletLabel,
      walletDevice: walletDefaults.walletDevice,
      walletSubcategory: walletDefaults.walletSubcategory,
      walletChoice: walletDefaults.walletChoice,
      walletOtherName: walletDefaults.walletOtherName,
      walletVariantId: walletDefaults.walletVariantId,
      contactEmail: null,
    };
  }

  const { data, error } = await db
    .from("beta_testers_v2")
    .select("invite_code, planned_wallet, planned_wallets_detail, contact_email")
    .eq("id", tester.id)
    .maybeSingle();

  if (error || !data) {
    console.error("[beta-rebate] default lookup failed:", error);
    return null;
  }

  const preferredWallet = resolvePreferredRebateWallet(data.planned_wallet, data.planned_wallets_detail);

  return {
    identifier: tester.id,
    displayName: tester.displayName,
    accessCode: typeof data.invite_code === "string" ? data.invite_code : null,
    stage,
    walletLabel: preferredWallet.walletLabel,
    walletDevice: preferredWallet.walletDevice,
    walletSubcategory: preferredWallet.walletSubcategory,
    walletChoice: preferredWallet.walletChoice,
    walletOtherName: preferredWallet.walletOtherName,
    walletVariantId: preferredWallet.walletVariantId,
    contactEmail: typeof data.contact_email === "string" ? data.contact_email : null,
  };
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
  walletVariantId?: WalletVariantId | null;
}

export type FeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

const MAX_FIELD_LEN = 4000;
const MAX_SCREENSHOTS = 5;
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const MAX_REBATE_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  // Strip path separators + anything weird, keep extension.
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
}

export async function submitBetaFeedback(formData: FormData): Promise<FeedbackResult> {
  const session = await readCurrentBetaAccessSession();
  const tester = session?.kind === "tester" ? session.tester : null;
  const isSharedMainnet = session?.kind === "shared" && session.testerId === "shared_mainnet";

  if (!isSharedMainnet && tester?.cohort !== "v2") {
    return { ok: false, error: "Feedback is only available for the current beta cohort." };
  }
  const testerId = tester?.id ?? null;
  const testerName = tester?.displayName ?? (isSharedMainnet ? "shared_mainnet" : "anonymous");

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
  const walletVariantIdRaw = String(formData.get("wallet_variant_id") ?? "").trim();
  const experienceRating = experienceRatingRaw ? Number(experienceRatingRaw) : null;
  const walletVariantId = isWalletVariantId(walletVariantIdRaw) ? walletVariantIdRaw : null;

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
    beta_version: FEEDBACK_PROGRAM,
    stage: network,
    item_id: checklistItemId || null,
    severity,
    experience_rating: experienceRating,
    wallet: wallet || null,
    wallet_variant_id: walletVariantId,
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

export type BetaRebateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitBetaRebateClaim(formData: FormData): Promise<BetaRebateResult> {
  const session = await readCurrentBetaAccessSession();
  if (!session) {
    return { ok: false, error: "Sign in to the beta first." };
  }

  const tester = session.kind === "tester" ? session.tester : null;
  const stage = (await readCurrentStage()) ?? "mainnet";
  const reqHeaders = await headers();
  const userAgent = reqHeaders.get("user-agent")?.slice(0, 500) ?? null;
  const address = String(formData.get("address") ?? "").trim();
  const actionType = String(formData.get("action_type") ?? "").trim();
  const outcome = String(formData.get("outcome") ?? "").trim();
  const txid = String(formData.get("txid") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const clientEnv = String(formData.get("client_env") ?? "").trim().slice(0, 200);
  const attachment = formData.get("attachment");

  if (!address) return { ok: false, error: "Enter your Zcash address." };
  const addressValidation = validateAddress(address);
  if (addressValidation.status !== "unified") {
    return { ok: false, error: addressValidation.warning || "Enter a valid unified Zcash address." };
  }
  if (actionType !== "CLAIM" && actionType !== "BUY" && actionType !== "OTHER") {
    return { ok: false, error: "Pick a valid action type." };
  }
  if (outcome !== "success" && outcome !== "failure") {
    return { ok: false, error: "Pick a valid outcome." };
  }
  if (!txid) {
    return { ok: false, error: "Transaction ID is required." };
  }

  const parsedWallet = parseSubmittedRebateWallet(formData);
  if ("error" in parsedWallet) return { ok: false, error: parsedWallet.error };

  for (const [fieldName, value] of [["address", address], ["txid", txid], ["wallet", parsedWallet.walletLabel], ["notes", notes]] as const) {
    if (value.length > MAX_FIELD_LEN) return { ok: false, error: `${fieldName} is too long.` };
  }
  if (!(attachment instanceof File) || attachment.size === 0) {
    return { ok: false, error: "Attach one picture." };
  }
  if (!attachment.type.startsWith("image/")) {
    return { ok: false, error: "Attachment must be an image." };
  }
  if (attachment.size > MAX_REBATE_ATTACHMENT_BYTES) {
    return { ok: false, error: "Attachment must be under 5 MB." };
  }

  let identifier = session.kind === "shared" ? session.testerId : tester?.id ?? "anonymous";
  let testerName = session.kind === "shared" ? session.testerId : tester?.displayName ?? "anonymous";
  let inviteCode: string | null = null;
  let contactEmail: string | null = null;

  if (tester?.cohort === "v2") {
    const { data, error } = await db
      .from("beta_testers_v2")
      .select("invite_code, contact_email")
      .eq("id", tester.id)
      .maybeSingle();
    if (error || !data) {
      console.error("[beta-rebate] tester lookup failed:", error);
      return { ok: false, error: "Couldn't load your beta profile." };
    }
    identifier = tester.id;
    testerName = tester.displayName;
    inviteCode = typeof data.invite_code === "string" ? data.invite_code : null;
    contactEmail = typeof data.contact_email === "string" ? data.contact_email : null;
  }

  const rebateId = randomUUID();
  const attachmentPath = `${identifier}/${rebateId}/${sanitizeFilename(attachment.name)}`;
  const { error: uploadError } = await db.storage.from(REBATE_BUCKET).upload(attachmentPath, attachment, {
    cacheControl: "3600",
    upsert: false,
    contentType: attachment.type,
  });
  if (uploadError) {
    console.error("[beta-rebate] storage upload failed:", uploadError);
    return { ok: false, error: "Couldn't upload the picture. Try again." };
  }

  const { data: publicAttachment } = db.storage.from(REBATE_BUCKET).getPublicUrl(attachmentPath);
  const { error: insertError } = await db.from("beta_rebate_claims").insert({
    id: rebateId,
    tester_id: tester?.id ?? null,
    tester_name_snapshot: testerName,
    session_identifier: identifier,
    invite_code_snapshot: inviteCode,
    stage,
    name: address,
    action_type: actionType,
    outcome,
    txid: txid || null,
    wallet_label: parsedWallet.walletLabel || null,
    wallet_variant_id_snapshot: parsedWallet.walletVariantId,
    contact_email_snapshot: contactEmail,
    notes: notes || null,
    attachment_urls: [publicAttachment.publicUrl],
    user_agent: userAgent,
    client_env: clientEnv || null,
  });

  if (insertError) {
    console.error("[beta-rebate] insert failed:", insertError);
    await db.storage.from(REBATE_BUCKET).remove([attachmentPath]).catch(() => {});
    return { ok: false, error: "Couldn't save your rebate claim. Try again." };
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
  if (!tester || tester.cohort !== "v2") return { ok: true };

  const itemId = String(input.itemId ?? "").slice(0, 64);
  if (!itemId) return { ok: true };
  if (input.stage !== "testnet" && input.stage !== "mainnet") return { ok: true };

  const { error } = await db
    .from("beta_checklist_progress")
    .upsert(
      {
        tester_id: tester.id,
        stage: input.stage,
        beta_version: FEEDBACK_PROGRAM,
        item_id: itemId,
        completed: !!input.completed,
      },
      { onConflict: "tester_id,stage,beta_version,item_id" },
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
  if (!tester || tester.cohort !== "v2") return {};
  if (stage !== "testnet" && stage !== "mainnet") return {};

  const { data, error } = await db
    .from("beta_checklist_progress")
    .select("item_id, completed")
    .eq("tester_id", tester.id)
    .eq("stage", stage)
    .eq("beta_version", FEEDBACK_PROGRAM);

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

