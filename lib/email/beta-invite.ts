import "server-only";

import BetaInviteEmail from "@/components/emails/BetaInviteEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";

export async function sendBetaInviteEmail({
  email,
  displayName,
  inviteCode,
  baseUrl,
}: {
  email: string;
  displayName: string;
  inviteCode: string;
  baseUrl: string;
}): Promise<void> {
  const joinUrl = `${baseUrl}/beta/join?code=${encodeURIComponent(inviteCode)}`;

  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "You're invited to the ZcashNames beta",
    react: BetaInviteEmail({ displayName, joinUrl }),
  });
}
