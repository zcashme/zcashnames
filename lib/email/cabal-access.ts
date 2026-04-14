import "server-only";

import { FROM_EMAIL, TO_EMAIL } from "@/lib/email/constants";
import { getResend } from "@/lib/email/client";

export type CabalAccessNotice = {
  name: string;
  submittedAt: string;
};

export async function sendCabalAccessNotice(notice: CabalAccessNotice): Promise<void> {
  const resend = getResend();
  const name = notice.name.trim() || "Unknown visitor";
  const body = [
    `${name} is viewing your proposal.`,
    "",
    `Name:      ${name}`,
    `Viewed at: ${notice.submittedAt}`,
  ].join("\n");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Cabal proposal view: ${name}`,
    text: body,
  });
}