import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signHmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function resolveSecret(
  envKey: string | undefined,
  fallback?: string,
): string {
  const secret =
    envKey ?? fallback ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing required secret.");
  return secret;
}
