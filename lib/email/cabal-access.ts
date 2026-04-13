import "server-only";

import { Resend } from "resend";

const FROM_EMAIL = "zechariah@updates.zcashnames.com";
const TO_EMAIL = "partner@zcash.me";

export type CabalAccessNotice = {
  name: string;
  submittedAt: string;
};

export async function sendCabalAccessNotice(notice: CabalAccessNotice): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const name = notice.name.trim() || "Unknown visitor";
  const body = [
    `${name} is viewing your proposal.`,
    "",
    `Name:      ${name}`,
    `Viewed at: ${notice.submittedAt}`,
  ].join("\n");

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Cabal proposal view: ${name}`,
    text: body,
  });
}
