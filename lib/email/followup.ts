import "server-only";

import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import FollowUpEmail from "@/components/emails/FollowUpEmail";

export async function sendFollowUp(
  email: string,
  name: string,
  reasonCopy: string,
): Promise<void> {
  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Let\u2019s connect",
    react: FollowUpEmail({ name, reasonCopy }),
  });
}
