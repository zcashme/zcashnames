import test from "node:test";
import assert from "node:assert/strict";
import {
  SHAREKIT_RECOVERY_ACCEPTED_MESSAGE,
  SHAREKIT_RECOVERY_INVALID_EMAIL_MESSAGE,
  normalizeShareKitRecoveryEmail,
  resolveShareKitRecoveryInternalStatus,
  wasShareKitRecoveryEmailSentToday,
} from "./sharekit-recovery.ts";

test("normalizeShareKitRecoveryEmail trims and lowercases input", () => {
  assert.equal(normalizeShareKitRecoveryEmail("  USER@Example.COM "), "user@example.com");
});

test("recovery copy uses a single accepted message for valid email submissions", () => {
  assert.match(SHAREKIT_RECOVERY_ACCEPTED_MESSAGE, /eligible for referral recovery/i);
  assert.match(SHAREKIT_RECOVERY_INVALID_EMAIL_MESSAGE, /email address/i);
});

test("resolveShareKitRecoveryInternalStatus returns not_found when no row exists", () => {
  assert.equal(resolveShareKitRecoveryInternalStatus(null), "not_found");
});

test("resolveShareKitRecoveryInternalStatus returns unconfirmed for unverified rows", () => {
  assert.equal(
    resolveShareKitRecoveryInternalStatus({
      email_verified: false,
      referral_email_resent_at: null,
    }),
    "unconfirmed",
  );
});

test("resolveShareKitRecoveryInternalStatus returns confirmed_resent when confirmed and not rate limited", () => {
  assert.equal(
    resolveShareKitRecoveryInternalStatus({
      email_verified: true,
      referral_email_resent_at: null,
    }),
    "confirmed_resent",
  );
});

test("wasShareKitRecoveryEmailSentToday detects timestamps within the daily window", () => {
  const now = Date.UTC(2026, 4, 12, 12, 0, 0);
  const recent = new Date(now - 60 * 60 * 1000).toISOString();
  const stale = new Date(now - 25 * 60 * 60 * 1000).toISOString();

  assert.equal(wasShareKitRecoveryEmailSentToday(recent, now), true);
  assert.equal(wasShareKitRecoveryEmailSentToday(stale, now), false);
});

test("resolveShareKitRecoveryInternalStatus returns confirmed_rate_limited within the cooldown window", () => {
  const now = Date.UTC(2026, 4, 12, 12, 0, 0);
  const recent = new Date(now - 2 * 60 * 60 * 1000).toISOString();

  assert.equal(
    resolveShareKitRecoveryInternalStatus(
      {
        email_verified: true,
        referral_email_resent_at: recent,
      },
      now,
    ),
    "confirmed_rate_limited",
  );
});
