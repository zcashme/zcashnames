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
  "If this email matches verified waitlist entries, we’ll send a recovery email listing every verified name and referral code tied to that inbox. If you don’t receive anything, check spam.";
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
  rows: ShareKitRecoveryRow[],
  now = Date.now(),
): ShareKitRecoveryInternalStatus {
  if (rows.length === 0) return "not_found";

  const verifiedRows = rows.filter((row) => row.email_verified);
  if (verifiedRows.length === 0) return "unconfirmed";

  const hasRecoverableEntry = verifiedRows.some(
    (row) => !wasShareKitRecoveryEmailSentToday(row.referral_email_resent_at, now),
  );
  return hasRecoverableEntry ? "confirmed_resent" : "confirmed_rate_limited";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
