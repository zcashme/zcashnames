import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { getWaitlistReservePaymentAddress, parseWaitlistVerifyToken } from "@/lib/campaigns/waitlist-confirm-response";
import { buildWaitlistVerifyMemo, findWaitlistRowsByNormalizedEmail } from "@/lib/campaigns/waitlist-verify";
import { rebateUnifiedAddressError } from "@/lib/waitlist/rebate-address";
import { sendReservationRefundEmail, type ReservationRefundNotice } from "@/lib/email/reservation-refund";
import { assessReservationPayment, memoReferencesRefund, normalizeRefundTxid, refundAmountZats, zatsToZec, type RefundCheck, type RefundCheckProgress, type ReservationPayment } from "./reservation-refund-validation";
import { consumeRefundCaptcha, enforceRefundRateLimits, issueRefundCaptcha } from "./refund-abuse";
import { RefundInputError } from "./refund-errors";
export { RefundInputError } from "./refund-errors";

const TABLE = "zn_waitlist_reservation_refund_requests";
const TRANSACTIONS = "zn_waitlist_reserves_transactions";
const PAGE_SIZE = 200;
export type RefundPayload = {
  token?: unknown; rowId?: unknown; txid?: unknown; paymentKey?: unknown; refundAddress?: unknown;
  captcha_token?: unknown; captcha_answer?: unknown;
};
type SavedRequest = ReservationRefundNotice & {
  notification_status: string; notification_attempted_at: string | null;
  notification_other_requests: number | null; status: string;
};
const string = (value: unknown) => typeof value === "string" ? value.trim() : "";
function paymentKey(row: ReservationPayment) {
  return createHash("sha256").update(JSON.stringify([row.txid.toLowerCase(), row.recipient_address, row.pool, String(row.amount_zats), row.memo])).digest("hex");
}

export async function authorizeRefund(payload: RefundPayload) {
  const parsed = parseWaitlistVerifyToken(string(payload.token));
  if (!parsed) throw new RefundInputError("Invalid or expired reservation link.", 401);
  const txid = normalizeRefundTxid(payload.txid);
  if (!txid) throw new RefundInputError("Enter a transaction ID containing 64 hexadecimal characters.");
  const rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
  const row = rows.find(candidate => candidate.id === string(payload.rowId));
  if (!row) throw new RefundInputError("This reservation does not belong to your link.", 403);
  const address = getWaitlistReservePaymentAddress()?.trim();
  if (!address || !row.name) throw new Error("Reservation payment configuration is incomplete.");
  return { row, txid, address, email: row.email || parsed.normalizedEmail };
}

/** Sent history is authoritative, including refunds predating the request table. */
export async function findPreviousReservationRefund(txid: string): Promise<RefundCheck | null> {
  if (!normalizeRefundTxid(txid)) throw new RefundInputError("Invalid transaction ID.");
  let pending: ReservationPayment | null = null;
  let detected: ReservationPayment | null = null;
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.from(TRANSACTIONS)
      .select("txid, recipient_address, amount_zats, memo, status, pool, detected_at, blockheight")
      .eq("is_outgoing", true).in("status", ["mempool", "confirmed"]).gt("amount_zats", 0)
      .ilike("memo", `%${txid}%`).order("txid").order("recipient_address").order("pool")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("Could not check previous refunds. Please try again.");
    const rows = (data ?? []) as ReservationPayment[];
    for (const row of rows) {
      if (!memoReferencesRefund(row.memo, txid) || (refundAmountZats(row.amount_zats) ?? 0) <= 0) continue;
      if (row.status === "confirmed") { detected = row; break; }
      pending ??= row;
    }
    if (detected || rows.length < PAGE_SIZE) break;
  }
  detected ??= pending;
  if (detected) {
    const { error } = await db.from(TABLE).update({
      detected_refund_txid: detected.txid, detected_refund_status: detected.status,
      detected_refund_at: detected.detected_at || new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("txid", txid.toLowerCase());
    if (error) throw new Error("Could not reconcile the detected refund. Please try again.");
    return {
      state: "already_refunded", refundStatus: detected.status === "confirmed" ? "confirmed" : "mempool",
      message: "A refund has already been sent for this transaction." + (detected.status === "mempool" ? " Confirmation is pending." : ""),
    };
  }
  const { data: claimed, error } = await db.from(TABLE).select("status, refund_txid, completed_at")
    .eq("txid", txid.toLowerCase()).or("status.in.(approved,refunded),refund_txid.not.is.null,completed_at.not.is.null").limit(1).maybeSingle();
  if (error) throw new Error("Could not check previous refund approvals. Please try again.");
  if (!claimed) return null;
  const paid = claimed.status === "refunded" || claimed.refund_txid || claimed.completed_at;
  return { state: "already_refunded", refundStatus: paid ? "confirmed" : "approved",
    message: paid ? "A refund has already been sent for this transaction." : "A refund for this transaction is already approved and awaiting payment." };
}

export async function checkReservationRefund(payload: RefundPayload, progress: RefundCheckProgress = () => {}) {
  progress("reservation");
  const context = await authorizeRefund(payload);
  progress("payment");
  const payments: ReservationPayment[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.from(TRANSACTIONS)
      .select("txid, recipient_address, amount_zats, memo, status, pool, detected_at, blockheight")
      .ilike("txid", context.txid).eq("is_outgoing", false).eq("recipient_address", context.address)
      .order("pool").order("detected_at").range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("Could not look up the payment. Please try again.");
    payments.push(...(data ?? []) as ReservationPayment[]);
    if (!data || data.length < PAGE_SIZE) break;
  }
  progress("validation");
  let result: RefundCheck;
  let selected: ReservationPayment | null = null;
  const keys = payments.map(paymentKey);
  if (!payments.length) {
    result = { state: "not_found", message: "Your payment has not been detected. Check the transaction ID and wait for your wallet to broadcast the payment." };
  } else if (new Set(keys).size !== keys.length) {
    result = { state: "unavailable", message: "These payment records cannot be distinguished. Contact support@zcashnames.com with your transaction ID for manual review." };
  } else {
    const selectedKey = string(payload.paymentKey);
    selected = selectedKey ? payments.find(p => paymentKey(p) === selectedKey) ?? null : payments.length === 1 ? payments[0] : null;
    if (selectedKey && !selected) throw new RefundInputError("The selected payment changed. Check the transaction again.");
    if (!selected) {
      result = { state: "select_payment", payments: payments.map(p => ({ key: paymentKey(p), amount: String(p.amount_zats ?? "unknown"), pool: p.pool, detectedAt: p.detected_at })) };
    } else {
      const assessment = assessReservationPayment(selected, context.row.name!, context.row.id);
      const key = paymentKey(selected);
      if (assessment.amount === null || assessment.amount === 0 || !["mempool", "confirmed"].includes(selected.status || "")) {
        result = { state: "unavailable", paymentKey: key, failures: assessment.failures, message: "This record has no refundable amount or is not an active payment. Contact support@zcashnames.com with your transaction ID." };
      } else {
        result = { state: assessment.failures.length ? "unsuccessful" : "qualifying", paymentKey: key, failures: assessment.failures, amountZec: zatsToZec(assessment.amount) };
      }
    }
  }
  progress("refunds");
  const previous = await findPreviousReservationRefund(context.txid);
  return { context, payment: selected, result: previous ?? result };
}

function refundAddressFor(payload: RefundPayload, paymentAddress: string) {
  const address = string(payload.refundAddress);
  const error = rebateUnifiedAddressError(address, paymentAddress);
  if (error) throw new RefundInputError(error);
  return address;
}

export async function prepareReservationRefundCaptcha(payload: RefundPayload) {
  const { context, result } = await checkReservationRefund(payload);
  if (result.state === "already_refunded") return result;
  if (result.state !== "unsuccessful") throw new RefundInputError(result.message || "Check an unsuccessful payment before requesting a human check.");
  const refundAddress = refundAddressFor(payload, context.address);
  return { challenge: await issueRefundCaptcha({ rowId: context.row.id, txid: context.txid, paymentKey: result.paymentKey!, refundAddress }) };
}

async function notifyRefund(saved: SavedRequest) {
  const blocked = await findPreviousReservationRefund(saved.txid);
  if (blocked) return { notified: false, ...blocked };
  if (saved.notification_status === "sent") return { notified: true };
  const lastAttempt = saved.notification_attempted_at ? Date.parse(saved.notification_attempted_at) : 0;
  const waitMs = (saved.notification_status === "sending" ? 300_000 : 60_000) - (Date.now() - lastAttempt);
  if (waitMs > 0) throw new RefundInputError("Please wait before retrying the support notification.", 429, Math.ceil(waitMs / 1000));
  await enforceRefundRateLimits([
    { scope: "notification:request", identity: saved.id, seconds: 3600, limit: 5 },
    { scope: "notification:email", identity: saved.email.trim().toLowerCase(), seconds: 3600, limit: 20 },
  ]);
  const now = new Date().toISOString();
  const cooldown = new Date(Date.now() - 60_000).toISOString();
  const stale = new Date(Date.now() - 300_000).toISOString();
  const { data: claimed, error: claimError } = await db.from(TABLE)
    .update({ notification_status: "sending", notification_attempted_at: now, updated_at: now })
    .eq("id", saved.id).or(`and(notification_status.in.(pending,failed),notification_attempted_at.is.null),and(notification_status.in.(pending,failed),notification_attempted_at.lte.${cooldown}),and(notification_status.eq.sending,notification_attempted_at.lt.${stale})`).select("id").maybeSingle();
  if (claimError) throw new Error("Your request is saved, but notification delivery could not start. Please retry.");
  if (!claimed) return { notified: false };
  try {
    const latestRefund = await findPreviousReservationRefund(saved.txid);
    if (latestRefund) {
      await db.from(TABLE).update({ notification_status: "failed", notification_error: "Delivery suppressed: refund already sent or approved." }).eq("id", saved.id);
      return { notified: false, ...latestRefund };
    }
    let otherRequests = saved.notification_other_requests;
    if (otherRequests == null) {
      const { count, error } = await db.from(TABLE).select("id", { count: "exact", head: true }).eq("txid", saved.txid).neq("waitlist_uuid", saved.waitlist_uuid);
      if (error) throw error;
      otherRequests = count ?? 0;
      const { error: snapshotError } = await db.from(TABLE).update({ notification_other_requests: otherRequests }).eq("id", saved.id);
      if (snapshotError) throw snapshotError;
    }
    await sendReservationRefundEmail(saved, otherRequests);
    const { error } = await db.from(TABLE).update({ notification_status: "sent", notification_sent_at: new Date().toISOString(), notification_error: null, updated_at: new Date().toISOString() }).eq("id", saved.id);
    if (error) throw error;
    return { notified: true };
  } catch (error) {
    console.error("[reservation-refund] notification failed", { requestId: saved.id, error });
    await db.from(TABLE).update({ notification_status: "failed", notification_error: "Support notification failed; retry delivery.", updated_at: new Date().toISOString() }).eq("id", saved.id);
    return { notified: false };
  }
}

export async function submitReservationRefund(payload: RefundPayload) {
  const auth = await authorizeRefund(payload);
  const blocked = await findPreviousReservationRefund(auth.txid);
  if (blocked) return { ...blocked, notified: false };
  const { data: existing, error: existingError } = await db.from(TABLE).select("*").eq("txid", auth.txid).eq("waitlist_uuid", auth.row.id).maybeSingle();
  if (existingError) throw new Error("Could not look up refund requests. Please try again.");
  if (existing) return { requestId: existing.id, ...await notifyRefund(existing as SavedRequest), existing: true };
  const { context, payment, result } = await checkReservationRefund(payload);
  if (result.state === "already_refunded") return { ...result, notified: false };
  if (!payment || result.state !== "unsuccessful") throw new RefundInputError(result.message || "This payment is not eligible for a refund request. Check the transaction again.");
  const refundAddress = refundAddressFor(payload, context.address);
  await consumeRefundCaptcha({ rowId: context.row.id, txid: context.txid, paymentKey: result.paymentKey!, refundAddress }, payload.captcha_token, payload.captcha_answer);
  await enforceRefundRateLimits([{ scope: "new:email", identity: context.email.trim().toLowerCase(), seconds: 3600, limit: 3 }]);
  const latestRefund = await findPreviousReservationRefund(context.txid);
  if (latestRefund) return { ...latestRefund, notified: false };
  const request = {
    txid: context.txid, waitlist_uuid: context.row.id, payment_key: result.paymentKey!,
    name: context.row.name!, email: context.email, refund_address: refundAddress,
    amount_zats: Number(payment.amount_zats), observed_memo: payment.memo,
    expected_memo: buildWaitlistVerifyMemo(context.row.name, context.row.id),
    failure_reasons: result.failures!, transaction_status: payment.status, payment_snapshot: payment,
  };
  const { data: inserted, error } = await db.from(TABLE).insert(request).select("*").single();
  if (error && error.code !== "23505") throw new Error("Could not save your refund request. Please try again.");
  let saved = inserted as SavedRequest | null;
  if (!saved) {
    const { data, error: reloadError } = await db.from(TABLE).select("*").eq("txid", context.txid).eq("waitlist_uuid", context.row.id).single();
    if (reloadError) throw new Error("Could not retrieve your saved refund request. Please retry.");
    saved = data as SavedRequest;
  }
  return { requestId: saved.id, ...await notifyRefund(saved), existing: !inserted };
}
