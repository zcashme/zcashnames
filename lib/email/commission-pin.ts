import "server-only";

import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import { normalizeBaseUrl } from "@/lib/url";
import CommissionPinEmail from "@/components/emails/CommissionPinEmail";

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
  const dashboardUrl = `${normalizeBaseUrl(baseUrl)}/leaders/ref/${encodeURIComponent(referralCode)}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Your access code",
    react: CommissionPinEmail({ name, pin, dashboardUrl }),
  });
}
