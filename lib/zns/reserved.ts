/**
 * Reserved-name system — holds back select names so only authorized parties
 * can claim them.
 *
 * Reserved names live in the zn_reserved_names table in Supabase. Each row has
 * a category (brand, protocol, community, or offensive) and a redeemed flag.
 * Offensive names are permanently blocked; the other three categories can be
 * unlocked with a deterministic 12-char HMAC-derived code (XXXX-XXXX-XXXX).
 *
 * Checkpoints:
 *  1. Name resolution — isReserved / getReservedName gates the claim flow.
 *  2. Claim time — verifyUnlockCode checks the supplied code before allowing
 *     the transaction.
 */
import "server-only";

import crypto from "node:crypto";
import { db } from "@/lib/db";

/* ── Types ─────────────────────────────────────────────────────────── */

export type ReservedCategory = "brand" | "protocol" | "community" | "offensive";

export interface ReservedName {
  name: string;
  category: ReservedCategory;
  redeemed: boolean;
}

/* ── Supabase lookup ───────────────────────────────────────────────── */

/**
 * Check if a name is in the zn_reserved_names table.
 * Returns null if not reserved (or already redeemed).
 */
export async function getReservedName(name: string): Promise<ReservedName | null> {
  const { data, error } = await db
    .from("zn_reserved_names")
    .select("name, category, redeemed")
    .eq("name", name)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReservedName;
}

/**
 * Returns true if the name is reserved and not yet redeemed.
 */
export async function isReserved(name: string): Promise<boolean> {
  const row = await getReservedName(name);
  return row !== null && !row.redeemed;
}

/**
 * Returns true if the name is blocked (offensive category, never claimable).
 */
export async function isBlocked(name: string): Promise<boolean> {
  const row = await getReservedName(name);
  return row !== null && row.category === "offensive" && !row.redeemed;
}

/* ── HMAC unlock codes ─────────────────────────────────────────────── */

function getUnlockSecret(): string {
  const secret = process.env.ZNS_UNLOCK_SECRET;
  if (!secret) throw new Error("ZNS_UNLOCK_SECRET environment variable is required");
  return secret;
}

/**
 * Generate an unlock code for a reserved name.
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
 * Verify an unlock code for a reserved name.
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
