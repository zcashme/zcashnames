import "server-only";

import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { getSecurityConfig } from "./config";
import { SECURITY_MESSAGES, SecurityError, wrongAmountMessage } from "./errors";
import { GitHubError, createPrivateReport, findPrivateReport } from "./github";
import { buildGitHubReportBody } from "./github-body";
import { isSecurityTicketId, securityPaymentMemo } from "./memo";
import { selectQualifyingPayment, type SecurityLedgerRow } from "./payment";
import { enforceSecurityLimits, securityClientIp } from "./rate";
import { validateSecurityReport, type ValidatedReport } from "./report";
import { createResumeToken, resumeMatches } from "./resume";
import { parseCommit } from "./window";

type TicketRow = {
  ticket_id: string;
  resume_token_hash: string;
  status: string;
  report_payload: unknown;
  payment_txid: string | null;
};

type StoredReport = { report: ValidatedReport; affectedCommit: string };

const OPEN_STATUSES = new Set(["payment_verified", "submitting", "github_failed", "submitted"]);

function rpcText(data: unknown): string {
  return typeof data === "string" ? data : "";
}

async function loadAuthorized(ticketId: string, resumeToken: string): Promise<TicketRow> {
  const { data, error } = await db
    .from("zn_security_comp_tickets")
    .select("ticket_id, resume_token_hash, status, report_payload, payment_txid")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) {
    console.error("[security] load", { code: error.code });
    throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
  }
  const row = data as TicketRow | null;
  if (!row || !resumeMatches(resumeToken, row.resume_token_hash)) {
    throw new SecurityError("not_found", 404, SECURITY_MESSAGES.notFound);
  }
  return row;
}

function readStored(payload: unknown): StoredReport | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { report?: unknown; affectedCommit?: unknown };
  const report = validateSecurityReport(record.report);
  const affectedCommit = typeof record.affectedCommit === "string" ? parseCommit(record.affectedCommit) : null;
  if (!report.ok || !affectedCommit) return null;
  return { report: report.value, affectedCommit };
}

export async function createSecurityTicket(request: Request) {
  const config = getSecurityConfig();
  if (config.phase === "before") throw new SecurityError("window_closed", 403, SECURITY_MESSAGES.windowBefore);
  if (config.phase === "after") throw new SecurityError("window_closed", 403, SECURITY_MESSAGES.windowAfter);
  if (!config.submissionsOpen || !config.feeAddress || !config.feeZec || !config.pinnedCommit) {
    throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);
  }
  const ip = securityClientIp(request);
  await enforceSecurityLimits([
    { scope: "security-create-hour", identity: ip, limit: 5, seconds: 3600 },
    { scope: "security-create-day", identity: ip, limit: 20, seconds: 86400 },
  ]);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);
  const resume = createResumeToken();
  const { data, error } = await db.rpc("create_zn_security_comp_ticket", {
    p_resume_token_hash: resume.hash,
    p_ip_hash: createHmac("sha256", secret).update(`security-ip:${ip}`).digest("hex"),
    p_year: new Date().getUTCFullYear(),
  });
  const ticketId = rpcText(data);
  if (error || !isSecurityTicketId(ticketId)) {
    console.error("[security] create", { code: error?.code ?? "empty" });
    throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
  }
  return {
    ok: true as const,
    ticketId,
    resumeToken: resume.token,
    feeZec: config.feeZec,
    address: config.feeAddress,
    memo: securityPaymentMemo(ticketId),
    pinnedCommit: config.pinnedCommit,
  };
}

export async function securityTicketStatus(ticketId: string, resumeToken: string) {
  const row = await loadAuthorized(ticketId, resumeToken);
  const config = getSecurityConfig();
  const feeZec = config.feeZec ?? "0.01";
  return {
    ok: true as const,
    ticketId: row.ticket_id,
    status: row.status,
    feeZec,
    pinnedCommit: config.pinnedCommit,
    hasStoredReport: row.status === "github_failed" && readStored(row.report_payload) != null,
    payment: row.status === "awaiting_payment" && config.feeAddress
      ? { address: config.feeAddress, memo: securityPaymentMemo(row.ticket_id), amountZec: feeZec }
      : null,
  };
}

function paymentError(code: "invalid_txid" | "payment_not_found" | "wrong_amount" | "already_used", feeZec: string): SecurityError {
  if (code === "invalid_txid") return new SecurityError(code, 400, SECURITY_MESSAGES.invalidTxid);
  if (code === "wrong_amount") return new SecurityError(code, 409, wrongAmountMessage(feeZec));
  if (code === "already_used") return new SecurityError(code, 409, SECURITY_MESSAGES.alreadyUsed);
  return new SecurityError("payment_not_found", 404, SECURITY_MESSAGES.paymentNotFound);
}

export async function verifySecurityPayment(request: Request, ticketId: string, resumeToken: string, hintTxid?: string | null) {
  const config = getSecurityConfig();
  if (config.phase === "before" || config.phase === "unconfigured") {
    throw new SecurityError("window_closed", 403, config.phase === "before" ? SECURITY_MESSAGES.windowBefore : SECURITY_MESSAGES.unavailable);
  }
  const row = await loadAuthorized(ticketId, resumeToken);
  if (row.status !== "awaiting_payment") {
    return { ok: true as const, ticketId, status: row.status };
  }
  if (config.phase === "after") throw new SecurityError("window_closed", 403, SECURITY_MESSAGES.windowAfter);
  if (!config.submissionsOpen || !config.feeAddress || !config.feeZec || !config.feeZats || !config.txTable) {
    throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);
  }
  await enforceSecurityLimits([
    { scope: "security-verify-ip", identity: securityClientIp(request), limit: 60, seconds: 3600 },
    { scope: "security-verify", identity: ticketId, limit: 30, seconds: 3600 },
  ]);

  const ledger = await db
    .from(config.txTable)
    .select("amount_zats, detected_at, memo, txid, is_outgoing, status, recipient_address")
    .eq("is_outgoing", false)
    .in("status", ["mempool", "confirmed"])
    .eq("recipient_address", config.feeAddress)
    .ilike("memo", `%ticket::${ticketId}%`)
    .order("detected_at", { ascending: true })
    .limit(50);
  if (ledger.error) {
    console.error("[security] ledger", { code: ledger.error.code });
    throw new SecurityError("payment_unavailable", 503, SECURITY_MESSAGES.paymentUnavailable);
  }
  const rows = (ledger.data ?? []) as SecurityLedgerRow[];
  const txids = rows.map((entry) => entry.txid?.trim().toLowerCase() ?? "").filter((txid) => /^[0-9a-f]{64}$/.test(txid));
  const used = new Set<string>();
  if (txids.length > 0) {
    const bound = await db
      .from("zn_security_comp_tickets")
      .select("payment_txid")
      .in("payment_txid", txids)
      .neq("ticket_id", ticketId);
    if (bound.error) {
      console.error("[security] txid lookup", { code: bound.error.code });
      throw new SecurityError("payment_unavailable", 503, SECURITY_MESSAGES.paymentUnavailable);
    }
    for (const entry of bound.data ?? []) {
      if (typeof entry.payment_txid === "string") used.add(entry.payment_txid);
    }
  }

  const match = selectQualifyingPayment({
    rows,
    ticketId,
    feeAddress: config.feeAddress,
    minimumZats: config.feeZats,
    usedTxids: used,
    hintTxid,
  });
  if (!match.ok) throw paymentError(match.code, config.feeZec);

  const verified = await db.rpc("verify_zn_security_comp_payment", {
    p_ticket_id: ticketId,
    p_txid: match.txid,
    p_min_zats: config.feeZats,
    p_fee_address: config.feeAddress,
    p_tx_table: config.txTable,
  });
  if (verified.error) {
    console.error("[security] verify", { code: verified.error.code });
    throw new SecurityError("payment_unavailable", 503, SECURITY_MESSAGES.paymentUnavailable);
  }
  const code = rpcText(verified.data);
  if (code === "verified" || code === "already_verified") {
    return { ok: true as const, ticketId, status: "payment_verified" };
  }
  if (code === "not_awaiting") {
    const fresh = await loadAuthorized(ticketId, resumeToken);
    if (fresh.status !== "awaiting_payment") return { ok: true as const, ticketId, status: fresh.status };
  }
  if (code === "wrong_amount" || code === "already_used" || code === "invalid" || code === "not_found") {
    if (code === "invalid") throw paymentError("invalid_txid", config.feeZec);
    if (code === "not_found") throw paymentError("payment_not_found", config.feeZec);
    throw paymentError(code, config.feeZec);
  }
  throw new SecurityError("payment_unavailable", 503, SECURITY_MESSAGES.paymentUnavailable);
}

async function finishSubmit(ticketId: string, ok: boolean, ghsaId = "", htmlUrl: string | null = null): Promise<string> {
  const finished = await db.rpc("finish_zn_security_comp_submit", {
    p_ticket_id: ticketId,
    p_ok: ok,
    p_ghsa_id: ghsaId,
    p_html_url: htmlUrl,
  });
  if (finished.error) {
    console.error("[security] finish", { code: finished.error.code });
    return "error";
  }
  return rpcText(finished.data) || "error";
}

export async function submitSecurityReport(request: Request, ticketId: string, resumeToken: string, input: unknown) {
  const row = await loadAuthorized(ticketId, resumeToken);
  if (row.status === "submitted") return { ok: true as const, ticketId, status: "submitted" as const };
  if (!OPEN_STATUSES.has(row.status) && row.status !== "payment_verified") {
    if (row.status === "awaiting_payment") throw new SecurityError("payment_required", 409, SECURITY_MESSAGES.paymentRequired);
  }
  await enforceSecurityLimits([
    { scope: "security-report-ip", identity: securityClientIp(request), limit: 30, seconds: 3600 },
    { scope: "security-report", identity: ticketId, limit: 10, seconds: 3600 },
  ]);

  const config = getSecurityConfig();
  const retryStored = Boolean(input && typeof input === "object" && (input as { retryStored?: unknown }).retryStored === true);
  const stored = readStored(row.report_payload);
  let report: ValidatedReport;
  let affectedCommit: string;
  if (retryStored) {
    if (!stored) throw new SecurityError("invalid_report", 400, "Enter the report again.");
    report = stored.report;
    affectedCommit = stored.affectedCommit;
  } else {
    const validated = validateSecurityReport(input && typeof input === "object" ? (input as { report?: unknown }).report ?? input : input);
    if (!validated.ok) throw new SecurityError("invalid_report", 400, validated.error);
    if (!config.pinnedCommit) throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);
    report = validated.value;
    affectedCommit = config.pinnedCommit;
  }
  if (!config.owner || !config.repo) throw new SecurityError("not_configured", 503, SECURITY_MESSAGES.unavailable);

  const begun = await db.rpc("begin_zn_security_comp_submit", {
    p_ticket_id: ticketId,
    p_researcher_handle: report.researcherHandle,
    p_github_username: report.githubUsername,
    p_payout_address: report.payoutAddress,
    p_claimed_severity: report.severity,
    p_affected_commit: affectedCommit,
    p_affected_module: report.affectedModule,
    p_report_payload: { report, affectedCommit },
  });
  if (begun.error) {
    console.error("[security] begin", { code: begun.error.code });
    throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
  }
  const beginCode = rpcText(begun.data);
  if (beginCode === "submitted") return { ok: true as const, ticketId, status: "submitted" as const };
  if (beginCode === "in_progress") throw new SecurityError("in_progress", 409, SECURITY_MESSAGES.inProgress);
  if (beginCode === "payment_required") throw new SecurityError("payment_required", 409, SECURITY_MESSAGES.paymentRequired);
  if (beginCode === "missing") throw new SecurityError("not_found", 404, SECURITY_MESSAGES.notFound);
  if (beginCode === "invalid") throw new SecurityError("invalid_report", 400, "Check the report fields and try again.");
  if (beginCode !== "started") throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);

  let created: { ghsaId: string; htmlUrl: string | null } | null = null;
  try {
    let body;
    try {
      body = buildGitHubReportBody({ ticketId, report, affectedCommit, packageName: config.repo });
    } catch {
      throw new SecurityError("invalid_report", 400, "The report is too long to file.");
    }
    created = await findPrivateReport(ticketId) ?? await createPrivateReport(body);
    const saved = await finishSubmit(ticketId, true, created.ghsaId, created.htmlUrl);
    if (saved !== "saved") {
      const retried = await finishSubmit(ticketId, true, created.ghsaId, created.htmlUrl);
      if (retried !== "saved") throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
    }
    return { ok: true as const, ticketId, status: "submitted" as const };
  } catch (error) {
    if (!created) await finishSubmit(ticketId, false);
    if (error instanceof SecurityError) throw error;
    if (error instanceof GitHubError) {
      const code = error.kind === "auth" ? "github_auth" : error.kind === "validation" ? "github_validation" : "github_unavailable";
      throw new SecurityError(code, 502, SECURITY_MESSAGES.githubFailed);
    }
    console.error("[security] submit", error instanceof Error ? error.name : "unknown");
    throw new SecurityError("persistence", 503, SECURITY_MESSAGES.persistence);
  }
}
