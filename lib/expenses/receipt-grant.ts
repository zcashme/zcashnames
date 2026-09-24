import "server-only";

import { signHmac, safeEqual } from "@/lib/hmac";
import { getExpenseFormSecret } from "@/lib/expenses/access";
import type { ExpenseReceiptRecord } from "@/lib/expenses/config";
import { assertReceiptMeta } from "@/lib/expenses/parse";

function grantSecret(): string {
  const configured = getExpenseFormSecret();
  if (configured) return configured;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error("Expense form secret is not configured.");
}

function encodePayload(receipt: ExpenseReceiptRecord): string {
  return Buffer.from(JSON.stringify(receipt), "utf8").toString("base64url");
}

export function issueReceiptGrant(receipt: ExpenseReceiptRecord): string {
  assertReceiptMeta(receipt);
  const payload = encodePayload(receipt);
  return `${payload}.${signHmac(grantSecret(), payload)}`;
}

export function parseReceiptGrant(grant: string): ExpenseReceiptRecord {
  const lastDot = grant.lastIndexOf(".");
  if (lastDot <= 0) {
    throw new Error("Receipt upload could not be verified.");
  }
  const payload = grant.slice(0, lastDot);
  const signature = grant.slice(lastDot + 1);
  if (!payload || !signature) {
    throw new Error("Receipt upload could not be verified.");
  }
  if (!safeEqual(signHmac(grantSecret(), payload), signature)) {
    throw new Error("Receipt upload could not be verified.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Receipt upload could not be verified.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as ExpenseReceiptRecord).path !== "string" ||
    typeof (parsed as ExpenseReceiptRecord).name !== "string" ||
    typeof (parsed as ExpenseReceiptRecord).contentType !== "string" ||
    typeof (parsed as ExpenseReceiptRecord).size !== "number"
  ) {
    throw new Error("Receipt upload could not be verified.");
  }

  const receipt = parsed as ExpenseReceiptRecord;
  assertReceiptMeta(receipt);
  if (!receipt.path.startsWith("expenses/") || receipt.path.includes("..")) {
    throw new Error("Receipt upload could not be verified.");
  }
  return receipt;
}
