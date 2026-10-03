import { SECURITY_MESSAGES } from "@/lib/security/errors";
import { asRecord, readJson, securityErrorResponse, securityJson, stringField } from "@/lib/security/http";
import { submitSecurityReport } from "@/lib/security/tickets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await readJson(request);
  const record = asRecord(body);
  const ticketId = stringField(record, "ticketId");
  const resumeToken = stringField(record, "resumeToken");
  if (!ticketId || !resumeToken) {
    return securityJson({ ok: false, error: SECURITY_MESSAGES.missingTicket, code: "missing_ticket" }, 400);
  }
  try {
    return securityJson(await submitSecurityReport(request, ticketId, resumeToken, body));
  } catch (error) {
    return securityErrorResponse(error);
  }
}
