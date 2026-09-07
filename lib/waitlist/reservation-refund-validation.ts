import { zip321Uri } from "@/lib/purchases/zip321";
import { parseWaitlistReserveMemo } from "./reservation-memo";

export const RESERVATION_MINIMUM_ZATS = 500_000;
export type RefundFailure = { code: string; message: string };
export type ReservationPayment = {
  txid: string;
  recipient_address: string;
  amount_zats: string | number | null;
  memo: string | null;
  status: string | null;
  pool: string | null;
  detected_at: string | null;
  blockheight: number | null;
};
export type RefundCheck = {
  state: "not_found" | "select_payment" | "qualifying" | "unsuccessful" | "unavailable" | "already_refunded";
  message?: string;
  payments?: { key: string; amount: string; pool: string | null; detectedAt: string | null }[];
  paymentKey?: string;
  failures?: RefundFailure[];
  amountZec?: string;
  refundStatus?: "mempool" | "confirmed" | "approved";
};

export const REFUND_CHECK_STEPS = {
  reservation: "Looking for transaction",
  payment: "Finding payment",
  validation: "Checking amount and memo",
  refunds: "Checking previous refunds",
} as const;
export type RefundCheckStep = keyof typeof REFUND_CHECK_STEPS;
export type RefundCheckProgress = (step: RefundCheckStep) => void;

/** Historical free-text memos are supported; partial matches inside longer hex values are not. */
export function memoReferencesRefund(memo: string | null, originalTxid: string): boolean {
  const normalized = normalizeRefundTxid(originalTxid);
  return !!normalized && !!memo && new RegExp(`(?<![a-f0-9])${normalized}(?![a-f0-9])`, "i").test(memo);
}

export function normalizeRefundTxid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const txid = value.trim().toLowerCase();
  return /^[a-f0-9]{64}$/.test(txid) ? txid : null;
}

export function refundAmountZats(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 && n <= 2_100_000_000_000_000 ? n : null;
}

export function zatsToZec(zats: number): string {
  return `${Math.floor(zats / 100_000_000)}.${String(zats % 100_000_000).padStart(8, "0")}`;
}

/** Validate the memo grammar before interpreting its required fields. */
export function reservationMemoFailures(memo: string | null, name: string, uuid: string): RefundFailure[] {
  const text = memo?.replace(/\0+$/, "").trim();
  if (!text) return [{ code: "missing_memo", message: "the payment had no memo" }];
  // Preserve the historical unprefixed form accepted by the reservation scanner.
  const body = text.startsWith("ZNS:RESERVE|") ? text.slice(12) : text;
  const fields = new Map<string, string>();
  for (const part of body.split("|")) {
    const match = /^(Name|UUID|UADDR)::([^|]+)$/i.exec(part);
    if (!match || fields.has(match[1].toLowerCase())) {
      return [{ code: "invalid_memo", message: "the memo was not in the required reservation format" }];
    }
    fields.set(match[1].toLowerCase(), match[2].trim());
  }
  if (!fields.get("name") || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(fields.get("uuid") || "")) {
    return [{ code: "invalid_memo", message: "the memo was not in the required reservation format" }];
  }
  const failures: RefundFailure[] = [];
  const parsed = parseWaitlistReserveMemo(text)!;
  if (parsed.name !== name.trim()) failures.push({ code: "name_mismatch", message: "the memo name did not match this reservation" });
  if (parsed.uuid !== uuid) failures.push({ code: "uuid_mismatch", message: "the memo UUID did not match this reservation" });
  return failures;
}

export function assessReservationPayment(payment: ReservationPayment, name: string, uuid: string) {
  const amount = refundAmountZats(payment.amount_zats);
  const failures: RefundFailure[] = [];
  if (amount !== null && amount < RESERVATION_MINIMUM_ZATS) {
    failures.push({ code: "insufficient_amount", message: "the payment was below 0.005 ZEC" });
  }
  failures.push(...reservationMemoFailures(payment.memo, name, uuid));
  return { amount, failures };
}

export function buildReservationRefundPayment(address: string, amountZats: number, txid: string, failures: RefundFailure[]) {
  if (!normalizeRefundTxid(txid) || !Number.isSafeInteger(amountZats) || amountZats <= 0 || !failures.length) {
    throw new Error("Invalid refund payment details.");
  }
  const memo = `Here is a refund for the reservation you attempted (txid: ${txid}). It failed because ${failures.map(f => f.message).join("; ")}. You are welcome to try again. Cheers! Zechariah`;
  if (new TextEncoder().encode(memo).length > 512) throw new Error("Refund memo exceeds 512 bytes.");
  return zip321Uri(address, zatsToZec(amountZats), memo);
}
