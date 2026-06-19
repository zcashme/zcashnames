import "server-only";

// Follow-up email for partner outreach. Accepts a custom reason copy
// and renders it via the FollowUpEmail React component.
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import FollowUpEmail from "@/components/emails/FollowUpEmail";

export async function sendFollowUp(
  email: string,
  name: string,
  reasonCopy: string,
  unsubscribeLinks?: {
    seriesHref: string;
    allHref: string;
  } | null,
): Promise<void> {
  await sendEmail({
    from: FROM_EMAIL,
    to: email,
    subject: "Let\u2019s connect",
    react: FollowUpEmail({ name, reasonCopy, unsubscribeLinks: unsubscribeLinks ?? null }),
  });
}
