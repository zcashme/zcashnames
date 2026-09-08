import { expect, test } from "@playwright/test";
import {
  extractNoirOtpCode,
  findNoirOtpCode,
} from "../components/wallets/useNoirOtpAutofill";
import { PHASE_OWNS, PURCHASE_FLOW_INIT } from "../lib/purchases/flowState";
import type { NoirTransaction } from "../lib/wallets/noir";

function transaction(
  overrides: Partial<NoirTransaction> = {},
): NoirTransaction {
  return {
    txid: "txid",
    type: "receive",
    amount: "0.002",
    status: "mined",
    timestamp: 2_000,
    memo: "123456",
    ...overrides,
  };
}

test("Noir OTP autofill selects the newest eligible six-digit receive memo", () => {
  const code = findNoirOtpCode(
    [
      transaction({ txid: "older", timestamp: 2_000, memo: "111111" }),
      transaction({ txid: "newer", timestamp: 3_000, memo: " 654321 " }),
    ],
    1_000,
  );

  expect(code).toBe("654321");
});

test("Noir OTP autofill extracts the passcode from Noir's ZFA OTP memo", () => {
  expect(extractNoirOtpCode("(ZFA OTP)740233")).toBe("740233");
  expect(extractNoirOtpCode(" (zfa otp) 740233 ")).toBe("740233");
  expect(
    findNoirOtpCode(
      [transaction({ memo: "(ZFA OTP)740233" })],
      1_000,
    ),
  ).toBe("740233");
});

test("Noir OTP autofill rejects unrelated history entries", () => {
  const sentAt = 2_000;
  const rejected = [
    transaction({ type: "send" }),
    transaction({ status: "failed" }),
    transaction({ timestamp: sentAt - 1 }),
    transaction({ memo: "12345" }),
    transaction({ memo: "1234567" }),
    transaction({ memo: "code 123456" }),
    transaction({ memo: "(OTHER OTP)123456" }),
    transaction({ memo: "(ZFA OTP)123456 trailing" }),
    transaction({ memo: undefined }),
  ];

  expect(findNoirOtpCode(rejected, sentAt)).toBeNull();
});

test("Noir OTP metadata is initialized and owned by the OTP phase", () => {
  expect(PURCHASE_FLOW_INIT.otpNoirSentAt).toBe(0);
  expect(PHASE_OWNS.otp).toContain("otpNoirSentAt");
});
