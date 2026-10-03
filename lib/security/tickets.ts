import "server-only";

import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { validateAddress } from "@/lib/zns/address-validation";
import { getActiveSecurityConfig } from "./config";
import { SECURITY_MESSAGES, SecurityError, wrongAmountMessage } from "./errors";
import { isSecurityTicketId, securityMemoPattern, securityPaymentMemo } from "./memo";
import { selectQualifyingPayment, type SecurityLedgerRow } from "./payment";

/** Four random digits per ticket: no sequence, no counter, no burned numbers. */
function newTicketId(): string {
  return `ZNS-BB-${String(randomInt(0, 10_000)).padStart(4, "0")}`;
}

function validatedPayoutAddress(raw: unknown): string {
  const payoutAddress = typeof raw === "string" ? raw.trim() : "";
  if (validateAddress(payoutAddress).status !== "unified") {
    throw new SecurityError("invalid_report", 400, "Enter a valid Zcash Unified address for bounty payment.");
  }
  return payoutAddress;
}

async function qualifyingPayment(ticketId: string, payoutAddress: string, hintTxid?: string | null) {
  const config = await getActiveSecurityConfig();
  if (!config.submissionsOpen || !config.feeAddress || !config.feeZec || !config.feeZats || !config.txTable) {
    throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);
  }
  const ledger = await db.from(config.txTable)
    .select("amount_zats, detected_at, memo, txid, is_outgoing, status, recipient_address")
    .eq("is_outgoing", false)
    .eq("status", "confirmed")
    .eq("recipient_address", config.feeAddress)
    .ilike("memo", securityMemoPattern(ticketId))
    .order("detected_at", { ascending: true })
    .limit(50);
  if (ledger.error) {
    console.error("[security] ledger", { code: ledger.error.code });
    throw new SecurityError("payment_unavailable", 503, SECURITY_MESSAGES.paymentUnavailable);
  }
  const rows = (ledger.data ?? []) as SecurityLedgerRow[];
  const txids = rows.map((entry) => entry.txid?.trim().toLowerCase() ?? "").filter((txid) => /^[0-9a-f]{64}$/.test(txid));
  const used = new Set<string>();
  if (txids.length) {
    const bound = await db.from("zn_security_comp_tickets").select("payment_txid").in("payment_txid", txids);
    if (bound.error) {
      console.error("[security] payment lookup", { code: bound.error.code });
      throw new SecurityError("payment_unavailable", 503, SECURITY_MESSAGES.paymentUnavailable);
    }
    for (const item of bound.data ?? []) if (typeof item.payment_txid === "string") used.add(item.payment_txid);
  }
  const match = selectQualifyingPayment({ rows, ticketId, feeAddress: config.feeAddress, payoutAddress, minimumZats: config.feeZats, usedTxids: used, hintTxid });
  if (!match.ok) {
    if (match.code === "invalid_txid") throw new SecurityError(match.code, 400, SECURITY_MESSAGES.invalidTxid);
    if (match.code === "wrong_amount") throw new SecurityError(match.code, 409, wrongAmountMessage(config.feeZec));
    if (match.code === "already_used") throw new SecurityError(match.code, 409, SECURITY_MESSAGES.alreadyUsed);
    throw new SecurityError("payment_not_found", 404, SECURITY_MESSAGES.paymentNotFound);
  }
  return { match, config };
}

export async function createSecurityTicket(rawPayoutAddress: unknown) {
  const payoutAddress = validatedPayoutAddress(rawPayoutAddress);
  const config = await getActiveSecurityConfig();
  if (config.phase === "before") throw new SecurityError("window_closed", 403, SECURITY_MESSAGES.windowBefore);
  if (config.phase === "after") throw new SecurityError("window_closed", 403, SECURITY_MESSAGES.windowAfter);
  if (!config.submissionsOpen || !config.feeAddress || !config.feeZec) {
    throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);
  }
  const ticketId = await freshTicketId();
  return { ok: true as const, ticketId, feeZec: config.feeZec, address: config.feeAddress, memo: securityPaymentMemo(ticketId, payoutAddress), payoutAddress };
}

/** Draw an unused ticket id. Dedupes against submitted tickets; in-flight collisions are vanishingly rare. */
async function freshTicketId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ticketId = newTicketId();
    const { data, error } = await db.from("zn_security_comp_tickets").select("ticket_id").eq("ticket_id", ticketId).maybeSingle();
    if (error) {
      console.error("[security] ticket id lookup", { code: error.code });
      throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
    }
    if (!data) return ticketId;
  }
  throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
}

export async function verifySecurityPayment(ticketId: string, payoutAddress: string, hintTxid?: string | null) {
  if (!isSecurityTicketId(ticketId)) throw new SecurityError("not_found", 404, SECURITY_MESSAGES.notFound);
  if (validateAddress(payoutAddress).status !== "unified") throw new SecurityError("not_found", 404, SECURITY_MESSAGES.notFound);
  const existing = await db.from("zn_security_comp_tickets").select("status").eq("ticket_id", ticketId).maybeSingle();
  if (existing.error) throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
  if (existing.data) return { ok: true as const, ticketId, status: existing.data.status };
  const { match } = await qualifyingPayment(ticketId, payoutAddress, hintTxid);
  return { ok: true as const, ticketId, status: "payment_verified" as const, paymentTxid: match.txid };
}

function validateSubmission(input: unknown) {
  if (!input || typeof input !== "object") throw new SecurityError("invalid_report", 400, "Enter the required submission details.");
  const body = input as Record<string, unknown>;
  const ghsaUrl = typeof body.ghsaUrl === "string" ? body.ghsaUrl.trim() : "";
  if (!/^https:\/\/github\.com\/.+\/security\/advisories\/GHSA-[A-Za-z0-9-]+\/?$/.test(ghsaUrl)) {
    throw new SecurityError("invalid_report", 400, "Enter the GitHub Security Advisory URL.");
  }
  const githubUsername = typeof body.githubUsername === "string" ? body.githubUsername.trim().replace(/^@/, "") : "";
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(githubUsername)) {
    throw new SecurityError("invalid_report", 400, "Enter a valid GitHub username.");
  }
  const payoutAddress = validatedPayoutAddress(body.payoutAddress);
  const claimedSeverity = typeof body.claimedSeverity === "string" ? body.claimedSeverity.toLowerCase() : "";
  if (!["critical", "high", "medium", "low"].includes(claimedSeverity)) {
    throw new SecurityError("invalid_report", 400, "Choose a claimed severity.");
  }
  return { ghsaUrl, githubUsername, payoutAddress, claimedSeverity };
}

export async function submitSecurityReport(ticketId: string, input: unknown) {
  if (!isSecurityTicketId(ticketId)) throw new SecurityError("not_found", 404, SECURITY_MESSAGES.notFound);
  const submission = validateSubmission(input);
  const body = input as Record<string, unknown>;
  const paymentTxid = typeof body.paymentTxid === "string" ? body.paymentTxid.trim().toLowerCase() : "";
  const { match } = await qualifyingPayment(ticketId, submission.payoutAddress, paymentTxid);
  const { data, error } = await db.from("zn_security_comp_tickets").insert({
    ticket_id: ticketId,
    status: "submitted",
    payment_txid: match.txid,
    ghsa_url: submission.ghsaUrl,
    github_username: submission.githubUsername,
    payout_address: submission.payoutAddress,
    claimed_severity: submission.claimedSeverity,
  }).select("ticket_id, status").single();
  if (error) {
    if (error.code === "23505") throw new SecurityError("already_used", 409, SECURITY_MESSAGES.alreadyUsed);
    console.error("[security] report save", { code: error.code });
    throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
  }
  return { ok: true as const, ticketId: data.ticket_id as string, status: data.status as string };
}
