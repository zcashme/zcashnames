import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

const PRODUCTION_TRACKING_BASE_URL = "https://zcashnames.com";
const SAMPLE_TRACKING_URL =
  "https://zcashnames.com/api/campaign-click/waitlist-confirm?token=sample-token";
const SAMPLE_RESERVE_URL = "https://zcashnames.com/reserve?token=sample-token";

export interface WaitlistConfirmResponseTokenPayload {
  normalizedEmail: string;
  campaignId: string;
}

export interface WaitlistVerifyTokenPayload {
  normalizedEmail: string;
  campaignId: string;
}

function getSecret(): string {
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

function signVerifyPayload(payload: string): string {
  return signHmac(getVerifySecret(), payload);
}

export function getWaitlistConfirmResponseRedirectUrl(): string | null {
  const value = process.env.WAITLIST_CONFIRM_RESPONSE_REDIRECT_URL?.trim();
  if (!value) return null;
  return isValidRedirectUrl(value) ? value : null;
}

export function buildWaitlistConfirmResponseToken(args: {
  normalizedEmail: string;
  campaignId: string;
}): string {
  const normalizedEmail = args.normalizedEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Waitlist confirm response token requires a normalized email.");
  }

  const payload: WaitlistConfirmResponseTokenPayload = {
    normalizedEmail,
    campaignId: args.campaignId.trim(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function buildWaitlistVerifyToken(args: {
  normalizedEmail: string;
  campaignId: string;
}): string {
  const normalizedEmail = args.normalizedEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Waitlist reserve token requires a normalized email.");
  }

  const payload: WaitlistVerifyTokenPayload = {
    normalizedEmail,
    campaignId: args.campaignId.trim(),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${signVerifyPayload(encodedPayload)}`;
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
      typeof parsed.normalizedEmail !== "string" ||
      typeof parsed.campaignId !== "string"
    ) {
      return null;
    }
    return {
      normalizedEmail: parsed.normalizedEmail.trim().toLowerCase(),
      campaignId: parsed.campaignId.trim(),
    };
  } catch {
    return null;
  }
}

function replaceTemplateTokens(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = values[key];
    return value === undefined ? match : encodeURIComponent(value);
  });
}

export function buildWaitlistConfirmResponseRedirectUrl(args: {
  redirectUrlTemplate: string;
  normalizedEmail: string;
  campaignId: string;
  names: string[];
  waitlistIds: string[];
  referralCodes: string[];
  humanReferralCodes: string[];
}): string {
  const template = args.redirectUrlTemplate.trim();
  if (!isValidRedirectUrl(template)) {
    throw new Error("WAITLIST_CONFIRM_RESPONSE_REDIRECT_URL must be a valid absolute http(s) URL.");
  }

  const firstName = args.names[0] ?? "";
  const values = {
    email: args.normalizedEmail,
    normalized_email: args.normalizedEmail,
    campaign_id: args.campaignId,
    name: firstName,
    names_csv: args.names.join(","),
    waitlist_ids_csv: args.waitlistIds.join(","),
    referral_codes_csv: args.referralCodes.join(","),
    human_referral_codes_csv: args.humanReferralCodes.join(","),
    waitlist_count: String(args.waitlistIds.length),
  };
  const replaced = replaceTemplateTokens(template, values);
  const url = new URL(replaced);

  if (!/\{\{/.test(template)) {
    url.searchParams.set("email", args.normalizedEmail);
    url.searchParams.set("normalized_email", args.normalizedEmail);
    url.searchParams.set("campaign_id", args.campaignId);
    if (firstName) url.searchParams.set("name", firstName);
    if (args.names.length > 0) url.searchParams.set("names", args.names.join(","));
    if (args.waitlistIds.length > 0) url.searchParams.set("waitlist_ids", args.waitlistIds.join(","));
    if (args.referralCodes.length > 0) {
      url.searchParams.set("referral_codes", args.referralCodes.join(","));
    }
    if (args.humanReferralCodes.length > 0) {
      url.searchParams.set("human_referral_codes", args.humanReferralCodes.join(","));
    }
    url.searchParams.set("waitlist_count", String(args.waitlistIds.length));
  }

  return url.toString();
}

export function buildWaitlistConfirmResponseTrackingUrl(args: {
  normalizedEmail: string | null | undefined;
  campaignId: string;
  baseUrl: string;
  fallbackToSample?: boolean;
}): string | null {
  const normalizedEmail = args.normalizedEmail?.trim().toLowerCase();
  if (!normalizedEmail) {
    return args.fallbackToSample ? SAMPLE_TRACKING_URL : null;
  }

  const token = buildWaitlistConfirmResponseToken({
    normalizedEmail,
    campaignId: args.campaignId,
  });
  return `${PRODUCTION_TRACKING_BASE_URL}/api/campaign-click/waitlist-confirm?token=${encodeURIComponent(token)}`;
}

export function buildWaitlistReserveUrl(args: {
  normalizedEmail: string | null | undefined;
  campaignId: string;
  fallbackToSample?: boolean;
}): string | null {
  const normalizedEmail = args.normalizedEmail?.trim().toLowerCase();
  if (!normalizedEmail) {
    return args.fallbackToSample ? SAMPLE_RESERVE_URL : null;
  }

  const token = buildWaitlistVerifyToken({
    normalizedEmail,
    campaignId: args.campaignId,
  });
  return `${PRODUCTION_TRACKING_BASE_URL}/reserve?token=${encodeURIComponent(token)}`;
}
