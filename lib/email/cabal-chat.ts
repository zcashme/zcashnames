import "server-only";

import { Resend } from "resend";

const FROM_EMAIL = "zechariah@updates.zcashnames.com";
const TO_EMAIL = "partner@zcash.me";

export type CabalChatNotice = {
  name: string;
  accessName: string;
  message: string;
  slideNumber: string;
  slideTitle: string;
  deckTitle: string;
  submittedAt: string;
};

export async function sendCabalChatNotice(notice: CabalChatNotice): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const typedName = notice.name.trim();
  const sender = typedName || notice.accessName.trim() || "Anonymous";
  const body = [
    `New cabal deck comment from ${sender}`,
    "",
    `Deck:       ${notice.deckTitle || "Cabal"}`,
    `Slide:      ${notice.slideNumber} - ${notice.slideTitle}`,
    `Access:     ${notice.accessName || "Unknown"}`,
    `Name field: ${typedName || "Blank"}`,
    `Submitted:  ${notice.submittedAt}`,
    "",
    "Message:",
    notice.message,
  ].join("\n");

  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Cabal deck comment: ${notice.slideNumber} ${notice.slideTitle}`,
    text: body,
  });
}
