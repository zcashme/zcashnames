import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

export interface WaitlistConfirmResponseTokenPayload {
  normalizedEmail: string;
  campaignId: string;
}

export interface WaitlistVerifyTokenPayload {
  normalizedEmail: string;
  campaignId: string;
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

function buildSignedToken<T extends { normalizedEmail: string; campaignId: string }>(
  payload: T,
  secret: string,
): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseSignedToken<T extends { normalizedEmail: string; campaignId: string }>(
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
      typeof parsed.campaignId !== "string"
    ) {
      return null;
    }

    return {
      ...parsed,
      normalizedEmail: normalizeEmail(parsed.normalizedEmail),
      campaignId: parsed.campaignId.trim(),
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

export function getWaitlistReservePaymentAddress(): string | null {
  const value =
    process.env.WAITLIST_RESERVE_PAYMENT_ADDRESS?.trim()
    ?? process.env.WAITLIST_ADMIN_WALLET?.trim()
    // Temporary fallbacks while envs migrate off the old names.
    ?? process.env.WAITLIST_VERIFY_PAYMENT_ADDRESS?.trim();
  return value ? value : null;
}

/** @deprecated Use getWaitlistReservePaymentAddress */
export const getWaitlistVerifyPaymentAddress = getWaitlistReservePaymentAddress;

export function getWaitlistReserveFeeZec(): string | null {
  return parsePositiveZecAmount(
    process.env.WAITLIST_RESERVE_FEE_ZEC
      // Temporary fallback while envs migrate off the old name.
      ?? process.env.WAITLIST_VERIFY_RESERVE_FEE_ZEC,
  );
}

/** @deprecated Use getWaitlistReserveFeeZec */
export const getWaitlistVerifyReserveFeeZec = getWaitlistReserveFeeZec;

export function buildWaitlistConfirmResponseToken(args: {
  normalizedEmail: string;
  campaignId: string;
}): string {
  const normalizedEmail = normalizeEmail(args.normalizedEmail);
  if (!normalizedEmail) {
    throw new Error("Waitlist confirm response token requires a normalized email.");
  }

  return buildSignedToken<WaitlistConfirmResponseTokenPayload>(
    {
      normalizedEmail,
      campaignId: args.campaignId.trim(),
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
}): string {
  const normalizedEmail = normalizeEmail(args.normalizedEmail);
  if (!normalizedEmail) {
    throw new Error("Waitlist verify token requires a normalized email.");
  }

  return buildSignedToken<WaitlistVerifyTokenPayload>(
    {
      normalizedEmail,
      campaignId: args.campaignId.trim(),
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
  return `${formatOrigin(args.baseUrl)}/reserve?token=${encodeURIComponent(args.token)}`;
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
