"use server";

import { createHash } from "crypto";
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
import { normalizeUsername } from "@/lib/zns/name";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const MAX_REFERRAL_CODE_RETRIES = 6;

export interface WaitlistPayload {
  name: string;
  email: string;
  newsletter: boolean;
  referral_code: string;
  referred_by: string | null;
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

function normalizeReferredBy(input: string | null): string | null {
  const code = (input ?? "").trim();
  return isValidReferralCode(code) ? code : null;
}

function resolveBaseUrl(headerStore: { get(name: string): string | null }): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const proto = headerStore.get("x-forwarded-proto") || "https";
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  if (host) return `${proto}://${host}`;
  return "https://zcashnames.com";
}

export async function submitWaitlist(
  payload: WaitlistPayload,
): Promise<{ error: string | null }> {
  const normalizedName = normalizeUsername(payload.name);
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedReferredBy = normalizeReferredBy(payload.referred_by);

  if (!isValidName(normalizedName) || !isValidEmail(normalizedEmail)) {
    return { error: GENERIC_ERROR };
  }

  const headerStore = await headers();

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
  const confirmUrl = `${resolveBaseUrl(headerStore)}/?token=${encodeURIComponent(confirmToken)}`;

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
    .eq("referral_code", payload.referral_code)
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
      if (integrateSelected) reasons.push("You’re interested in integrating ZcashNames with your app.");
      if (may_contact && reasons.length === 0) reasons.push("You said we could reach out.");
      const reasonCopy = reasons.join(" ");

      await sendFollowUp(data.email, data.name, reasonCopy);

      await db
        .from("zn_waitlist")
        .update({ followup_email_sent_at: new Date().toISOString() })
        .eq("referral_code", payload.referral_code);
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

export async function getWaitlistStats(): Promise<{
  waitlist: number;
  referred: number;
  rewardsPot: number;
}> {
  try {
    const { count: waitlistCount } = await db
      .from("zn_waitlist")
      .select("*", { count: "exact", head: true });

    const { count: referredCount } = await db
      .from("zn_waitlist")
      .select("*", { count: "exact", head: true })
      .not("referred_by", "is", null);

    const waitlist = waitlistCount ?? 0;
    const referred = referredCount ?? 0;

    return {
      waitlist,
      referred,
      rewardsPot: Math.round(referred * 0.05 * 1000) / 1000,
    };
  } catch {
    return { waitlist: 0, referred: 0, rewardsPot: 0 };
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
    .select("id, name, email, referral_code, email_verified")
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

  try {
    await sendWaitlistWelcomeEmail({
      email: row.email,
      name: row.name,
      referralCode: row.referral_code ?? "",
      baseUrl: resolveBaseUrl(headerStore),
    });
  } catch (emailError) {
    console.error("Waitlist welcome email error:", emailError);
  }

  return {
    status: "success",
    ref: row.referral_code ?? undefined,
    name: row.name,
  };
}
