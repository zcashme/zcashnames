// Waitlist server actions — the primary entry point for the public waitlist page.
//
// submitWaitlist: upsert-like flow. If email exists unverified → update row & re-send
//   confirmation. If new → insert + generate unique 8-char referral code.
//   Sends confirmation email with a signed token (confirm-token.ts → email/waitlist.ts).
//
// submitSurvey: updates survey fields by referral_code, optionally triggers a follow-up
//   email if may_contact or want_early_trial is set and email is verified.
//
// confirmWaitlistEmail: validates the email confirmation token, marks email_verified=true,
//   sends welcome email with the referral code.
//
// getWaitlistStats: aggregates total signups, referred count, and estimated rewards pot.
"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { sendFollowUp } from "@/lib/email/followup";
import { sendWaitlistConfirmationEmail } from "@/lib/email/waitlist";
import {
  buildWaitlistConfirmToken,
  isWaitlistConfirmSignatureValid,
  isWaitlistConfirmTokenExpired,
  parseWaitlistConfirmToken,
} from "@/lib/waitlist/confirm-token";
import { sendWaitlistWelcomeEmail } from "@/lib/email/waitlist";
import { ensureHumanReferralCode, resolveReferralIdentity } from "@/lib/referrals";
import { normalizeUsername } from "@/lib/zns/utils";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const MAX_REFERRAL_CODE_RETRIES = 6;

export interface WaitlistPayload {
  name: string;
  email: string;
  newsletter: boolean;
  referral_code: string;
  referred_by: string | null;
  recaptcha_token: string;
}

async function verifyRecaptchaToken(
  token: string,
  remoteIp: string | null,
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("reCAPTCHA verify skipped: RECAPTCHA_SECRET_KEY is not set");
    return false;
  }
  if (!token) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      console.error("reCAPTCHA verify HTTP error:", res.status);
      return false;
    }
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      console.error("reCAPTCHA verify failed:", data["error-codes"]);
    }
    return Boolean(data.success);
  } catch (err) {
    console.error("reCAPTCHA verify error:", err);
    return false;
  }
}

export interface SurveyPayload {
  referral_code: string;
  use_cases: string[] | null;
  other_use_case: string | null;
  want_early_trial: boolean | null;
  may_contact: boolean | null;
  comments: string | null;
}

type WaitlistRow = {
  id: string;
  name: string;
  email: string;
  referral_code: string | null;
  human_referral_code?: string | null;
  referred_by: string | null;
  email_verified: boolean;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name: string): boolean {
  return /^[a-z0-9]{1,62}$/.test(name);
}

function isValidReferralCode(code: string | null): code is string {
  if (!code) return false;
  return /^[A-Za-z0-9]{8}$/.test(code);
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_REFERRAL_CODE_RETRIES; attempt += 1) {
    const candidate = generateReferralCode();
    const { count, error } = await db
      .from("zn_waitlist")
      .select("id", { count: "exact", head: true })
      .eq("referral_code", candidate);
    if (!error && (count ?? 0) === 0) return candidate;
  }
  return generateReferralCode();
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

async function normalizeReferredBy(input: string | null): Promise<string | null> {
  const code = (input ?? "").trim();
  if (isValidReferralCode(code)) return code;

  const resolved = await resolveReferralIdentity(code);
  return resolved?.canonicalCode ?? null;
}

export async function submitWaitlist(
  payload: WaitlistPayload,
): Promise<{ error: string | null }> {
  const normalizedName = normalizeUsername(payload.name);
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedReferredBy = await normalizeReferredBy(payload.referred_by);

  if (!isValidName(normalizedName) || !isValidEmail(normalizedEmail)) {
    return { error: GENERIC_ERROR };
  }

  const headerStore = await headers();
  const remoteIp =
    headerStore.get("cf-connecting-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;
  const captchaOk = await verifyRecaptchaToken(payload.recaptcha_token, remoteIp);
  if (!captchaOk) {
    return { error: GENERIC_ERROR };
  }

  const { data: existingRows, error: existingError } = await db
    .from("zn_waitlist")
    .select("id, name, email, referral_code, referred_by, email_verified")
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) {
    console.error("Waitlist lookup error:", existingError.message);
    return { error: GENERIC_ERROR };
  }

  const existing = (existingRows?.[0] as WaitlistRow | undefined) ?? null;

  let waitlistId: string;
  let referralCode: string;

  if (existing) {
    if (existing.email_verified) {
      return { error: null };
    }

    referralCode = isValidReferralCode(existing.referral_code)
      ? existing.referral_code
      : await generateUniqueReferralCode();

    const nextReferredBy = existing.referred_by ?? normalizedReferredBy;

    const { error: updateError } = await db
      .from("zn_waitlist")
      .update({
        name: normalizedName,
        newsletter: Boolean(payload.newsletter),
        referred_by: nextReferredBy,
        referral_code: referralCode,
      })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Waitlist update error:", updateError.message);
      return { error: GENERIC_ERROR };
    }

    waitlistId = existing.id;
  } else {
    referralCode = await generateUniqueReferralCode();

    const { data: inserted, error: insertError } = await db
      .from("zn_waitlist")
      .insert({
        name: normalizedName,
        email: normalizedEmail,
        newsletter: Boolean(payload.newsletter),
        referral_code: referralCode,
        referred_by: normalizedReferredBy,
        email_verified: false,
      })
      .select("id")
      .single();

    if (insertError || !inserted?.id) {
      console.error("Waitlist insert error:", insertError?.message ?? "Missing inserted id");
      return { error: GENERIC_ERROR };
    }

    waitlistId = inserted.id as string;
  }

  const confirmToken = buildWaitlistConfirmToken({
    waitlistId,
    email: normalizedEmail,
  });
  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/waitlist?token=${encodeURIComponent(confirmToken)}`;

  try {
    await sendWaitlistConfirmationEmail({
      email: normalizedEmail,
      name: normalizedName,
      confirmUrl,
    });

    const { error: sentAtError } = await db
      .from("zn_waitlist")
      .update({ email_sent_at: new Date().toISOString() })
      .eq("id", waitlistId);

    if (sentAtError) {
      console.error("Waitlist email_sent_at update error:", sentAtError.message);
    }
  } catch (emailError) {
    console.error("Waitlist confirmation email error:", emailError);
    return { error: GENERIC_ERROR };
  }

  return { error: null };
}

export async function submitSurvey(
  payload: SurveyPayload,
): Promise<{ error: string | null; shouldContact: boolean }> {
  const { use_cases, other_use_case, want_early_trial, may_contact, comments } = payload;
  const resolved = await resolveReferralIdentity(payload.referral_code);
  if (!resolved) {
    return { error: GENERIC_ERROR, shouldContact: false };
  }

  const { data, error } = await db
    .from("zn_waitlist")
    .update({
      use_cases,
      other_use_case,
      want_early_trial,
      may_contact,
      comments,
      survey_completed_at: new Date().toISOString(),
    })
    .eq("referral_code", resolved.canonicalCode)
    .select("email, name, email_verified")
    .single();

  if (error) {
    console.error("Survey update error:", error.message);
    return { error: GENERIC_ERROR, shouldContact: false };
  }

  const integrateSelected = (use_cases ?? []).includes("Integrate with my app");
  const shouldContact = may_contact === true || want_early_trial === true;

  if (shouldContact && data?.email && data?.email_verified) {
    try {
      const reasons: string[] = [];
      if (want_early_trial) reasons.push("You expressed interest in trying ZcashNames before launch.");
      if (integrateSelected) reasons.push("You're interested in integrating ZcashNames with your app.");
      if (may_contact && reasons.length === 0) reasons.push("You said we could reach out.");
      const reasonCopy = reasons.join(" ");

      await sendFollowUp(data.email, data.name, reasonCopy);

      await db
        .from("zn_waitlist")
        .update({ followup_email_sent_at: new Date().toISOString() })
        .eq("referral_code", resolved.canonicalCode);
    } catch (emailErr) {
      console.error("Follow-up email error:", emailErr);
    }
  }

  return { error: null, shouldContact };
}

export async function getWaitlistCountForName(name: string): Promise<number> {
  const normalized = normalizeUsername(name);
  if (!isValidName(normalized)) return 0;
  try {
    const { count } = await db
      .from("zn_waitlist")
      .select("id", { count: "exact", head: true })
      .eq("name", normalized)
      .eq("email_verified", true);
    return count ?? 0;
  } catch {
    return 0;
  }
}


export interface ConfirmWaitlistResult {
  status: "success" | "already" | "invalid";
  ref?: string;
  name?: string;
}

export async function confirmWaitlistEmail(
  token: string,
): Promise<ConfirmWaitlistResult> {
  const parsed = parseWaitlistConfirmToken(token);
  if (!parsed || isWaitlistConfirmTokenExpired(parsed)) {
    return { status: "invalid" };
  }

  const { data, error } = await db
    .from("zn_waitlist")
    .select("id, name, email, referral_code, human_referral_code, email_verified")
    .eq("id", parsed.waitlistId)
    .single();

  if (error || !data) {
    return { status: "invalid" };
  }

  const row = data as WaitlistRow;
  if (!isWaitlistConfirmSignatureValid(parsed, row.email)) {
    return { status: "invalid" };
  }

  if (row.email_verified) {
    return { status: "already" };
  }

  const { error: updateError } = await db
    .from("zn_waitlist")
    .update({ email_verified: true })
    .eq("id", row.id);

  if (updateError) {
    console.error("Waitlist confirm update error:", updateError.message);
    return { status: "invalid" };
  }

  let preferredReferralCode = row.human_referral_code?.trim() || (row.referral_code ?? "");
  try {
    const ensured = await ensureHumanReferralCode({
      id: row.id,
      name: row.name,
      referral_code: row.referral_code ?? "",
      human_referral_code: row.human_referral_code ?? null,
    });
    preferredReferralCode = ensured.preferredCode;

    await sendWaitlistWelcomeEmail({
      email: row.email,
      name: row.name,
      canonicalReferralCode: ensured.canonicalCode,
      preferredReferralCode: ensured.preferredCode,
      baseUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    });
  } catch (emailError) {
    console.error("Waitlist welcome email error:", emailError);
  }

  return {
    status: "success",
    ref: preferredReferralCode || undefined,
    name: row.name,
  };
}
