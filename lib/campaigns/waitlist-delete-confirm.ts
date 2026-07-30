import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

export interface WaitlistDeleteConfirmTokenPayload {
  requestId: string;
  normalizedEmail: string;
}

function getDeleteSecret(): string {
  return resolveSecret(
    process.env.WAITLIST_DELETE_CONFIRM_SECRET,
    process.env.WAITLIST_VERIFY_TOKEN_SECRET ??
      process.env.WAITLIST_CONFIRM_RESPONSE_SECRET ??
      process.env.WAITLIST_CONFIRM_SECRET ??
      process.env.RESEND_API_KEY,
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

function formatOrigin(value: string): string {
  return value.replace(/\/$/, "");
}

export function buildWaitlistDeleteConfirmToken(
  payload: WaitlistDeleteConfirmTokenPayload,
): string {
  const encodedPayload = base64UrlEncode(
    JSON.stringify({
      requestId: payload.requestId.trim(),
      normalizedEmail: normalizeEmail(payload.normalizedEmail),
    }),
  );
  const signature = signHmac(getDeleteSecret(), encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function parseWaitlistDeleteConfirmToken(
  token: string,
): WaitlistDeleteConfirmTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = signHmac(getDeleteSecret(), encodedPayload);
  if (!safeEqual(expected, signature)) {
    return null;
  }

  const decoded = base64UrlDecode(encodedPayload);
  if (!decoded) {
    return null;
  }

  try {
    const parsed = JSON.parse(decoded) as Partial<WaitlistDeleteConfirmTokenPayload>;
    if (
      !parsed ||
      typeof parsed.requestId !== "string" ||
      typeof parsed.normalizedEmail !== "string"
    ) {
      return null;
    }

    return {
      requestId: parsed.requestId.trim(),
      normalizedEmail: normalizeEmail(parsed.normalizedEmail),
    };
  } catch {
    return null;
  }
}

export function buildWaitlistDeleteConfirmUrl(args: {
  baseUrl: string;
  token: string;
}): string {
  return `${formatOrigin(args.baseUrl)}/api/campaign-click/waitlist-delete?token=${encodeURIComponent(args.token)}`;
}
