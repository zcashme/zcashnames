import "server-only";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/lib/db";
import { createSvgCaptchaChallenge, verifySvgCaptcha } from "@/lib/captcha/svg-captcha";
import { RefundInputError } from "./refund-errors";

export type RefundCaptchaContext = { rowId: string; txid: string; paymentKey: string; refundAddress: string };
export type RefundRateRule = { scope: string; identity: string; limit: number; seconds: number };
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }
function contextHash(context: RefundCaptchaContext) {
  return digest(JSON.stringify([context.rowId, context.txid.toLowerCase(), context.paymentKey, context.refundAddress.trim()]));
}

export function refundClientIp(request: Request) {
  // Vercel overwrites this header. Never trust caller-supplied forwarding headers on other hosts.
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") : null;
  const ip = forwarded?.split(",")[0]?.trim() || "";
  if (!isIP(ip)) return "unknown";
  // Canonicalize IPv6 spelling so alternate representations cannot rotate the bucket.
  return isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname : ip;
}

export async function enforceRefundRateLimits(rules: RefundRateRule[]) {
  const secret = process.env.CAPTCHA_SECRET || process.env.WAITLIST_CAPTCHA_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Refund rate-limit secret is missing.");
  const buckets = rules.map(rule => ({
    key: createHmac("sha256", secret).update(`${rule.scope}:${rule.identity}`).digest("hex"),
    limit: rule.limit, seconds: rule.seconds,
  }));
  const { data, error } = await db.rpc("consume_reservation_refund_limits", { p_buckets: buckets });
  if (error || !data || typeof data.allowed !== "boolean") throw new RefundInputError("Protection checks are unavailable. Please try again later.", 503);
  if (!data.allowed) {
    const retryAfter = Math.max(1, Math.ceil(Number(data.retry_after) || 60));
    throw new RefundInputError(`Too many attempts. Please try again in ${retryAfter} seconds.`, 429, retryAfter);
  }
}

export async function issueRefundCaptcha(context: RefundCaptchaContext) {
  const challenge = createSvgCaptchaChallenge();
  const expires = Number(challenge.token.split(".")[0]);
  const { error } = await db.from("zn_waitlist_refund_captcha_challenges").insert({
    token_hash: digest(challenge.token), context_hash: contextHash(context), expires_at: new Date(expires).toISOString(),
  });
  if (error) throw new RefundInputError("Could not prepare the human check. Please try again.", 503);
  return challenge;
}

export async function consumeRefundCaptcha(context: RefundCaptchaContext, token: unknown, answer: unknown) {
  if (typeof token !== "string" || token.length > 256 || typeof answer !== "string" || answer.length > 32 || !verifySvgCaptcha({ token, answer })) {
    throw new RefundInputError("Please complete a new human check and try again.");
  }
  const { data, error } = await db.rpc("consume_reservation_refund_captcha", { p_token_hash: digest(token), p_context_hash: contextHash(context) });
  if (error) throw new RefundInputError("Could not verify the human check. Please try again.", 503);
  if (data !== true) throw new RefundInputError("This human check expired, was already used, or belongs to different refund details. Please complete a new check.");
}
