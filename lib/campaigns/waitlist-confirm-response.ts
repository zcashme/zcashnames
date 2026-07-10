import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

const DEFAULT_CLICK_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_VERIFY_TOKEN_TTL_SECONDS = 60 * 30;

export interface WaitlistConfirmResponseTokenPayload {
  normalizedEmail: string;
  campaignId: string;
  exp: number;
}

export interface WaitlistVerifyTokenPayload {
  normalizedEmail: string;
  campaignId: string;
  exp: number;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getClickSecret(): string {
  return resolveSecret(
    process.env.WAITLIST_CONFIRM_RESPONSE_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET ?? process.env.RESEND_API_KEY,
  );
}

function getVerifySecret(): string {
  return resolveSecret(
    process.env.WAITLIST_VERIFY_TOKEN_SECRET,
    process.env.WAITLIST_CONFIRM_RESPONSE_SECRET ??
      process.env.WAITLIST_CONFIRM_SECRET ??
      process.env.RESEND_API_KEY,
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string): string | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  try {
    return Buffer.from(padded, "base64").toString("utf8");
  } catch {
    return null;
  }
}

function signPayload(secret: string, payload: string): string {
  return signHmac(secret, payload);
}

function buildSignedToken<T extends { normalizedEmail: string; campaignId: string; exp: number }>(
  payload: T,
  secret: string,
): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSignedToken<T extends { normalizedEmail: string; campaignId: string; exp: number }>(
  token: string,
  secret: string,
): T | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(secret, encodedPayload);
  if (!safeEqual(expected, signature)) return null;

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<T>;
    if (
      !parsed ||
      typeof parsed.normalizedEmail !== "string" ||
      typeof parsed.campaignId !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      ...parsed,
      normalizedEmail: normalizeEmail(parsed.normalizedEmail),
      campaignId: parsed.campaignId.trim(),
      exp: parsed.exp,
    } as T;
  } catch {
    return null;
  }
}

function formatOrigin(value: string): string {
  return value.replace(/\/$/, "");
}

function parsePositiveZecAmount(rawValue: string | undefined): string | null {
  const value = rawValue?.trim();
  if (!value) return null;
  if (!/^\d+(\.\d{1,8})?$/.test(value)) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return value;
}

export function getWaitlistVerifyPaymentAddress(): string | null {
  const value = process.env.WAITLIST_VERIFY_PAYMENT_ADDRESS?.trim();
  return value ? value : null;
}

export function getWaitlistVerifyReserveFeeZec(): string | null {
  return parsePositiveZecAmount(process.env.WAITLIST_VERIFY_RESERVE_FEE_ZEC);
}

export function buildWaitlistConfirmResponseToken(args: {
  normalizedEmail: string;
  campaignId: string;
  ttlSeconds?: number;
}): string {
  const normalizedEmail = normalizeEmail(args.normalizedEmail);
  if (!normalizedEmail) {
    throw new Error("Waitlist confirm response token requires a normalized email.");
  }

  return buildSignedToken<WaitlistConfirmResponseTokenPayload>(
    {
      normalizedEmail,
      campaignId: args.campaignId.trim(),
      exp: Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? DEFAULT_CLICK_TOKEN_TTL_SECONDS),
    },
    getClickSecret(),
  );
}

export function parseWaitlistConfirmResponseToken(
  token: string,
): WaitlistConfirmResponseTokenPayload | null {
  return parseSignedToken<WaitlistConfirmResponseTokenPayload>(token, getClickSecret());
}

export function buildWaitlistVerifyToken(args: {
  normalizedEmail: string;
  campaignId: string;
  ttlSeconds?: number;
}): string {
  const normalizedEmail = normalizeEmail(args.normalizedEmail);
  if (!normalizedEmail) {
    throw new Error("Waitlist verify token requires a normalized email.");
  }

  return buildSignedToken<WaitlistVerifyTokenPayload>(
    {
      normalizedEmail,
      campaignId: args.campaignId.trim(),
      exp: Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? DEFAULT_VERIFY_TOKEN_TTL_SECONDS),
    },
    getVerifySecret(),
  );
}

export function parseWaitlistVerifyToken(
  token: string,
): WaitlistVerifyTokenPayload | null {
  return parseSignedToken<WaitlistVerifyTokenPayload>(token, getVerifySecret());
}

export function buildWaitlistVerifyUrl(args: {
  baseUrl: string;
  token: string;
}): string {
  return `${formatOrigin(args.baseUrl)}/verify?token=${encodeURIComponent(args.token)}`;
}

export function buildWaitlistConfirmResponseTrackingUrl(args: {
  normalizedEmail: string | null | undefined;
  campaignId: string;
  baseUrl: string;
}): string | null {
  const normalizedEmail = args.normalizedEmail?.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const token = buildWaitlistConfirmResponseToken({
    normalizedEmail,
    campaignId: args.campaignId,
  });
  return `${formatOrigin(args.baseUrl)}/api/campaign-click/waitlist-confirm?token=${encodeURIComponent(token)}`;
}
