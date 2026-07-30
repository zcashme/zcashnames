import "server-only";

// Waitlist lifecycle emails: confirmation (with verification link) and welcome
// (with referral URL and commission PIN). Also includes referral recovery
// emails that can list multiple verified names for one inbox. The welcome
// email derives the PIN via commission-access so it matches the cookie-gated
// dashboard.
import ConfirmEmail from "@/components/emails/ConfirmEmail";
import ReferralRecoveryEmail from "@/components/emails/ReferralRecoveryEmail";
import SubscriberConfirmEmail from "@/components/emails/SubscriberConfirmEmail";
import WaitlistDeleteConfirmEmail from "@/components/emails/WaitlistDeleteConfirmEmail";
import WaitlistReservationConfirmedEmail, {
  type WaitlistReservationConfirmedOtherName,
} from "@/components/emails/WaitlistReservationConfirmedEmail";
import WaitlistEmail from "@/components/emails/WaitlistEmail";
import WaitlistReservationResendEmail, {
  type WaitlistReservationEmailName,
} from "@/components/emails/WaitlistReservationResendEmail";
import type { WaitlistRowDeleteRequestRowStatus } from "@/lib/campaigns/waitlist-row-delete";
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
    subject: "Early access to Zcash Names",
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
    subject: "Your Zcash Names referral codes",
    react: ReferralRecoveryEmail({ entries: emailEntries }),
  });
}

export async function sendWaitlistReservationResendEmail({
  email,
  name,
  confirmUrl,
  shareKitUrl,
  variant,
  names,
}: {
  email: string;
  name?: string | null;
  confirmUrl: string;
  shareKitUrl?: string | null;
  variant?: "single-name" | "multi-name";
  names?: WaitlistReservationEmailName[];
}): Promise<{ id: string | null | undefined }> {
  return sendWaitlistReservationEmail({
    email,
    name,
    confirmUrl,
    shareKitUrl,
    variant,
    names,
  });
}

export function buildWaitlistShareKitUrl(referralCode: string | null | undefined): string | null {
  const trimmed = referralCode?.trim();
  return trimmed
    ? `https://www.zcashnames.com/sharekit?ref=${encodeURIComponent(trimmed)}`
    : null;
}

export function buildWaitlistReferralDashboardUrl(
  referralCode: string | null | undefined,
  baseUrl: string,
): string | null {
  const trimmed = referralCode?.trim();
  return trimmed
    ? `${baseUrl.replace(/\/$/, "")}/leaders/ref/${encodeURIComponent(trimmed)}`
    : null;
}

export async function sendWaitlistReservationEmail({
  email,
  name,
  confirmUrl,
  shareKitUrl,
  variant = "single-name",
  names,
}: {
  email: string;
  name?: string | null;
  confirmUrl: string;
  shareKitUrl?: string | null;
  variant?: "single-name" | "multi-name";
  names?: WaitlistReservationEmailName[];
}): Promise<{ id: string | null | undefined }> {
const trimmedName = name?.trim();

const properName = trimmedName
  ? trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1).toLowerCase()
  : "";

const subject =
  variant === "multi-name"
    ? "Gain Early Access to Zcash Names"
    : properName
      ? `${properName}, Gain Early Access to Zcash Names`
      : "Gain Early Access to Zcash Names";
      
  const result = await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject,
    react:
      variant === "multi-name"
        ? WaitlistReservationResendEmail({
            variant: "multi-name",
            confirmUrl,
            names: names ?? [],
          })
        : WaitlistReservationResendEmail({
            variant: "single-name",
            name: trimmedName ?? null,
            confirmUrl,
            shareKitUrl: shareKitUrl ?? null,
          }),
  });

  return { id: (result as { id?: string | null } | undefined)?.id };
}

export async function sendWaitlistDeleteConfirmEmail({
  email,
  name,
  confirmUrl,
  rowStatus,
}: {
  email: string;
  name: string;
  confirmUrl: string;
  rowStatus: WaitlistRowDeleteRequestRowStatus;
}): Promise<{ id: string | null | undefined }> {
  const result = await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: `Remove ${name} from waitlist?`,
    react: WaitlistDeleteConfirmEmail({
      email,
      name,
      confirmUrl,
      rowStatus,
    }),
  });

  return { id: (result as { id?: string | null } | undefined)?.id };
}

export async function sendWaitlistReservationConfirmedEmail({
  email,
  name,
  dashboardUrl,
  reservationUrl,
  queueUrl,
  otherNames,
}: {
  email: string;
  name: string;
  dashboardUrl: string;
  reservationUrl: string;
  queueUrl: string;
  otherNames: WaitlistReservationConfirmedOtherName[];
}): Promise<{ id: string | null | undefined }> {
  const trimmedName = name.trim() || "Your name";

  const result = await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: `${trimmedName}, confirming your reservation`,
    react: WaitlistReservationConfirmedEmail({
      name: trimmedName,
      dashboardUrl,
      reservationUrl,
      queueUrl,
      otherNames,
    }),
  });

  return { id: (result as { id?: string | null } | undefined)?.id };
}
