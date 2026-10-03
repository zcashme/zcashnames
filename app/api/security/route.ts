import { SECURITY_MESSAGES } from "@/lib/security/errors";
import { asRecord, readJson, securityErrorResponse, securityJson, stringField } from "@/lib/security/http";
import { createSecurityTicket, submitSecurityReport, verifySecurityPayment } from "@/lib/security/tickets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const record = asRecord(await readJson(request));
  const ticketId = stringField(record, "ticketId");
  try {
    if (record.action === "start") {
      return securityJson(await createSecurityTicket(record.payoutAddress));
    }
    if (!ticketId) {
      return securityJson({ ok: false, error: SECURITY_MESSAGES.missingTicket, code: "missing_ticket" }, 400);
    }
    if (record.action === "verify") {
      const hintTxid = typeof record.hintTxid === "string" ? record.hintTxid : null;
      const payoutAddress = typeof record.payoutAddress === "string" ? record.payoutAddress : "";
      return securityJson(await verifySecurityPayment(ticketId, payoutAddress, hintTxid));
    }
    if (record.action === "submit") {
      return securityJson(await submitSecurityReport(ticketId, record));
    }
    return securityJson({ ok: false, error: SECURITY_MESSAGES.unexpected, code: "unknown_action" }, 400);
  } catch (error) {
    return securityErrorResponse(error);
  }
}
