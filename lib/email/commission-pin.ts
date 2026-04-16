import "server-only";

import CommissionPinEmail from "@/components/emails/CommissionPinEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { getResend } from "@/lib/email/client";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export async function sendCommissionPinEmail({
  email,
  name,
  pin,
  referralCode,
  baseUrl,
}: {
  email: string;
  name: string;
  pin: string;
  referralCode: string;
  baseUrl: string;
}): Promise<void> {
  const resend = getResend();
  const dashboardUrl = `${normalizeBaseUrl(baseUrl)}/leaders/ref/${encodeURIComponent(referralCode)}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your access code",
    react: CommissionPinEmail({ name, pin, dashboardUrl }),
  });
}
