import "server-only";

// Cookie-based access control for the leaders commission dashboard.
// Issues signed cookies (base64url payload + HMAC signature) for two tiers:
// commission mode (cabal members) and referral table access (all users).
// Uses the same HMAC secret derivation as commission-pin.
import { safeEqual, signHmac, resolveSecret } from "@/lib/hmac";
import { parseSignedCookie, setCookie, clearCookie, getCookie } from "@/lib/cookie";
import { deriveCommissionPin, normalizeCommissionReferralCode } from "@/lib/leaders/commission-pin";

export const LEADERS_COMMISSION_COOKIE_NAME = "zn_leaders_commission";
export const LEADERS_REFERRALS_COOKIE_NAME = "zn_leaders_referrals";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  return resolveSecret(
    process.env.BETA_GATE_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET,
  );
}

function encodePayload(referralCode: string, expiresAt: number): string {
  return Buffer.from(
    JSON.stringify({ referralCode, expiresAt }),
    "utf8",
  ).toString("base64url");
}

function parseReferralPayload(
  value: string,
): { referralCode: string; expiresAt: number } | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as { referralCode?: unknown; expiresAt?: unknown };

    if (typeof parsed.referralCode !== "string" || !parsed.referralCode) return null;
    if (typeof parsed.expiresAt !== "number" || !Number.isFinite(parsed.expiresAt)) return null;
    if (parsed.expiresAt < Math.floor(Date.now() / 1000)) return null;

    return {
      referralCode: normalizeCommissionReferralCode(parsed.referralCode),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function buildCookieValue(referralCode: string): { value: string; expiresAt: number } {
  const normalizedCode = normalizeCommissionReferralCode(referralCode);
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = encodePayload(normalizedCode, expiresAt);
  const secret = getSecret();
  const signature = signHmac(secret, payload);
  return { value: `${payload}.${signature}`, expiresAt };
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
  await setCookie(LEADERS_COMMISSION_COOKIE_NAME, value, maxAge);
}

export async function clearCommissionAccessCookie(): Promise<void> {
  await clearCookie(LEADERS_COMMISSION_COOKIE_NAME);
}

export async function setReferralTableAccessCookie(referralCode: string): Promise<void> {
  const { value, expiresAt } = buildCookieValue(referralCode);
  const maxAge = expiresAt - Math.floor(Date.now() / 1000);
  await setCookie(LEADERS_REFERRALS_COOKIE_NAME, value, maxAge);
}

export async function hasCommissionAccess(referralCode: string): Promise<boolean> {
  const value = await getCookie(LEADERS_COMMISSION_COOKIE_NAME);
  if (!value) return false;

  const parsed = parseSignedCookie(value, getSecret(), parseReferralPayload);
  if (!parsed) return false;

  return parsed.referralCode === normalizeCommissionReferralCode(referralCode);
}

export async function hasReferralTableAccess(referralCode: string): Promise<boolean> {
  const value = await getCookie(LEADERS_REFERRALS_COOKIE_NAME);
  if (!value) return false;

  const parsed = parseSignedCookie(value, getSecret(), parseReferralPayload);
  if (!parsed) return false;

  return parsed.referralCode === normalizeCommissionReferralCode(referralCode);
}
