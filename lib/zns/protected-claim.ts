/**
 * Protected-name claim gate — holds back select names so only authorized
 * parties can claim them.
 *
 * Source of truth is zn_protected_names in Supabase. A name requires an
 * unlock code when status = 'protected' and redeemed = false. Unlock codes
 * are deterministic 12-char HMAC-derived codes (XXXX-XXXX-XXXX).
 *
 * Checkpoints:
 *  1. Name resolution — isProtectedForClaim / getProtectedClaimGate gate the
 *     claim flow.
 *  2. Claim time — verifyUnlockCode checks the supplied code before allowing
 *     the transaction.
 *  3. After a successful on-chain claim — markProtectedNameRedeemed clears
 *     the gate for that name.
 */
import "server-only";

import crypto from "node:crypto";
import { db } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────────────────── */

export interface ProtectedClaimGate {
  name: string;
  normalizedName: string;
  category: string;
  redeemed: boolean;
}

type ProtectedNameLookupRow = {
  name: string;
  normalized_name: string;
  category: string;
  status: string;
  redeemed: boolean | null;
};

/* ── Supabase lookup ───────────────────────────────────────────────── */

/**
 * Check if a name is actively protected (status=protected, not yet redeemed).
 * Returns null if the name does not require an unlock code.
 */
export async function getProtectedClaimGate(name: string): Promise<ProtectedClaimGate | null> {
  const { data, error } = await db
    .from("zn_protected_names")
    .select("name, normalized_name, category, status, redeemed")
    .eq("normalized_name", name)
    .eq("status", "protected")
    .eq("redeemed", false)
    .order("parent_name", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as ProtectedNameLookupRow;
  return {
    name: row.name,
    normalizedName: row.normalized_name,
    category: row.category,
    redeemed: false,
  };
}

/**
 * Returns true if the name is protected and not yet redeemed.
 */
export async function isProtectedForClaim(name: string): Promise<boolean> {
  const row = await getProtectedClaimGate(name);
  return row !== null;
}

/**
 * Mark all matching protected rows as redeemed after a successful claim.
 * Idempotent: only updates status=protected and redeemed=false rows.
 */
export async function markProtectedNameRedeemed(name: string): Promise<void> {
  const { error } = await db
    .from("zn_protected_names")
    .update({
      redeemed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("normalized_name", name)
    .eq("status", "protected")
    .eq("redeemed", false);

  if (error) {
    throw new Error(error.message);
  }
}

/* ── HMAC unlock codes ─────────────────────────────────────────────── */

function getUnlockSecret(): string {
  const secret = process.env.ZNS_UNLOCK_SECRET;
  if (!secret) throw new Error("ZNS_UNLOCK_SECRET environment variable is required");
  return secret;
}

/**
 * Generate an unlock code for a protected name.
 * Deterministic: same secret + name = same code.
 * Format: XXXX-XXXX-XXXX (12 uppercase alphanumeric chars).
 */
export function generateUnlockCode(name: string): string {
  const secret = getUnlockSecret();
  const hmac = crypto.createHmac("sha256", secret).update(name).digest("hex");
  const raw = hmac.slice(0, 12).toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/**
 * Verify an unlock code for a protected name.
 * Timing-safe comparison to prevent side-channel attacks.
 */
export function verifyUnlockCode(name: string, code: string): boolean {
  const expected = generateUnlockCode(name).replace(/-/g, "");
  const normalizedCode = code.trim().toUpperCase().replace(/-/g, "");
  if (expected.length !== normalizedCode.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf-8"),
    Buffer.from(normalizedCode, "utf-8"),
  );
}
