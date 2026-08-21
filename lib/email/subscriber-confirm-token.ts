import "server-only";

import { resolveSecret, safeEqual, signHmac } from "@/lib/hmac";

const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface ParsedSubscriberConfirmToken {
  email: string;
  series: string;
  seriesList: string[];
  expiresAt: number;
  signature: string;
}

function getSecret(): string {
  return resolveSecret(
    process.env.EMAIL_SUBSCRIBERS_SECRET,
    process.env.WAITLIST_CONFIRM_SECRET || process.env.RESEND_API_KEY,
  );
}

function canonicalizeSeriesList(series: string | string[]): string[] {
  return [
    ...new Set(
      (Array.isArray(series) ? series : series.split(","))
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function sign(email: string, seriesKey: string, expiresAt: number): string {
  return signHmac(getSecret(), `${email.trim().toLowerCase()}:${seriesKey}:${expiresAt}`);
}

export function buildSubscriberConfirmToken(args: {
  email: string;
  series: string | string[];
  ttlSeconds?: number;
}): string {
  const email = args.email.trim().toLowerCase();
  const seriesKey = canonicalizeSeriesList(args.series).join(",");
  const expiresAt = Math.floor(Date.now() / 1000) + (args.ttlSeconds ?? DEFAULT_TOKEN_TTL_SECONDS);
  return `${encodeURIComponent(email)}.${encodeURIComponent(seriesKey)}.${expiresAt}.${sign(email, seriesKey, expiresAt)}`;
}

export function parseSubscriberConfirmToken(token: string): ParsedSubscriberConfirmToken | null {
  const parts = token.split(".");
  if (parts.length < 4) return null;
  const signature = parts.pop();
  const rawExpiresAt = parts.pop();
  const rawSeries = parts.pop();
  const rawEmail = parts.join(".");
  if (!signature || !rawExpiresAt || !rawSeries || !rawEmail) return null;
  const email = decodeURIComponent(rawEmail).trim().toLowerCase();
  const seriesKey = decodeURIComponent(rawSeries).trim();
  const seriesList = seriesKey
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const expiresAt = Number(rawExpiresAt);
  if (!email || seriesList.length === 0 || !Number.isFinite(expiresAt)) return null;
  return {
    email,
    series: seriesList[0]!,
    seriesList,
    expiresAt,
    signature,
  };
}

export function isSubscriberConfirmTokenExpired(parsed: ParsedSubscriberConfirmToken): boolean {
  return parsed.expiresAt < Math.floor(Date.now() / 1000);
}

export function isSubscriberConfirmSignatureValid(
  parsed: ParsedSubscriberConfirmToken,
): boolean {
  const seriesKey = parsed.seriesList.join(",");
  const expected = sign(parsed.email, seriesKey, parsed.expiresAt);
  if (safeEqual(expected, parsed.signature)) return true;
  if (parsed.seriesList.length === 1) {
    return safeEqual(sign(parsed.email, parsed.series, parsed.expiresAt), parsed.signature);
  }
  return false;
}
