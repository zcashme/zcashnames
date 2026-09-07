import "server-only";
import QRCode from "qrcode";
import { sendEmail } from "@/lib/email/client";
import { FROM_EMAIL } from "@/lib/email/constants";
import { buildReservationRefundPayment, type RefundFailure, type ReservationPayment } from "@/lib/waitlist/reservation-refund-validation";

export type ReservationRefundNotice = {
  id: string; txid: string; waitlist_uuid: string; name: string; email: string;
  refund_address: string; amount_zats: number | string; observed_memo: string | null;
  expected_memo: string; failure_reasons: RefundFailure[]; transaction_status: string | null;
  payment_snapshot: ReservationPayment;
};

const escapeHtml = (value: unknown) => String(value ?? "(none)").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendReservationRefundEmail(notice: ReservationRefundNotice, otherRequests: number) {
  const payment = buildReservationRefundPayment(notice.refund_address, Number(notice.amount_zats), notice.txid, notice.failure_reasons);
  const qr = await QRCode.toBuffer(payment.uri, { type: "png", width: 1000, margin: 4, errorCorrectionLevel: "M" });
  const fields: [string, unknown][] = [
    ["Request ID", notice.id], ["Transaction ID", notice.txid],
    ["Failure reasons", notice.failure_reasons.map(f => f.message).join("; ")],
    ["Name", notice.name], ["Waitlist UUID", notice.waitlist_uuid], ["Waitlist email", notice.email],
    ["Refund address", payment.address], ["Refund amount (ZEC)", payment.amount], ["Refund amount (zatoshis)", notice.amount_zats],
    ["Refund memo", payment.memo], ["ZIP 321 URI", payment.uri],
    ["Observed reservation memo", notice.observed_memo], ["Expected reservation memo", notice.expected_memo],
    ["Transaction status", notice.transaction_status], ["Detected at", notice.payment_snapshot.detected_at],
    ["Block height", notice.payment_snapshot.blockheight], ["Pool", notice.payment_snapshot.pool],
    ["Original recipient", notice.payment_snapshot.recipient_address],
    ["Requests for this transaction from other reservations", otherRequests],
  ];
  const warning = "Manual verification required. Verify the claimant and confirm the incoming payment has been mined. Before paying, set this request's status to approved in Supabase; the database checks outgoing refund memos and blocks duplicate approvals for this original transaction. If approval fails, do not pay. After sending, record refund_txid, set status to refunded, and record completed_at. An emailed QR is not payment approval.";
  const html = `<h1>Reservation refund request</h1><p><strong>${warning}</strong></p>${otherRequests ? '<p><strong>This transaction also appears in other refund requests. Check for duplicate claims before paying.</strong></p>' : ''}<p><a href="${escapeHtml(payment.uri)}">Open refund in wallet</a></p><img src="cid:reservation-refund-qr" width="360" height="360" alt="Refund ZIP 321 payment QR" /><dl>${fields.map(([key, value]) => `<dt><strong>${escapeHtml(key)}</strong></dt><dd style="margin:0 0 16px;overflow-wrap:anywhere;white-space:pre-wrap">${escapeHtml(value)}</dd>`).join("")}</dl>`;
  const result = await sendEmail({
    from: FROM_EMAIL, to: "support@zcashnames.com", subject: `Reservation refund request: ${notice.name} (${notice.id})`,
    html, text: `${warning}\n\n${fields.map(([key, value]) => `${key}: ${value ?? "(none)"}`).join("\n\n")}`,
    attachments: [{ filename: "reservation-refund.png", content: qr, contentId: "reservation-refund-qr" }],
  }, { idempotencyKey: `reservation-refund/${notice.id}` });
  if (result.error) throw new Error(result.error.message);
}
