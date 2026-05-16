import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHumanReferralCodeCandidate,
  getPreferredReferralCode,
  normalizeHumanReferralCode,
} from "./referral-code-core.ts";

test("normalizeHumanReferralCode lowercases and strips non-alphanumeric characters", () => {
  assert.equal(normalizeHumanReferralCode("  Alpha-123!  "), "alpha123");
  assert.equal(normalizeHumanReferralCode("Zcash Names"), "zcashnames");
});

test("buildHumanReferralCodeCandidate appends numeric suffixes within the max length", () => {
  const base = "a".repeat(62);

  assert.equal(buildHumanReferralCodeCandidate(base, 0), base);
  assert.equal(buildHumanReferralCodeCandidate(base, 7), `${"a".repeat(61)}7`);
  assert.equal(buildHumanReferralCodeCandidate(base, 42), `${"a".repeat(60)}42`);
});

test("getPreferredReferralCode prefers the human alias and falls back to the canonical code", () => {
  assert.equal(
    getPreferredReferralCode({ referral_code: "AbC12345", human_referral_code: "alice" }),
    "alice",
  );
  assert.equal(
    getPreferredReferralCode({ referral_code: "AbC12345", human_referral_code: null }),
    "AbC12345",
  );
});
