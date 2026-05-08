"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { CONTACT_KINDS, type ContactKind } from "@/lib/types";
import { sendBetaV2ApplicationNotice } from "@/lib/email/beta-application-v2";

export type BetaV2ApplicationResult =
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
