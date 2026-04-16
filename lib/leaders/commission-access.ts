import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { deriveCommissionPin, normalizeCommissionReferralCode } from "@/lib/leaders/commission-pin";

export const LEADERS_COMMISSION_COOKIE_NAME = "zn_leaders_commission";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  const secret =
    process.env.BETA_GATE_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Missing BETA_GATE_SECRET (or fallback secret).");
  }
  return secret;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(referralCode: string, expiresAt: number): string {
  return createHmac("sha256", getSecret())
    .update(`${referralCode}:${expiresAt}`)
    .digest("hex");
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

function buildCookieValue(referralCode: string): { value: string; expiresAt: number } {
  const normalizedCode = normalizeCommissionReferralCode(referralCode);
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ referralCode: normalizedCode, expiresAt }), "utf8").toString("base64url");

  return { value: `${payload}.${sign(normalizedCode, expiresAt)}`, expiresAt };
}

function parseCookieValue(value: string): { referralCode: string; expiresAt: number } | null {
  const parts = value.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  let parsed: { referralCode?: unknown; expiresAt?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      referralCode?: unknown;
      expiresAt?: unknown;
    };
  } catch {
    return null;
  }

  if (typeof parsed.referralCode !== "string" || !parsed.referralCode) return null;
  if (typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt)) return null;
  if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;

  const normalizedCode = normalizeCommissionReferralCode(parsed.referralCode);
  if (!safeEqual(signature, sign(normalizedCode, parsed.expiresAt))) return null;

  return { referralCode: normalizedCode, expiresAt: parsed.expiresAt };
}

export function verifyCommissionPin(referralCode: string, pin: string): boolean {
  const normalizedPin = pin.trim();
  if (!/^\d{6}$/.test(normalizedPin)) return false;

  const expected = deriveCommissionPin(referralCode, getSecret());
  return safeEqual(normalizedPin, expected);
}

export function getCommissionPin(referralCode: string): string {
  return deriveCommissionPin(referralCode, getSecret());
}

export async function setCommissionAccessCookie(referralCode: string): Promise<void> {
  const { value, expiresAt } = buildCookieValue(referralCode);
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);
  const store = await cookies();

  store.set(LEADERS_COMMISSION_COOKIE_NAME, value, cookieOptions(maxAge));
}

export async function clearCommissionAccessCookie(): Promise<void> {
  const store = await cookies();

  store.set(LEADERS_COMMISSION_COOKIE_NAME, "", cookieOptions(0));
}

export async function hasCommissionAccess(referralCode: string): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(LEADERS_COMMISSION_COOKIE_NAME);
  if (!cookie?.value) return false;

  const parsed = parseCookieValue(cookie.value);
  if (!parsed) return false;

  return parsed.referralCode === normalizeCommissionReferralCode(referralCode);
}
