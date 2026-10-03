import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { db } from "@/lib/db";
import { SecurityError, rateLimitMessage } from "./errors";

type RateRule = { scope: string; identity: string; limit: number; seconds: number };

function rateSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new SecurityError("not_configured", 503, "Submissions are not available right now.");
  return secret;
}

export function securityClientIp(request: Request): string {
  const forwarded = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")
    : null;
  const ip = forwarded?.split(",")[0]?.trim() || "";
  if (!isIP(ip)) return "unknown";
  return isIP(ip) === 6 ? new URL(`http://[${ip}]/`).hostname : ip;
}

export async function enforceSecurityLimits(rules: RateRule[]): Promise<void> {
  const secret = rateSecret();
  const buckets = rules.map((rule) => ({
    key: createHmac("sha256", secret).update(`${rule.scope}:${rule.identity}`).digest("hex"),
    limit: rule.limit,
    seconds: rule.seconds,
  }));
  const { data, error } = await db.rpc("consume_security_comp_limits", { p_buckets: buckets });
  if (error || !data || typeof data.allowed !== "boolean") {
    console.error("[security] rate limit", { code: error?.code ?? "empty" });
    throw new SecurityError("unavailable", 503, "Submissions are not available right now.");
  }
  if (!data.allowed) {
    const retryAfter = Math.max(1, Math.ceil(Number(data.retry_after) || 60));
    throw new SecurityError("rate_limited", 429, rateLimitMessage(retryAfter), retryAfter);
  }
}
