/**
 * Protected-name claim gate — holds back select names so only authorized
 * parties can claim them.
 *
 * Source of truth is zn_protected_names in Supabase. A name requires an
 * unlock code when status = 'protected', redeemed = false, and (if set)
 * expires_at is still in the future. Unlock codes are deterministic 12-char
 * HMAC-derived codes (XXXX-XXXX-XXXX).
 *
 * Checkpoints:
 *  1. Name resolution — isProtectedForClaim / getProtectedClaimGate gate the
 *     claim flow.
 *  2. Claim time — verifyUnlockCode checks the supplied code before allowing
 *     the transaction.
 *  3. After a successful on-chain claim — markProtectedNameRedeemed clears
 *     the gate for that name.
 *  4. Expiry — past expires_at, unclaimed protection is treated as not gated
 *     and expire_protected_names() (SQL/cron) flips status to rejected.
 *     Pending ENS names with no submitted or approved access request are
 *     rejected at Early Access (2026-10-15T16:00:00.000Z).
 */
import "server-only";

import crypto from "node:crypto";
import { db } from "@/lib/db";
import { WAITLIST_VIEW_EARLY_ACCESS_START_AT } from "@/lib/waitlist/early-access";

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
  expires_at?: string | null;
};

const EXPIRED_PROTECTION_REASON = "Protection period expired";
const ENS_PENDING_EXPIRED_REASON =
  "ENS priority access was not requested before Early Access";
const ENS_PENDING_REQUEST_DEADLINE_MS = Date.parse(WAITLIST_VIEW_EARLY_ACCESS_START_AT);

/* ── Expiry helpers ────────────────────────────────────────────────── */

function isPastExpiry(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) && ms <= Date.now();
}

/**
 * Flip a single expired protected row to rejected (best-effort, idempotent).
 * Used when the claim gate observes an expired row before the batch job runs.
 */
async function markProtectedNameExpiredByName(name: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("zn_protected_names")
    .select("name, rejected_reason")
    .eq("name", name)
    .eq("status", "protected")
    .eq("redeemed", false)
    .limit(1)
    .maybeSingle();

  if (error || !data) return;

  const existingReason =
    typeof data.rejected_reason === "string" ? data.rejected_reason.trim() : "";

  await db
    .from("zn_protected_names")
    .update({
      status: "rejected",
      rejected_at: nowIso,
      rejected_reason: existingReason || EXPIRED_PROTECTION_REASON,
      updated_at: nowIso,
    })
    .eq("name", name)
    .eq("status", "protected")
    .eq("redeemed", false);
}

function isMissingRpcError(error: { message?: string; code?: string }, fnName: string): boolean {
  const message = error.message ?? "";
  return (
    message.includes(fnName)
    || message.includes("Could not find the function")
    || message.includes("does not exist")
    || error.code === "PGRST202"
    || error.code === "42883"
  );
}

async function expirePendingEnsNamesFallback(): Promise<number> {
  if (Date.now() < ENS_PENDING_REQUEST_DEADLINE_MS) return 0;

  const nowIso = new Date().toISOString();
  const { data: rows, error: selectError } = await db
    .from("zn_protected_names")
    .select("name, normalized_name, rejected_reason")
    .eq("ens_priority_claim", true)
    .eq("status", "pending")
    .eq("redeemed", false);

  if (selectError) {
    if (
      selectError.message.includes("ens_priority_claim")
      || selectError.message.includes("does not exist")
    ) {
      return 0;
    }
    throw new Error(selectError.message);
  }

  const targets = rows ?? [];
  if (targets.length === 0) return 0;

  const openRequestNames = new Set<string>();
  const { data: requests, error: requestError } = await db
    .from("waitlist_protected_name_access_requests")
    .select("requested_name")
    .in("status", ["submitted", "approved"]);

  if (requestError) {
    if (
      !(
        requestError.message.includes("waitlist_protected_name_access_requests")
        || requestError.message.includes("does not exist")
      )
    ) {
      throw new Error(requestError.message);
    }
  } else {
    for (const request of requests ?? []) {
      if (typeof request.requested_name === "string" && request.requested_name.trim()) {
        openRequestNames.add(request.requested_name.trim().toLowerCase());
      }
    }
  }

  let expiredCount = 0;
  for (const row of targets) {
    const nameKey = typeof row.name === "string" ? row.name.trim().toLowerCase() : "";
    const normalizedKey =
      typeof row.normalized_name === "string" ? row.normalized_name.trim().toLowerCase() : "";
    if (
      (nameKey && openRequestNames.has(nameKey))
      || (normalizedKey && openRequestNames.has(normalizedKey))
    ) {
      continue;
    }

    const existingReason =
      typeof row.rejected_reason === "string" ? row.rejected_reason.trim() : "";
    const { error: updateError } = await db
      .from("zn_protected_names")
      .update({
        status: "rejected",
        rejected_at: nowIso,
        rejected_reason: existingReason || ENS_PENDING_EXPIRED_REASON,
        updated_at: nowIso,
      })
      .eq("name", row.name)
      .eq("status", "pending")
      .eq("redeemed", false);

    if (updateError) throw new Error(updateError.message);
    expiredCount += 1;
  }

  return expiredCount;
}

async function expireProtectedNamesFallback(): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: rows, error: selectError } = await db
    .from("zn_protected_names")
    .select("name, rejected_reason")
    .eq("status", "protected")
    .eq("redeemed", false)
    .not("expires_at", "is", null)
    .lte("expires_at", nowIso);

  if (selectError) {
    if (
      selectError.message.includes("expires_at")
      || selectError.message.includes("does not exist")
    ) {
      return 0;
    }
    throw new Error(selectError.message);
  }

  let expiredCount = 0;
  for (const row of rows ?? []) {
    const existingReason =
      typeof row.rejected_reason === "string" ? row.rejected_reason.trim() : "";
    const { error: updateError } = await db
      .from("zn_protected_names")
      .update({
        status: "rejected",
        rejected_at: nowIso,
        rejected_reason: existingReason || EXPIRED_PROTECTION_REASON,
        updated_at: nowIso,
      })
      .eq("name", row.name)
      .eq("status", "protected")
      .eq("redeemed", false);

    if (updateError) throw new Error(updateError.message);
    expiredCount += 1;
  }

  return expiredCount;
}

/**
 * Batch-expire unclaimed protected names past expires_at, plus pending ENS
 * names with no submitted or approved access request after Early Access.
 */
export async function expireProtectedNames(): Promise<number> {
  let expiredCount = 0;

  const protectedRpc = await db.rpc("expire_protected_names");
  if (!protectedRpc.error) {
    const count = typeof protectedRpc.data === "number" ? protectedRpc.data : Number(protectedRpc.data);
    expiredCount += Number.isFinite(count) ? count : 0;
  } else if (!isMissingRpcError(protectedRpc.error, "expire_protected_names")) {
    throw new Error(protectedRpc.error.message);
  } else {
    expiredCount += await expireProtectedNamesFallback();
  }

  const pendingRpc = await db.rpc("expire_pending_ens_names");
  if (!pendingRpc.error) {
    const count = typeof pendingRpc.data === "number" ? pendingRpc.data : Number(pendingRpc.data);
    expiredCount += Number.isFinite(count) ? count : 0;
  } else if (!isMissingRpcError(pendingRpc.error, "expire_pending_ens_names")) {
    throw new Error(pendingRpc.error.message);
  } else {
    expiredCount += await expirePendingEnsNamesFallback();
  }

  return expiredCount;
}

/* ── Supabase lookup ───────────────────────────────────────────────── */

/**
 * Check if a name is actively protected (status=protected, not yet redeemed,
 * and not past expires_at). Returns null if the name does not require an unlock code.
 */
export async function getProtectedClaimGate(name: string): Promise<ProtectedClaimGate | null> {
  let data: ProtectedNameLookupRow | null = null;
  let error: { message: string } | null = null;

  const primary = await db
    .from("zn_protected_names")
    .select("name, normalized_name, category, status, redeemed, expires_at")
    .eq("normalized_name", name)
    .eq("status", "protected")
    .eq("redeemed", false)
    .order("parent_name", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();

  if (primary.error?.message?.includes("expires_at")) {
    // Column not migrated yet — treat as no expiry.
    const fallback = await db
      .from("zn_protected_names")
      .select("name, normalized_name, category, status, redeemed")
      .eq("normalized_name", name)
      .eq("status", "protected")
      .eq("redeemed", false)
      .order("parent_name", { ascending: true, nullsFirst: true })
      .limit(1)
      .maybeSingle();
    data = (fallback.data as ProtectedNameLookupRow | null) ?? null;
    error = fallback.error;
  } else {
    data = (primary.data as ProtectedNameLookupRow | null) ?? null;
    error = primary.error;
  }

  if (error || !data) return null;

  if (isPastExpiry(data.expires_at)) {
    // Best-effort status flip so UI/admin view catches up without waiting for cron.
    void markProtectedNameExpiredByName(data.name);
    return null;
  }

  return {
    name: data.name,
    normalizedName: data.normalized_name,
    category: data.category,
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
