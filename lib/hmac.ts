import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

//
// Cryptographic utilities — server-only HMAC signing and verification.
//
// Two main use cases:
//   1. Signed cookies (zn_beta, zn_cabal, zn_leaders_commission) — each
//      cookie is `payload.signature` where signature = HMAC(secret, payload)
//   2. Commission pin derivation (leaders) — 6-digit numeric codes derived
//      from HMAC(secret, "leaders-commission:" + referralCode)
//

// Timing-safe string comparison to prevent timing side-channel attacks
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

// HMAC-SHA256 in hex
export function signHmac(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

// Resolve a secret from multiple possible sources with a chain of fallbacks.
// Used both for beta gate secrets and commission pin secrets.
export function resolveSecret(
  envKey: string | undefined,
  fallback?: string,
): string {
  const secret =
    envKey ?? fallback ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing required secret.");
  return secret;
}
