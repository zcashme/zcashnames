import "server-only";

import { FROM_EMAIL } from "@/lib/email/constants";
import { getResend } from "@/lib/email/client";
import FollowUpEmail from "@/components/emails/FollowUpEmail";

export async function sendFollowUp(
  email: string,
  name: string,
  reasonCopy: string,
): Promise<void> {
  const resend = getResend();
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Let\u2019s connect",
    react: FollowUpEmail({ name, reasonCopy }),
  });
}