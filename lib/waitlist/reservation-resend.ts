import "server-only";

import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const WAITLIST_RESERVATION_RESEND_COOKIE_NAME = "zn_waitlist_reservation_resend";
export const WAITLIST_RESERVATION_RESEND_REQUEST_SOURCE = "self_serve_resend";
export const WAITLIST_RESERVATION_RESEND_ACCEPTED_MESSAGE =
  "If this address is on the waitlist and has not received a reservation email in the last 48 hours, a new reservation link will be sent.";
export const WAITLIST_RESERVATION_RESEND_ERROR_MESSAGE =
  "Could not process reservation recovery right now. Please try again.";
export const WAITLIST_RESERVATION_RESEND_MIN_RESPONSE_MS = 600;

const SESSION_WINDOW_MS = 10 * 60 * 1000;
const SESSION_LIMIT = 3;
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_LIMIT = 5;
const GLOBAL_WINDOW_MS = 60 * 1000;
const GLOBAL_LIMIT = 30;
const EMAIL_SUPPRESSION_MS = 48 * 60 * 60 * 1000;
const DEFAULT_WAITLIST_RESEND_CAMPAIGN_ID = "9c1d2f1a-2e77-4b61-9d40-0e4c3a6cc7f3";

type SessionPayload = {
  attempts: number[];
  expiresAt: number;
};

export type WaitlistReservationResendOutcome =
  | "sent"
  | "throttled"
  | "no_match"
  | "provider_error";

function getSecret(): string {
  const secret =
    process.env.WAITLIST_CONFIRM_RESPONSE_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.BETA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing waitlist reservation resend secret.");
  }
  return secret;
}

function safeEqual(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue);
  const right = Buffer.from(rightValue);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(value: string): SessionPayload | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      attempts?: unknown;
      expiresAt?: unknown;
    };
    if (!Array.isArray(parsed.attempts) || typeof parsed.expiresAt !== "number") {
      return null;
    }
    if (parsed.expiresAt < Date.now()) return null;

    const attempts = parsed.attempts.filter(
      (attempt): attempt is number => typeof attempt === "number" && Number.isFinite(attempt),
    );
    return { attempts, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function recordWaitlistReservationResendSessionAttempt(
  now = Date.now(),
): Promise<boolean> {
  const store = await cookies();
  const raw = store.get(WAITLIST_RESERVATION_RESEND_COOKIE_NAME)?.value;
  const parsed = raw ? decodePayload(raw) : null;
  const attempts = (parsed?.attempts ?? []).filter((value) => now - value < SESSION_WINDOW_MS);
  const throttled = attempts.length >= SESSION_LIMIT;
  const nextAttempts = [...attempts, now];
  const expiresAt = now + SESSION_WINDOW_MS;
  const payload = encodePayload({ attempts: nextAttempts, expiresAt });
  const signed = `${payload}.${sign(payload)}`;
  const maxAge = Math.max(1, Math.ceil((expiresAt - now) / 1000));

  store.set(
    WAITLIST_RESERVATION_RESEND_COOKIE_NAME,
    signed,
    cookieOptions(maxAge),
  );
  return throttled;
}

export function normalizeWaitlistReservationResendIp(value: string | null): string {
  const raw = value?.split(",")[0]?.trim();
  return raw && raw.length > 0 ? raw : "unknown";
}

export function hashWaitlistReservationResendIp(value: string): string {
  return createHash("sha256").update(`${getSecret()}:${value}`).digest("hex");
}

export function waitlistReservationResendThrottleConfig() {
  return {
    session: { windowMs: SESSION_WINDOW_MS, limit: SESSION_LIMIT },
    ip: { windowMs: IP_WINDOW_MS, limit: IP_LIMIT },
    global: { windowMs: GLOBAL_WINDOW_MS, limit: GLOBAL_LIMIT },
    suppressionMs: EMAIL_SUPPRESSION_MS,
  };
}

export function getWaitlistReservationResendCampaignId(): string {
  const configured = process.env.WAITLIST_RESEND_CAMPAIGN_ID?.trim();
  return configured && configured.length > 0
    ? configured
    : DEFAULT_WAITLIST_RESEND_CAMPAIGN_ID;
}

export async function countRecentWaitlistReservationResendAttempts(args: {
  ipHash?: string | null;
  sinceIso: string;
}): Promise<{ ipCount: number; globalCount: number }> {
  const [ipResult, globalResult] = await Promise.all([
    args.ipHash
      ? db
          .from("waitlist_reservation_resend_attempts")
          .select("*", { count: "exact", head: true })
          .eq("request_source", WAITLIST_RESERVATION_RESEND_REQUEST_SOURCE)
          .eq("ip_hash", args.ipHash)
          .gte("created_at", args.sinceIso)
      : Promise.resolve({ count: 0, error: null } as const),
    db
      .from("waitlist_reservation_resend_attempts")
      .select("*", { count: "exact", head: true })
      .eq("request_source", WAITLIST_RESERVATION_RESEND_REQUEST_SOURCE)
      .gte("created_at", args.sinceIso),
  ]);

  if (ipResult.error) throw new Error(ipResult.error.message);
  if (globalResult.error) throw new Error(globalResult.error.message);

  return {
    ipCount: args.ipHash ? Number(ipResult.count ?? 0) : 0,
    globalCount: Number(globalResult.count ?? 0),
  };
}

export async function wasWaitlistReservationResendSentRecently(
  normalizedEmail: string,
  now = Date.now(),
): Promise<boolean> {
  const cutoffIso = new Date(now - EMAIL_SUPPRESSION_MS).toISOString();
  const { count, error } = await db
    .from("waitlist_reservation_resend_attempts")
    .select("*", { count: "exact", head: true })
    .eq("normalized_email", normalizedEmail)
    .eq("outcome", "sent")
    .gte("created_at", cutoffIso);

  if (error) throw new Error(error.message);
  return Number(count ?? 0) > 0;
}

export async function recordWaitlistReservationResendLog(args: {
  normalizedEmail: string;
  matchedRowCount: number;
  verifiedBeforeClickCount: number;
  reservedBeforeClickCount: number;
  outcome: WaitlistReservationResendOutcome;
  providerMessageId?: string | null;
  ipHash: string;
}): Promise<void> {
  const { error } = await db.from("waitlist_reservation_resend_attempts").insert({
    normalized_email: args.normalizedEmail,
    request_source: WAITLIST_RESERVATION_RESEND_REQUEST_SOURCE,
    matched_row_count: args.matchedRowCount,
    verified_before_click_count: args.verifiedBeforeClickCount,
    reserved_before_click_count: args.reservedBeforeClickCount,
    outcome: args.outcome,
    provider_message_id: args.providerMessageId ?? null,
    ip_hash: args.ipHash,
  });

  if (error) {
    console.error("[waitlist-resend] could not record resend attempt", {
      normalizedEmail: args.normalizedEmail,
      outcome: args.outcome,
      error: error.message,
    });
  }
}

export async function applyWaitlistReservationResendMinimumDelay(
  startedAt: number,
): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= WAITLIST_RESERVATION_RESEND_MIN_RESPONSE_MS) return;
  await new Promise((resolve) =>
    setTimeout(resolve, WAITLIST_RESERVATION_RESEND_MIN_RESPONSE_MS - elapsed),
  );
}
