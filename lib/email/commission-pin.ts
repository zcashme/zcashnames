import "server-only";

// Commission PIN email with a deep link to the user's referral dashboard.
// Called from leaders.ts after PIN rate-limit checks pass.
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
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
  const dashboardUrl = `${baseUrl}/leaders/ref/${encodeURIComponent(referralCode)}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Your access code",
    react: CommissionPinEmail({ name, pin, dashboardUrl }),
  });
}
