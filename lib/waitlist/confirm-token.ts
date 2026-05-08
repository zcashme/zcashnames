import "server-only";

import { safeEqual, signHmac, resolveSecret } from "@/lib/hmac";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24;

export interface ParsedWaitlistConfirmToken {
  waitlistId: string;
  expiresAt: number;
  signature: string;
}

function getSecret(): string {
  return resolveSecret(
    process.env.WAITLIST_CONFIRM_SECRET,
    process.env.RESEND_API_KEY,
  );
}

function sign(waitlistId: string, email: string, expiresAt: number): string {
  const message = `${waitlistId}:${email.toLowerCase().trim()}:${expiresAt}`;
  return signHmac(getSecret(), message);
}

export function buildWaitlistConfirmToken({
  waitlistId,
  email,
  ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS,
}: {
  waitlistId: string;
  email: string;
  ttlSeconds?: number;
}): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = sign(waitlistId, email, expiresAt);
  return `${waitlistId}.${expiresAt}.${signature}`;
}

export function parseWaitlistConfirmToken(token: string): ParsedWaitlistConfirmToken | null {
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const signature = parts.pop();
  const expiresRaw = parts.pop();
  const waitlistId = parts.join(".");
  if (!signature || !expiresRaw || !waitlistId) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;

  return { waitlistId, expiresAt, signature };
}

export function isWaitlistConfirmTokenExpired(parsed: ParsedWaitlistConfirmToken): boolean {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return parsed.expiresAt < nowSeconds;
}

export function isWaitlistConfirmSignatureValid(
  parsed: ParsedWaitlistConfirmToken,
  email: string,
): boolean {
  const expected = sign(parsed.waitlistId, email, parsed.expiresAt);
  return safeEqual(expected, parsed.signature);
}
