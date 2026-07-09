import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface WaitlistConfirmResponseTokenPayload {
  waitlistId: string;
  campaignId: string;
  redirectUrl: string;
  exp: number;
}

function getSecret(): string {
  return resolveSecret(
    process.env.WAITLIST_CONFIRM_RESPONSE_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET || process.env.RESEND_API_KEY,
  );
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

function isValidRedirectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function signPayload(payload: string): string {
  return signHmac(getSecret(), payload);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function getWaitlistConfirmResponseRedirectUrl(): string | null {
  const value = process.env.WAITLIST_CONFIRM_RESPONSE_REDIRECT_URL?.trim();
  if (!value) return null;
  return isValidRedirectUrl(value) ? value : null;
}

export function buildWaitlistConfirmResponseToken(args: {
  waitlistId: string;
  campaignId: string;
  redirectUrl: string;
  ttlSeconds?: number;
}): string {
  const redirectUrl = args.redirectUrl.trim();
  if (!isValidRedirectUrl(redirectUrl)) {
    throw new Error("WAITLIST_CONFIRM_RESPONSE_REDIRECT_URL must be a valid absolute http(s) URL.");
  }

  const payload: WaitlistConfirmResponseTokenPayload = {
    waitlistId: args.waitlistId.trim(),
    campaignId: args.campaignId.trim(),
    redirectUrl,
    exp: Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseWaitlistConfirmResponseToken(
  token: string,
): WaitlistConfirmResponseTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  if (!safeEqual(expected, signature)) return null;

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<WaitlistConfirmResponseTokenPayload>;
    if (
      !parsed ||
      typeof parsed.waitlistId !== "string" ||
      typeof parsed.campaignId !== "string" ||
      typeof parsed.redirectUrl !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    if (!isValidRedirectUrl(parsed.redirectUrl)) return null;

    return {
      waitlistId: parsed.waitlistId.trim(),
      campaignId: parsed.campaignId.trim(),
      redirectUrl: parsed.redirectUrl.trim(),
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function buildWaitlistConfirmResponseTrackingUrl(args: {
  waitlistId: string | null | undefined;
  campaignId: string;
  baseUrl: string;
}): string | null {
  const waitlistId = args.waitlistId?.trim();
  if (!waitlistId) return null;

  const redirectUrl = getWaitlistConfirmResponseRedirectUrl();
  if (!redirectUrl) return null;

  const token = buildWaitlistConfirmResponseToken({
    waitlistId,
    campaignId: args.campaignId,
    redirectUrl,
  });
  return `${args.baseUrl.replace(/\/$/, "")}/api/campaign-click/waitlist-confirm?token=${encodeURIComponent(token)}`;
}
