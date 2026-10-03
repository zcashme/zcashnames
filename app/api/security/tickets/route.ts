import { securityErrorResponse, securityJson } from "@/lib/security/http";
import { createSecurityTicket } from "@/lib/security/tickets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return securityJson(await createSecurityTicket());
  } catch (error) {
    return securityErrorResponse(error);
  }
}
