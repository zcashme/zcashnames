import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

export type UnsubscribeMode = "series" | "all";

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

export function parseUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
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
      (parsed.mode !== "series" && parsed.mode !== "all") ||
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
