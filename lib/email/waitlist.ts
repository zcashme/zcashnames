import "server-only";

// Waitlist lifecycle emails: confirmation (with verification link) and welcome
// (with referral URL and commission PIN). Also includes referral recovery
// emails that can list multiple verified names for one inbox. The welcome
// email derives the PIN via commission-access so it matches the cookie-gated
// dashboard.
import ConfirmEmail from "@/components/emails/ConfirmEmail";
import ReferralRecoveryEmail from "@/components/emails/ReferralRecoveryEmail";
import SubscriberConfirmEmail from "@/components/emails/SubscriberConfirmEmail";
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
  canonicalReferralCode,
  preferredReferralCode,
  baseUrl,
}: {
  email: string;
  name: string;
  canonicalReferralCode: string;
  preferredReferralCode: string;
  baseUrl: string;
}): Promise<void> {
  const referralUrl = `${baseUrl}/?ref=${preferredReferralCode}`;
  const accessPin = getCommissionPin(canonicalReferralCode);

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Early access to ZcashNames",
    react: WaitlistEmail({ name, referralUrl, referralCode: preferredReferralCode, accessPin }),
  });
}

export async function sendSubscriberConfirmationEmail({
  email,
  series,
  confirmUrl,
}: {
  email: string;
  series: string;
  confirmUrl: string;
}): Promise<void> {
  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: `Confirm your ${series} subscription`,
    react: SubscriberConfirmEmail({ email, series, confirmUrl }),
  });
}

export async function sendWaitlistReferralRecoveryEmail({
  email,
  baseUrl,
  entries,
}: {
  email: string;
  baseUrl: string;
  entries: Array<{
    name: string;
    canonicalReferralCode: string;
    preferredReferralCode: string;
  }>;
}): Promise<void> {
  const emailEntries = entries.map((entry) => ({
    name: entry.name,
    referralCode: entry.preferredReferralCode,
    referralUrl: `${baseUrl}/?ref=${entry.preferredReferralCode}`,
    dashboardUrl: `${baseUrl}/leaders/ref/${encodeURIComponent(entry.preferredReferralCode)}`,
    accessPin: getCommissionPin(entry.canonicalReferralCode),
  }));

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Your ZcashNames referral codes",
    react: ReferralRecoveryEmail({ entries: emailEntries }),
  });
}
