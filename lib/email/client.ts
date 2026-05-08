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
): Promise<void> {
  const resend = getResend();
  await resend.emails.send(params);
}