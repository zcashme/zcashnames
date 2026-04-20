import "server-only";

import { Resend } from "resend";
import ConfirmEmail from "@/components/emails/ConfirmEmail";
import WaitlistEmail from "@/components/emails/WaitlistEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { getResend } from "@/lib/email/client";
import { getCommissionPin } from "@/lib/leaders/commission-access";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function sendWaitlistConfirmationEmail({
  email,
  name,
  confirmUrl,
}: {
  email: string;
  name: string;
  confirmUrl: string;
}): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your email",
    react: ConfirmEmail({ name, confirmUrl }),
  });
}

export async function sendWaitlistWelcomeEmail({
  email,
  name,
  referralCode,
  baseUrl,
}: {
  email: string;
  name: string;
  referralCode: string;
  baseUrl: string;
}): Promise<void> {
  const resend = getResend();
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const referralUrl = `${normalizedBaseUrl}/?ref=${referralCode}`;
  const accessPin = getCommissionPin(referralCode);

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Early access to ZcashNames",
    react: WaitlistEmail({ name, referralUrl, referralCode, accessPin }),
  });
}
