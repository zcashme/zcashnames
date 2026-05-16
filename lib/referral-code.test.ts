import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHumanReferralCodeCandidate,
  getPreferredReferralCode,
  normalizeHumanReferralCode,
} from "./referral-code-core.ts";

test("normalizeHumanReferralCode lowercases and preserves single hyphen separators", () => {
  assert.equal(normalizeHumanReferralCode("  Alpha-123!  "), "alpha-123");
  assert.equal(normalizeHumanReferralCode("name---2"), "name-2");
  assert.equal(normalizeHumanReferralCode("Zcash Names"), "zcashnames");
});

test("buildHumanReferralCodeCandidate appends hyphenated numeric suffixes within the max length", () => {
  const base = "a".repeat(62);

  assert.equal(buildHumanReferralCodeCandidate(base, 0), base);
  assert.equal(buildHumanReferralCodeCandidate("name", 1), "name-2");
  assert.equal(buildHumanReferralCodeCandidate("name", 2), "name-3");
  assert.equal(buildHumanReferralCodeCandidate(base, 7), `${"a".repeat(60)}-8`);
  assert.equal(buildHumanReferralCodeCandidate(base, 42), `${"a".repeat(59)}-43`);
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
