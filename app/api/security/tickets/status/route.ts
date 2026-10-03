import { SECURITY_MESSAGES } from "@/lib/security/errors";
import { asRecord, readJson, securityErrorResponse, securityJson, stringField } from "@/lib/security/http";
import { securityTicketStatus } from "@/lib/security/tickets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const record = asRecord(await readJson(request));
  const ticketId = stringField(record, "ticketId");
  const resumeToken = stringField(record, "resumeToken");
  if (!ticketId || !resumeToken) {
    return securityJson({ ok: false, error: SECURITY_MESSAGES.missingTicket, code: "missing_ticket" }, 400);
  }
  try {
    return securityJson(await securityTicketStatus(ticketId, resumeToken));
  } catch (error) {
    return securityErrorResponse(error);
  }
}
