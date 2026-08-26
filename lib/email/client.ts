/**
 * Resend email client — lazy-initialised singleton keyed off RESEND_API_KEY.
 * Emails are sent from the address configured in the Resend dashboard
 * (exported as FROM_EMAIL). The singleton ensures only one client instance
 * exists per server process.
 */
import "server-only";

import { render } from "@react-email/render";
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
  if (params.react) {
    const html = await render(params.react);
    if (!html || !html.includes("<")) {
      throw new Error("Email HTML render produced an empty body.");
    }
    const { react: _react, ...rest } = params;
    return resend.emails.send({ ...rest, html });
  }
  if (!params.html && !params.text) {
    throw new Error("Email is missing html and text.");
  }
  return resend.emails.send(params);
}
