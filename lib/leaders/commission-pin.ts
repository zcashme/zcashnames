import { createHmac } from "crypto";

// Deterministic 6-digit commission PIN from HMAC-SHA256(referralCode).
// Consumed by commission-access for PIN verification and cookie gating.
export function normalizeCommissionReferralCode(referralCode: string): string {
  return referralCode.trim().toLowerCase();
}

export function deriveCommissionPin(referralCode: string, secret: string): string {
  const normalizedCode = normalizeCommissionReferralCode(referralCode);
  const digest = createHmac("sha256", secret)
    .update(`leaders-commission:${normalizedCode}`)
    .digest();
  const value = digest.readUInt32BE(0) % 1_000_000;

  return String(value).padStart(6, "0");
}
