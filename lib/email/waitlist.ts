import "server-only";

// Waitlist lifecycle emails: confirmation (with verification link) and welcome
// (with referral URL and commission PIN). The welcome email derives the PIN
// via commission-access so it matches the cookie-gated dashboard.
import ConfirmEmail from "@/components/emails/ConfirmEmail";
import WaitlistEmail from "@/components/emails/WaitlistEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import { getCommissionPin } from "@/lib/leaders/commission-access";

export async function sendWaitlistConfirmationEmail({
  email,
  name,
  confirmUrl,
}: {
  email: string;
  name: string;
  confirmUrl: string;
}): Promise<void> {
  await sendEmail({
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
  const referralUrl = `${baseUrl}/?ref=${referralCode}`;
  const accessPin = getCommissionPin(referralCode);

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Early access to ZcashNames",
    react: WaitlistEmail({ name, referralUrl, referralCode, accessPin }),
  });
}
