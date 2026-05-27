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

const PLANNED_WALLET_LABELS = {
  desktop_zingo: "Desktop: Zingo!",
  desktop_vizor: "Desktop: Vizor",
  mobile_zingo: "Mobile: Zingo",
  mobile_zkool: "Mobile: Zkool",
  mobile_unstoppable: "Mobile: Unstoppable",
  mobile_zodl: "Mobile: Zodl",
  mobile_edge: "Mobile: Edge",
  mobile_cake: "Mobile: Cake",
  mobile_zipher: "Mobile: Zipher",
  browser_brave: "Browser: Brave",
  browser_noir: "Browser: Noir",
  not_sure: "Not sure yet",
} as const;

type PlannedWallet = keyof typeof PLANNED_WALLET_LABELS;
type OtherWalletDevice = "desktop" | "mobile" | "browser";
type WalletDevice = OtherWalletDevice | "not_sure";
type WalletDetail =
  | {
      device: WalletDevice;
      choice: PlannedWallet;
      value: PlannedWallet;
      label: string;
      isPrimary: boolean;
    }
  | {
      device: OtherWalletDevice;
      choice: "other";
      otherName: string;
      label: string;
      isPrimary: boolean;
    };

const WALLET_DEVICES = new Set<string>(["not_sure", "desktop", "mobile", "browser"]);

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

function isPlannedWallet(v: string): v is PlannedWallet {
  return v in PLANNED_WALLET_LABELS;
}

function formatDeviceLabel(device: OtherWalletDevice): string {
  return device.charAt(0).toUpperCase() + device.slice(1);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function walletMatchesDevice(wallet: PlannedWallet, device: WalletDevice): boolean {
  if (wallet === "not_sure") return true;
  return wallet.startsWith(`${device}_`);
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
    rows = [
      {
        device: fallbackChoice === "other"
          ? String(formData.get("other_wallet_device") ?? "").trim()
          : fallbackChoice === "not_sure"
            ? "not_sure"
            : fallbackChoice.split("_")[0],
        choice: fallbackChoice,
        other_name: String(formData.get("other_wallet_name") ?? "").trim(),
      },
    ];
  } else {
    return { error: "Pick which wallet you plan to use." };
  }

  if (rows.length === 0) return { error: "Add at least one planned wallet." };
  if (rows.length > APP_MAX_WALLET_ROWS) return { error: "Too many planned wallets." };

  const details: WalletDetail[] = [];
  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) return { error: "Pick a valid wallet option." };

    const device = String(row.device ?? "").trim();
    const choice = String(row.choice ?? "").trim();
    const isPrimary = index === 0;

    if (!WALLET_DEVICES.has(device)) {
      return { error: "Pick a valid wallet category." };
    }
    const walletDevice = device as WalletDevice;

    if (choice === "not_sure") {
      details.push({
        device: walletDevice,
        choice: "not_sure",
        value: "not_sure",
        label: walletDevice === "not_sure"
          ? PLANNED_WALLET_LABELS.not_sure
          : `${formatDeviceLabel(walletDevice as OtherWalletDevice)}: Not sure yet`,
        isPrimary,
      });
      continue;
    }

    if (walletDevice === "not_sure") return { error: "Pick a valid wallet option." };

    if (choice === "other") {
      const otherName = String(row.other_name ?? row.otherName ?? "").trim();
      if (!otherName) return { error: "Enter the wallet name." };
      if (otherName.length > APP_MAX_WALLET_NAME) {
        return { error: "Wallet name is too long." };
      }

      details.push({
        device: device as OtherWalletDevice,
        choice: "other",
        otherName,
        label: `Other: ${formatDeviceLabel(device as OtherWalletDevice)} - ${otherName}`,
        isPrimary,
      });
      continue;
    }

    if (!isPlannedWallet(choice) || !walletMatchesDevice(choice, device as WalletDevice)) {
      return { error: "Pick a valid wallet option." };
    }

    details.push({
      device: device as WalletDevice,
      choice,
      value: choice,
      label: `${PLANNED_WALLET_LABELS[choice]} (${choice})`,
      isPrimary,
    });
  }

  return { details };
}

export async function submitBetaV2Application(
  formData: FormData,
): Promise<BetaV2ApplicationResult> {
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

  const parsedWallets = parseWalletDetails(formData);
  if ("error" in parsedWallets) return { ok: false, error: parsedWallets.error };

  const primaryWallet = parsedWallets.details[0];
  if (!primaryWallet) return { ok: false, error: "Add at least one planned wallet." };
  const plannedWallet: PlannedWallet | null =
    primaryWallet.choice === "other" ? null : primaryWallet.value;
  const otherWalletDevice: OtherWalletDevice | null =
    primaryWallet.choice === "other" ? primaryWallet.device : null;
  const otherWalletNameForDb: string | null =
    primaryWallet.choice === "other" ? primaryWallet.otherName : null;
  const walletLabel = primaryWallet.label;
  const plannedWalletsDetail = parsedWallets.details.map((wallet) =>
    wallet.choice === "other"
      ? {
          device: wallet.device,
          choice: wallet.choice,
          other_name: wallet.otherName,
          label: wallet.label,
          is_primary: wallet.isPrimary,
        }
      : {
          device: wallet.device,
          choice: wallet.choice,
          value: wallet.value,
          label: wallet.label,
          is_primary: wallet.isPrimary,
        },
  );

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

  const { error: insertError } = await db.from("beta_testers_v2").insert({
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
    ip_hash: hashIp(ip),
    user_agent: userAgent,
  });

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
    .select("id, display_name, contact_email, status, invite_code")
    .eq("id", testerId)
    .maybeSingle();

  if (error) {
    console.error("[beta-v2] sendBetaInvite lookup failed:", error);
    return { ok: false, error: "DB error. Try again." };
  }
  if (!data) return { ok: false, error: "Applicant not found." };
  if (data.status === "revoked") return { ok: false, error: "Applicant is revoked." };
  if (!data.contact_email) return { ok: false, error: "No email address on file." };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.zcashnames.com";

  await sendBetaInviteEmail({
    email: data.contact_email as string,
    displayName: data.display_name as string,
    inviteCode: data.invite_code as string,
    baseUrl,
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
