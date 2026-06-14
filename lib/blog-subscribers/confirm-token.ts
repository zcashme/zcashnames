import crypto from "node:crypto";

const BLOG_SUBSCRIBER_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type BlogSubscriberTokenArgs = {
  subscriberId: string;
  email: string;
  series: string;
};

type ParsedBlogSubscriberToken = {
  subscriberId: string;
  expiresAt: number;
  signature: string;
};

function subscriberTokenSecret(): string {
  const secret =
    process.env.BLOG_SUBSCRIBER_CONFIRM_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.BETA_GATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) throw new Error("Missing blog subscriber confirmation secret.");
  return secret;
}

function sign(subscriberId: string, email: string, series: string, expiresAt: number): string {
  const payload = `${subscriberId}:${email.trim().toLowerCase()}:${series}:${expiresAt}`;
  return crypto.createHmac("sha256", subscriberTokenSecret()).update(payload).digest("hex");
}

export function buildBlogSubscriberConfirmToken({
  subscriberId,
  email,
  series,
}: BlogSubscriberTokenArgs): string {
  const expiresAt = Date.now() + BLOG_SUBSCRIBER_TOKEN_TTL_MS;
  const signature = sign(subscriberId, email, series, expiresAt);
  return `${subscriberId}.${expiresAt}.${signature}`;
}

export function parseBlogSubscriberConfirmToken(token: string): ParsedBlogSubscriberToken | null {
  const parts = token.split(".");
  if (parts.length < 3) return null;
  const signature = parts.pop();
  const expiresRaw = parts.pop();
  const subscriberId = parts.join(".");
  if (!signature || !expiresRaw || !subscriberId) return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt)) return null;
  return { subscriberId, expiresAt, signature };
}

export function isBlogSubscriberConfirmTokenExpired(parsed: ParsedBlogSubscriberToken): boolean {
  return parsed.expiresAt < Date.now();
}

export function isBlogSubscriberConfirmSignatureValid(
  parsed: ParsedBlogSubscriberToken,
  email: string,
  series: string,
): boolean {
  const expected = sign(parsed.subscriberId, email, series, parsed.expiresAt);
  const left = Buffer.from(parsed.signature, "hex");
  const right = Buffer.from(expected, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
