import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

export type UnsubscribeMode = "series" | "all" | "manage";

export interface UnsubscribeTokenPayload {
  email: string;
  series: string;
  mode: UnsubscribeMode;
  exp: number;
}

function getSecret(): string {
  return resolveSecret(
    process.env.EMAIL_SUBSCRIBERS_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET || process.env.RESEND_API_KEY,
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

function signPayload(payload: string): string {
  return signHmac(getSecret(), payload);
}

export function buildUnsubscribeToken(args: {
  email: string;
  series: string;
  mode: UnsubscribeMode;
  ttlSeconds?: number;
}): string {
  const payload: UnsubscribeTokenPayload = {
    email: args.email.trim().toLowerCase(),
    series: args.series.trim(),
    mode: args.mode,
    exp: Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? 60 * 60 * 24 * 30),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function normalizeIncomingToken(token: string): string {
  let value = token.trim().replace(/\s+/g, "");
  if (value.includes("%")) {
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the trimmed token if it was not URI-encoded.
    }
  }
  return value;
}

export function parseUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  const normalized = normalizeIncomingToken(token);
  const lastDot = normalized.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === normalized.length - 1) return null;
  const encodedPayload = normalized.slice(0, lastDot);
  const signature = normalized.slice(lastDot + 1);
  if (!encodedPayload || !signature) return null;
  const expected = signPayload(encodedPayload);
  if (!safeEqual(expected, signature)) return null;

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as Partial<UnsubscribeTokenPayload>;
    if (
      !parsed ||
      typeof parsed.email !== "string" ||
      typeof parsed.series !== "string" ||
      (parsed.mode !== "series" && parsed.mode !== "all" && parsed.mode !== "manage") ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      email: parsed.email.trim().toLowerCase(),
      series: parsed.series.trim(),
      mode: parsed.mode,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}
