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

import { createHash } from "crypto";
import { headers } from "next/headers";
import emailValidator from "node-email-verifier";
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
import {
  createWaitlistCaptcha,
  verifyWaitlistCaptcha,
  type WaitlistCaptchaChallenge,
} from "@/lib/waitlist/captcha";
import { normalizeUsername } from "@/lib/zns/utils";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const MAX_REFERRAL_CODE_RETRIES = 6;
const CAPTCHA_IP_WINDOW_MS = 60 * 60 * 1000;
const CAPTCHA_IP_LIMIT = 20;
const CAPTCHA_EMAIL_WINDOW_MS = 60 * 60 * 1000;
const CAPTCHA_EMAIL_LIMIT = 5;
const CAPTCHA_GLOBAL_WINDOW_MS = 60 * 1000;
const CAPTCHA_GLOBAL_LIMIT = 120;

export interface WaitlistPayload {
  name: string;
  email: string;
  newsletter: boolean;
  referral_code: string;
  referred_by: string | null;
  captcha_token: string;
  captcha_answer: string;
}

export async function getWaitlistCaptcha(): Promise<WaitlistCaptchaChallenge> {
  return createWaitlistCaptcha();
}

function waitlistCaptchaSecret(): string {
  const secret =
    process.env.WAITLIST_CAPTCHA_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.BETA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing waitlist captcha throttle secret.");
  }
  return secret;
}

function hashWaitlistCaptchaKey(value: string): string {
  return createHash("sha256").update(`${waitlistCaptchaSecret()}:${value}`).digest("hex");
}

function normalizeWaitlistCaptchaIp(value: string | null): string {
  const raw = value?.split(",")[0]?.trim();
  return raw && raw.length > 0 ? raw : "unknown";
}

function waitlistCaptchaWindowStart(now: number, windowMs: number): string {
  return new Date(Math.floor(now / windowMs) * windowMs).toISOString();
}

type WaitlistCaptchaThrottleRow = {
  count: number | null;
};

async function recordWaitlistCaptchaAttempt({
  scope,
  key,
  windowStartedAt,
}: {
  scope: "ip" | "email" | "global";
  key: string;
  windowStartedAt: string;
}): Promise<number> {
  const nowIso = new Date().toISOString();
  let existingCount = 0;
  let rowExists = false;
  const readCurrent = async (): Promise<void> => {
    const { data: current, error: currentError } = await db
      .from("waitlist_captcha_attempts")
      .select("count")
      .eq("scope", scope)
      .eq("key", key)
      .eq("window_started_at", windowStartedAt)
      .maybeSingle();

    if (currentError) throw currentError;
    rowExists = Boolean(current);
    existingCount = Math.max(0, Number((current as WaitlistCaptchaThrottleRow | null)?.count ?? 0));
  };

  await readCurrent();

  if (!rowExists) {
    const { error: insertError } = await db
      .from("waitlist_captcha_attempts")
      .insert({
        scope,
        key,
        window_started_at: windowStartedAt,
        count: 1,
        updated_at: nowIso,
      });

    if (!insertError) return 1;
    if (insertError.code !== "23505") throw insertError;
    await readCurrent();
  }

  const nextCount = existingCount + 1;
  const { error: updateError } = await db
    .from("waitlist_captcha_attempts")
    .update({ count: nextCount, updated_at: nowIso })
    .eq("scope", scope)
    .eq("key", key)
    .eq("window_started_at", windowStartedAt);

  if (updateError) throw updateError;
  return nextCount;
}

async function recordAndCheckWaitlistCaptchaThrottle({
  email,
  remoteIp,
  now,
}: {
  email: string;
  remoteIp: string | null;
  now: number;
}): Promise<boolean> {
  const ipKey = hashWaitlistCaptchaKey(normalizeWaitlistCaptchaIp(remoteIp));
  const emailKey = hashWaitlistCaptchaKey(email);
  const [ipCount, emailCount, globalCount] = await Promise.all([
    recordWaitlistCaptchaAttempt({
      scope: "ip",
      key: ipKey,
      windowStartedAt: waitlistCaptchaWindowStart(now, CAPTCHA_IP_WINDOW_MS),
    }),
    recordWaitlistCaptchaAttempt({
      scope: "email",
      key: emailKey,
      windowStartedAt: waitlistCaptchaWindowStart(now, CAPTCHA_EMAIL_WINDOW_MS),
    }),
    recordWaitlistCaptchaAttempt({
      scope: "global",
      key: "global",
      windowStartedAt: waitlistCaptchaWindowStart(now, CAPTCHA_GLOBAL_WINDOW_MS),
    }),
  ]);

  return (
    ipCount > CAPTCHA_IP_LIMIT ||
    emailCount > CAPTCHA_EMAIL_LIMIT ||
    globalCount > CAPTCHA_GLOBAL_LIMIT
  );
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

async function validateEmail(email: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await emailValidator(email, {
      checkMx: true,
      checkDisposable: true,
      detailed: true,
      timeout: "3s",
    });
    if (typeof res === "boolean") {
      return res ? { valid: true } : { valid: false, error: "Please enter a valid email address." };
    }
    if (res.valid) return { valid: true };
    if (res.format && !res.format.valid) {
      return { valid: false, error: "Please enter a valid email address." };
    }
    if (res.disposable && !res.disposable.valid) {
      return { valid: false, error: "Please use a non-disposable email address." };
    }
    if (res.mx && !res.mx.valid) {
      return { valid: false, error: "We couldn't reach that email's mail server. Please double-check it." };
    }
    return { valid: false, error: "Please enter a valid email address." };
  } catch (err) {
    // DNS/network failure — don't block the user, the confirmation email is the backup gate.
    console.error("Email validation error:", err);
    return { valid: true };
  }
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
  const startedAt = Date.now();

  if (!isValidName(normalizedName)) {
    return { error: GENERIC_ERROR };
  }

  const captchaOk = verifyWaitlistCaptcha({
    token: String(payload.captcha_token ?? ""),
    answer: String(payload.captcha_answer ?? ""),
    now: startedAt,
  });
  if (!captchaOk) {
    return { error: "Please solve the human check below." };
  }

  const emailCheck = await validateEmail(normalizedEmail);
  if (!emailCheck.valid) {
    return { error: emailCheck.error ?? GENERIC_ERROR };
  }

  const headerStore = await headers();
  const remoteIp =
    headerStore.get("cf-connecting-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;
  try {
    const throttled = await recordAndCheckWaitlistCaptchaThrottle({
      email: normalizedEmail,
      remoteIp,
      now: startedAt,
    });
    if (throttled) {
      return { error: GENERIC_ERROR };
    }
  } catch (throttleError) {
    console.error("Waitlist throttle error:", throttleError);
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
