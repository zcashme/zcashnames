import { expect, test } from "@playwright/test";

import {
  buildClaimRequest,
  buildCodedClaimRequest,
  buildUpdateRequest,
  buildReleaseRequest,
  buildOtpRespond,
  parseRequestMemo,
  isValidTerm,
  isValidSixDigitCode,
} from "../lib/zns/request-memo";
import { usdToZats, claimUsd, updateRespondUsd, ZAT_STEP } from "../lib/zns/pricing-static";

// Whitepaper "User requests" encoding — the site's only protocol surface.
test.describe("request memo builders", () => {
  test("claim request encodes term, name, and unified address", () => {
    const memo = buildClaimRequest("alice", "1y", "utest1abc");
    expect(memo).toBe("ZNS:claim:1y:alice:utest1abc");
  });

  test("forever term is the exact ASCII token", () => {
    expect(buildClaimRequest("alice", "forever", "u1abc")).toBe("ZNS:claim:forever:alice:u1abc");
    expect(isValidTerm("forever")).toBe(true);
  });

  test("coded claim places the six-digit code in the leading slot", () => {
    const memo = buildCodedClaimRequest("000042", "alice", "2y", "utest1abc");
    expect(memo).toBe("ZNS:claim:000042:2y:alice:utest1abc");
  });

  test("update request carries none / Ny / forever terms", () => {
    expect(buildUpdateRequest("alice", "none", "utest1abc")).toBe("ZNS:update:none:alice:utest1abc");
    expect(buildUpdateRequest("alice", "99y", "utest1abc")).toBe("ZNS:update:99y:alice:utest1abc");
    expect(buildUpdateRequest("alice", "forever", "utest1abc")).toBe("ZNS:update:forever:alice:utest1abc");
  });

  test("release request names the binding being released", () => {
    expect(buildReleaseRequest("alice", "utest1abc")).toBe("ZNS:release:alice:utest1abc");
  });

  test("otp respond preserves leading zeroes and the verb", () => {
    const memo = buildOtpRespond("000123", "alice", "update", "utest1abc");
    expect(memo).toBe("ZNS:otp:000123:alice:update:utest1abc");
  });

  test("rejects malformed input", () => {
    expect(() => buildClaimRequest("Alice", "1y", "utest1abc")).toThrow(); // uppercase name
    expect(() => buildClaimRequest("alice", "01y", "utest1abc")).toThrow(); // leading zero term
    expect(() => buildClaimRequest("alice", "0y", "utest1abc")).toThrow(); // zero years
    expect(() => buildClaimRequest("alice", "100y", "utest1abc")).toThrow(); // over 99
    expect(() => buildOtpRespond("12a456", "alice", "update", "utest1abc")).toThrow();
    expect(isValidSixDigitCode("123456")).toBe(true);
    expect(isValidSixDigitCode("12345")).toBe(false);
  });
});

test.describe("request memo parser", () => {
  test("round-trips every form", () => {
    expect(parseRequestMemo("ZNS:claim:1y:alice:utest1abc")).toEqual({
      kind: "claim",
      code: null,
      term: "1y",
      name: "alice",
      ua: "utest1abc",
    });
    expect(parseRequestMemo("ZNS:claim:000042:forever:alice:u1abc")).toEqual({
      kind: "claim",
      code: "000042",
      term: "forever",
      name: "alice",
      ua: "u1abc",
    });
    expect(parseRequestMemo("ZNS:update:none:alice:utest1abc")).toEqual({
      kind: "update",
      term: "none",
      name: "alice",
      ua: "utest1abc",
    });
    expect(parseRequestMemo("ZNS:release:alice:utest1abc")).toEqual({
      kind: "release",
      name: "alice",
      ua: "utest1abc",
    });
    expect(parseRequestMemo("ZNS:otp:000000:alice:release:utest1abc")).toEqual({
      kind: "otp",
      otp: "000000",
      name: "alice",
      verb: "release",
      ua: "utest1abc",
    });
  });

  test("rejects unknown and malformed memos", () => {
    expect(parseRequestMemo("").kind).toBe("invalid");
    expect(parseRequestMemo("ZNS:renice:1y:alice:utest1abc").kind).toBe("invalid");
    expect(parseRequestMemo("ZNS:claim:1y:alice").kind).toBe("invalid");
    expect(parseRequestMemo("ZNS:update:1y:alice:utest1abc:extra").kind).toBe("invalid");
    expect(parseRequestMemo("ZNS:claim:01y:alice:utest1abc").kind).toBe("invalid");
  });
});

test.describe("pricing mirror", () => {
  test("annual tiers match the mint schedule", () => {
    // $10,000 / $2,500 / $800 / $400 / $100 for 1–5 chars, $20 minimum after.
    expect(claimUsd("a", "1y")).toBe(10_000);
    expect(claimUsd("ab", "1y")).toBe(2_500);
    expect(claimUsd("abc", "1y")).toBe(800);
    expect(claimUsd("abcd", "1y")).toBe(400);
    expect(claimUsd("abcde", "1y")).toBe(100);
    expect(claimUsd("abcdef", "1y")).toBe(20);
  });

  test("forever costs three annual prices; Ny multiplies", () => {
    expect(claimUsd("abcdef", "forever")).toBe(60);
    expect(claimUsd("abc", "5y")).toBe(4_000);
  });

  test("carry-forward updates are free; extensions price the extra term", () => {
    expect(updateRespondUsd("alice", "none")).toBe(0);
    expect(updateRespondUsd("abcdef", "2y")).toBe(40);
    expect(updateRespondUsd("abcdef", "forever")).toBe(60);
  });

  test("zats round UP to the 100k-zatoshi grid at any rate", () => {
    // 1 ZEC = $1 → $1 fee = exactly 1 ZEC, still snapped to the grid.
    expect(usdToZats(1, 1)).toBe(100_000_000);
    // Odd rate: ceil((usd * 1e8) / usdPerZec) then ceil to ZAT_STEP.
    const zats = usdToZats(1, 3); // $1 at $3/ZEC ≈ 33,333,333.33 zats → 34M → grid
    expect(zats % ZAT_STEP).toBe(0);
    expect(zats).toBeGreaterThanOrEqual(33_333_334);
  });
});
