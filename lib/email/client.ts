/**
 * Resend email client — lazy-initialised singleton keyed off RESEND_API_KEY.
 * Emails are sent from the address configured in the Resend dashboard
 * (exported as FROM_EMAIL). The singleton ensures only one client instance
 * exists per server process.
 */
import "server-only";

import { Resend } from "resend";

let _resend: Resend | null = null;
const DEFAULT_EMAIL_TIMEOUT_MS = 30_000;

function emailTimeoutMs(): number {
  const value = Number(process.env.RESEND_TIMEOUT_MS ?? DEFAULT_EMAIL_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_EMAIL_TIMEOUT_MS;
}

async function withTimeout<T>(label: string, promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${emailTimeoutMs()}ms`));
        }, emailTimeoutMs());
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

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
  return withTimeout("Resend email send", resend.emails.send(params));
}

export async function cancelScheduledEmail(
  emailId: string,
): Promise<Awaited<ReturnType<Resend["emails"]["cancel"]>>> {
  const resend = getResend();
  return withTimeout("Resend email cancel", resend.emails.cancel(emailId));
}

export async function updateScheduledEmail(
  emailId: string,
  scheduledAt: string,
): Promise<Awaited<ReturnType<Resend["emails"]["update"]>>> {
  const resend = getResend();
  return withTimeout(
    "Resend email update",
    resend.emails.update({
      id: emailId,
      scheduledAt,
    }),
  );
}

export type SendEmailParams = Parameters<Resend["emails"]["send"]>[0];
export type SendBatchEmailParams = Parameters<Resend["batch"]["send"]>[0];
export type SendBatchEmailRequestOptions = Parameters<Resend["batch"]["send"]>[1];

export async function sendBatchEmails(
  params: SendBatchEmailParams,
  options?: SendBatchEmailRequestOptions,
): Promise<Awaited<ReturnType<Resend["batch"]["send"]>>> {
  const resend = getResend();
  return withTimeout("Resend batch send", resend.batch.send(params, options));
}
