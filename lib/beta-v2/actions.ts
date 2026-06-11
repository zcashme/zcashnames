// Beta v2 server actions:
//   submitBetaV2Application — public apply form → beta_testers_v2 insert + admin email
//   sendBetaInvite          — admin triggers invite email to approved applicant
//   redeemBetaInviteCode    — applicant trades code for a signed session cookie
"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { CONTACT_KINDS, type ContactKind } from "@/lib/types";
import { sendBetaV2ApplicationNotice } from "@/lib/email/beta-application-v2";
import { sendBetaInviteEmail } from "@/lib/email/beta-invite";
import { setTesterCookie, setStageCookie } from "@/lib/beta/gate";
import { readPreferredWalletVariantId } from "@/lib/beta/wallet-selection";
import { resolveSiteUrl } from "@/lib/site-url";
import {
  deviceLabel,
  findVariantByWalletIdAndPlatform,
  getWalletVariant,
  isWalletBrandSlug,
  isWalletDevice,
  isWalletDeviceChoice,
  isWalletSubcategory,
  isWalletVariantId,
  subcategoryLabel,
  walletVariantLabel,
  type WalletBrandSlug,
  type WalletChoice,
  type WalletDevice,
  type WalletDeviceChoice,
  type WalletSubcategory,
  type WalletVariantId,
} from "@/lib/wallets/catalog";

export type BetaV2ApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

const APP_MAX_NAME = 60;
const APP_MIN_WHY = 20;
const APP_MAX_WHY = 2000;
const APP_MAX_TEXT = 2000;
const APP_MAX_CONTACT = 200;
const APP_MAX_WALLET_NAME = 200;
const APP_MAX_WALLET_ROWS = 12;

type WalletDetail =
  | {
      device: WalletDeviceChoice;
      subcategory: WalletSubcategory | null;
      choice: "not_sure";
      value: "not_sure";
      label: string;
      isPrimary: boolean;
    }
  | {
      device: WalletDevice;
      subcategory: WalletSubcategory;
      choice: "other";
      otherName: string;
      label: string;
      isPrimary: boolean;
    }
  | {
      device: WalletDevice;
      subcategory: WalletSubcategory;
      choice: WalletVariantId;
      value: WalletVariantId;
      walletId: string;
      brandSlug: WalletBrandSlug;
      label: string;
      isPrimary: boolean;
    };

function slugifyId(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const suffix = randomBytes(3).toString("hex");
  return `tester_v2_${slug || "anon"}_${suffix}`;
}

function generateInviteCode(): string {
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeSubcategory(value: string): string {
  return value === "chrome_extension" ? "chrome" : value;
}

function inferFallbackRow(choice: string, formData: FormData): Record<string, unknown> {
  if (choice === "other") {
    return {
      device: String(formData.get("other_wallet_device") ?? "").trim(),
      choice,
      other_name: String(formData.get("other_wallet_name") ?? "").trim(),
    };
  }
  if (choice === "not_sure") return { device: "not_sure", choice };

  const variant = getWalletVariant(choice);
  if (variant) {
    return {
      device: variant.device,
      subcategory: variant.subcategory,
      choice: variant.variantId,
      variant_id: variant.variantId,
      wallet_id: variant.walletId,
      brand_slug: variant.brandSlug,
    };
  }

  return { choice };
}

function parseWalletDetails(formData: FormData): { details: WalletDetail[] } | { error: string } {
  const raw = String(formData.get("planned_wallets_detail") ?? "").trim();
  const fallbackChoice = String(formData.get("planned_wallet_choice") ?? "").trim();

  let rows: unknown[];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return { error: "Pick a valid wallet option." };
      rows = parsed;
    } catch {
      return { error: "Pick a valid wallet option." };
    }
  } else if (fallbackChoice) {
    rows = [inferFallbackRow(fallbackChoice, formData)];
  } else {
    return { error: "Pick which wallet you plan to use." };
  }

  if (rows.length === 0) return { error: "Add at least one planned wallet." };
  if (rows.length > APP_MAX_WALLET_ROWS) return { error: "Too many planned wallets." };

  const details: WalletDetail[] = [];
  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) return { error: "Pick a valid wallet option." };

    const device = String(row.device ?? "").trim();
    const subcategoryRaw = row.subcategory == null ? "" : normalizeSubcategory(String(row.subcategory).trim());
    const choice = String(row.choice ?? "").trim();
    const variantId = String(row.variant_id ?? row.variantId ?? choice).trim();
    const isPrimary = index === 0;

    if (!isWalletDeviceChoice(device)) {
      return { error: "Pick a valid wallet category." };
    }

    if (choice === "not_sure") {
      if (device === "not_sure" && subcategoryRaw) {
        return { error: "Pick a valid wallet platform." };
      }
      if (device !== "not_sure" && !isWalletSubcategory(subcategoryRaw)) {
        return { error: "Pick a valid wallet platform." };
      }
      const subcategory = device === "not_sure" ? null : (subcategoryRaw as WalletSubcategory);
      details.push({
        device,
        subcategory,
        choice: "not_sure",
        value: "not_sure",
        label: device === "not_sure"
          ? "Not sure yet"
          : `${deviceLabel(device)} ${subcategoryLabel(subcategory as WalletSubcategory)}: Not sure yet`,
        isPrimary,
      });
      continue;
    }

    if (device === "not_sure") return { error: "Pick a valid wallet option." };
    if (!isWalletSubcategory(subcategoryRaw)) {
      return { error: "Pick a valid wallet platform." };
    }
    const subcategory = subcategoryRaw;

    if (choice === "other") {
      const otherName = String(row.other_name ?? row.otherName ?? "").trim();
      if (!otherName) return { error: "Enter the wallet name." };
      if (otherName.length > APP_MAX_WALLET_NAME) {
        return { error: "Wallet name is too long." };
      }

      details.push({
        device,
        subcategory,
        choice: "other",
        otherName,
        label: `Other: ${deviceLabel(device)} ${subcategoryLabel(subcategory)} - ${otherName}`,
        isPrimary,
      });
      continue;
    }

    let variant = isWalletVariantId(variantId) ? getWalletVariant(variantId) : null;
    if (!variant && isWalletDevice(device)) {
      variant = findVariantByWalletIdAndPlatform(choice, device, subcategory);
    }

    if (!variant || variant.device !== device || variant.subcategory !== subcategory) {
      return { error: "Pick a valid wallet option." };
    }

    details.push({
      device,
      subcategory,
      choice: variant.variantId,
      value: variant.variantId,
      walletId: variant.walletId,
      brandSlug: variant.brandSlug,
      label: `${walletVariantLabel(variant)} (${variant.variantId})`,
      isPrimary,
    });
  }

  return { details };
}

export async function submitBetaV2Application(
  formData: FormData,
): Promise<BetaV2ApplicationResult> {
  const displayName = String(formData.get("display_name") ?? "").trim();
  const rawEntryBrandSlug = String(formData.get("entry_brand_slug") ?? "").trim();
  const why = String(formData.get("why") ?? "").trim();
  const focusRaw = String(formData.get("focus_areas") ?? "").trim();
  const focusAreas: ("user" | "sdk")[] = focusRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is "user" | "sdk" => s === "user" || s === "sdk");
  const experience = String(formData.get("experience") ?? "").trim();
  const referralSource = String(formData.get("referral_source") ?? "").trim();
  const entryBrandSlug = rawEntryBrandSlug
    ? (isWalletBrandSlug(rawEntryBrandSlug) ? rawEntryBrandSlug : null)
    : null;

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

  const parsedWallets = parseWalletDetails(formData);
  if ("error" in parsedWallets) return { ok: false, error: parsedWallets.error };

  const primaryWallet = parsedWallets.details[0];
  if (!primaryWallet) return { ok: false, error: "Add at least one planned wallet." };
  const plannedWallet: WalletChoice | null =
    primaryWallet.choice === "other" ? null : primaryWallet.value;
  const otherWalletDevice: WalletDevice | null =
    primaryWallet.choice === "other" ? primaryWallet.device : null;
  const otherWalletNameForDb: string | null =
    primaryWallet.choice === "other" ? primaryWallet.otherName : null;
  const walletLabel = primaryWallet.label;
  const plannedWalletsDetail = parsedWallets.details.map((wallet) => {
    if (wallet.choice === "other") {
      return {
        device: wallet.device,
        subcategory: wallet.subcategory,
        choice: wallet.choice,
        variant_id: null,
        wallet_id: null,
        brand_slug: null,
        other_name: wallet.otherName,
        label: wallet.label,
        is_primary: wallet.isPrimary,
      };
    }

    if (wallet.choice === "not_sure") {
      return {
        device: wallet.device,
        subcategory: wallet.subcategory,
        choice: wallet.choice,
        variant_id: null,
        wallet_id: null,
        brand_slug: null,
        value: wallet.value,
        label: wallet.label,
        is_primary: wallet.isPrimary,
      };
    }

    return {
      device: wallet.device,
      subcategory: wallet.subcategory,
      choice: wallet.choice,
      variant_id: wallet.value,
      wallet_id: wallet.walletId,
      brand_slug: wallet.brandSlug,
      value: wallet.value,
      label: wallet.label,
      is_primary: wallet.isPrimary,
    };
  });

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

  const testerId = slugifyId(displayName);
  const inviteCode = generateInviteCode();
  const codeHash = hashInviteCode(inviteCode);
  const submittedAtIso = new Date().toISOString();
  const { ip, userAgent } = await readClientMeta();

  const insertPayload = {
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
    planned_wallet: plannedWallet,
    other_wallet_device: otherWalletDevice,
    other_wallet_name: otherWalletNameForDb,
    planned_wallets_detail: plannedWalletsDetail,
    entry_brand_slug: entryBrandSlug,
    ip_hash: hashIp(ip),
    user_agent: userAgent,
  };

  let { error: insertError } = await db.from("beta_testers_v2").insert(insertPayload);

  // Older databases may not have the attribution column yet. Keep the apply flow
  // working while allowing upgraded schemas to retain branded entry provenance.
  if ((insertError as { code?: string } | null)?.code === "42703") {
    const { entry_brand_slug: _entryBrandSlug, ...legacyInsertPayload } = insertPayload;
    ({ error: insertError } = await db.from("beta_testers_v2").insert(legacyInsertPayload));
  }

  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      return { ok: false, error: "An application with that email is already in the queue." };
    }
    console.error("[beta-v2-apply] insert failed:", insertError);
    return { ok: false, error: "Couldn't save your application. Try again." };
  }

  await sendBetaV2ApplicationNotice({
    testerId,
    displayName,
    inviteCode,
    entryBrandSlug,
    why,
    focusAreas,
    plannedWallet: walletLabel,
    plannedWallets: plannedWalletsDetail.map((wallet) => wallet.label),
    experience: experience || null,
    referralSource: referralSource || null,
    contacts: filledKinds.map((kind) => ({
      kind,
      value: contacts[kind],
      isBest: kind === bestContactKind,
    })),
    submittedAt: submittedAtIso,
  });

  if (contacts.email) {
    const baseUrl = resolveSiteUrl();
    const nowIso = new Date().toISOString();

    try {
      await sendBetaInviteEmail({
        email: contacts.email,
        displayName,
        inviteCode,
        baseUrl,
        walletVariantId: readPreferredWalletVariantId(plannedWallet, plannedWalletsDetail),
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : String(sendError);
      await db
        .from("beta_testers_v2")
        .update({
          notice_status: "failed",
          notice_error: message.slice(0, 500),
          notice_attempted_at: nowIso,
        })
        .eq("id", testerId)
        .is("code_sent_at", null);

      return {
        ok: false,
        error: "Application received, but we couldn't send your beta invite email yet. Please try again shortly.",
      };
    }

    const { error: inviteUpdateError } = await db
      .from("beta_testers_v2")
      .update({
        status: "invited",
        code_sent_at: nowIso,
        notice_status: "sent",
        notice_attempted_at: nowIso,
        notice_error: null,
      })
      .eq("id", testerId)
      .is("code_sent_at", null);

    if (inviteUpdateError) {
      console.error("[beta-v2-apply] invite status update failed:", inviteUpdateError);
      return {
        ok: false,
        error: "Application received and invite email sent, but we couldn't finish updating your beta status.",
      };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Admin: send invite to an approved applicant.
// ---------------------------------------------------------------------------

export type SendBetaInviteResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendBetaInvite(testerId: string): Promise<SendBetaInviteResult> {
  const { data, error } = await db
    .from("beta_testers_v2")
    .select("id, display_name, contact_email, status, invite_code, planned_wallet, planned_wallets_detail")
    .eq("id", testerId)
    .maybeSingle();

  if (error) {
    console.error("[beta-v2] sendBetaInvite lookup failed:", error);
    return { ok: false, error: "DB error. Try again." };
  }
  if (!data) return { ok: false, error: "Applicant not found." };
  if (data.status === "revoked") return { ok: false, error: "Applicant is revoked." };
  if (!data.contact_email) return { ok: false, error: "No email address on file." };

  const baseUrl = resolveSiteUrl();

  await sendBetaInviteEmail({
    email: data.contact_email as string,
    displayName: data.display_name as string,
    inviteCode: data.invite_code as string,
    baseUrl,
    walletVariantId: readPreferredWalletVariantId(data.planned_wallet, data.planned_wallets_detail),
  });

  await db
    .from("beta_testers_v2")
    .update({ status: "invited", code_sent_at: new Date().toISOString() })
    .eq("id", testerId);

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Applicant: redeem an invite code → signed session cookie.
// ---------------------------------------------------------------------------

export type RedeemBetaInviteResult =
  | { ok: true; displayName: string }
  | { ok: false; error: string };

export async function redeemBetaInviteCode(code: string): Promise<RedeemBetaInviteResult> {
  if (!code) return { ok: false, error: "No invite code." };

  const codeHash = createHash("sha256").update(code).digest("hex");

  const { data, error } = await db
    .from("beta_testers_v2")
    .select("id, display_name, status")
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (error) {
    console.error("[beta-v2] redeemBetaInviteCode lookup failed:", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
  if (!data) return { ok: false, error: "Invalid invite code." };
  if (data.status === "revoked") return { ok: false, error: "This invite has been revoked." };

  const testerId = data.id as string;
  const displayName = data.display_name as string;

  await setTesterCookie(testerId);
  await setStageCookie("mainnet");

  await db
    .from("beta_testers_v2")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", testerId)
    .neq("status", "active");

  return { ok: true, displayName };
}
