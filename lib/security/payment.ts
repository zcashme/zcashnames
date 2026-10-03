import { memoTicketId } from "./memo";

export type SecurityLedgerRow = {
  amount_zats: string | number | null;
  detected_at: string | null;
  memo: string | null;
  txid: string | null;
  is_outgoing: boolean | null;
  status: string | null;
  recipient_address: string | null;
};

export type PaymentMatch =
  | { ok: true; txid: string; amountZats: number; detectedAt: string }
  | { ok: false; code: "invalid_txid" | "payment_not_found" | "wrong_amount" | "already_used" };

const TXID = /^[0-9a-f]{64}$/;

export function normalizeTxid(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function isSecurityTxid(value: string): boolean {
  return TXID.test(value);
}

function amountZats(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function rowQualifies(row: SecurityLedgerRow, ticketId: string, feeAddress: string): boolean {
  return row.is_outgoing === false
    && (row.status === "mempool" || row.status === "confirmed")
    && row.recipient_address === feeAddress
    && memoTicketId(row.memo) === ticketId
    && isSecurityTxid(normalizeTxid(row.txid));
}

/**
 * Pick the earliest unused payment that meets the fee.
 * `usedTxids` are txids already bound to a different ticket.
 */
export function selectQualifyingPayment(args: {
  rows: SecurityLedgerRow[];
  ticketId: string;
  feeAddress: string;
  minimumZats: number;
  usedTxids: ReadonlySet<string>;
  hintTxid?: string | null;
}): PaymentMatch {
  const hint = args.hintTxid?.trim() ? normalizeTxid(args.hintTxid) : "";
  if (args.hintTxid?.trim() && !isSecurityTxid(hint)) {
    return { ok: false, code: "invalid_txid" };
  }

  const considered = hint
    ? args.rows.filter((row) => normalizeTxid(row.txid) === hint)
    : [...args.rows].sort((left, right) => (left.detected_at ?? "").localeCompare(right.detected_at ?? ""));

  if (hint && considered.length === 0) return { ok: false, code: "payment_not_found" };

  let sawShortfall = false;
  let sawUsed = false;
  for (const row of considered) {
    if (!rowQualifies(row, args.ticketId, args.feeAddress)) continue;
    const paid = amountZats(row.amount_zats);
    if (paid == null || paid < args.minimumZats) {
      sawShortfall = true;
      continue;
    }
    const txid = normalizeTxid(row.txid);
    if (args.usedTxids.has(txid)) {
      sawUsed = true;
      continue;
    }
    return { ok: true, txid, amountZats: paid, detectedAt: row.detected_at ?? "" };
  }

  if (sawUsed) return { ok: false, code: "already_used" };
  if (sawShortfall) return { ok: false, code: "wrong_amount" };
  return { ok: false, code: "payment_not_found" };
}
