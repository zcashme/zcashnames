import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface ParsedSubscriberConfirmToken {
  email: string;
  series: string;
  expiresAt: number;
  signature: string;
}

function getSecret(): string {
  return resolveSecret(
    process.env.EMAIL_SUBSCRIBERS_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET || process.env.RESEND_API_KEY,
  );
}

function sign(email: string, series: string, expiresAt: number): string {
  return signHmac(getSecret(), `${email.trim().toLowerCase()}:${series}:${expiresAt}`);
}

export function buildSubscriberConfirmToken(args: {
  email: string;
  series: string;
  ttlSeconds?: number;
}): string {
  const email = args.email.trim().toLowerCase();
  const series = args.series.trim();
  const expiresAt =
    Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS);
  return `${encodeURIComponent(email)}.${encodeURIComponent(series)}.${expiresAt}.${sign(email, series, expiresAt)}`;
}

export function parseSubscriberConfirmToken(token: string): ParsedSubscriberConfirmToken | null {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [rawEmail, rawSeries, rawExpiresAt, signature] = parts;
  const email = decodeURIComponent(rawEmail).trim().toLowerCase();
  const series = decodeURIComponent(rawSeries).trim();
  const expiresAt = Number(rawExpiresAt);
  if (!email || !series || !Number.isFinite(expiresAt) || !signature) return null;
  return { email, series, expiresAt, signature };
}

export function isSubscriberConfirmTokenExpired(
  parsed: ParsedSubscriberConfirmToken,
): boolean {
  return parsed.expiresAt < Math.floor(Date.now() / 1000);
}

export function isSubscriberConfirmSignatureValid(
  parsed: ParsedSubscriberConfirmToken,
): boolean {
  const expected = sign(parsed.email, parsed.series, parsed.expiresAt);
  return safeEqual(expected, parsed.signature);
}
