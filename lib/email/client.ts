/**
 * Resend email client — lazy-initialised singleton keyed off RESEND_API_KEY.
 * Emails are sent from the address configured in the Resend dashboard
 * (exported as FROM_EMAIL). The singleton ensures only one client instance
 * exists per server process.
 */
import "server-only";

import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail(
  params: Parameters<Resend["emails"]["send"]>[0],
): Promise<Awaited<ReturnType<Resend["emails"]["send"]>>> {
  const resend = getResend();
  return resend.emails.send(params);
}
