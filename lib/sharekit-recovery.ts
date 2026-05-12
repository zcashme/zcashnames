export type ShareKitRecoveryPublicStatus = "accepted" | "invalid_email" | "error";

export type ShareKitRecoveryInternalStatus =
  | "confirmed_resent"
  | "confirmed_rate_limited"
  | "unconfirmed"
  | "not_found"
  | "error";

export type ShareKitRecoveryResult =
  | { status: "accepted"; message: string }
  | { status: "invalid_email"; message: string }
  | { status: "error"; message: string };

export type ShareKitRecoveryRow = {
  email_verified: boolean;
  referral_email_resent_at: string | null;
};

export const SHAREKIT_RECOVERY_RATE_LIMIT_MS = 24 * 60 * 60 * 1000;
export const SHAREKIT_RECOVERY_MIN_RESPONSE_MS = 600;
export const SHAREKIT_RECOVERY_ACCEPTED_MESSAGE =
  "If this email is eligible for referral recovery, we’ll send the referral email to that inbox. If you don’t receive anything, check spam or join the waitlist again.";
export const SHAREKIT_RECOVERY_INVALID_EMAIL_MESSAGE =
  "Enter the email address you used to join the waitlist.";
export const SHAREKIT_RECOVERY_ERROR_MESSAGE =
  "Could not process referral recovery right now. Please try again.";

export function normalizeShareKitRecoveryEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidShareKitRecoveryEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

export function wasShareKitRecoveryEmailSentToday(value: unknown, now = Date.now()): boolean {
  if (typeof value !== "string" || !value) return false;
  const sentAt = new Date(value).getTime();
  if (!Number.isFinite(sentAt)) return false;
  return now - sentAt < SHAREKIT_RECOVERY_RATE_LIMIT_MS;
}

export function resolveShareKitRecoveryInternalStatus(
  row: ShareKitRecoveryRow | null,
  now = Date.now(),
): ShareKitRecoveryInternalStatus {
  if (!row) return "not_found";
  if (!row.email_verified) return "unconfirmed";
  if (wasShareKitRecoveryEmailSentToday(row.referral_email_resent_at, now)) {
    return "confirmed_rate_limited";
  }
  return "confirmed_resent";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
