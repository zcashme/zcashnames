import "server-only";

import { FROM_EMAIL, TO_EMAIL } from "@/lib/email/constants";
import { getResend } from "@/lib/email/client";

export type CabalChatNotice = {
  name: string;
  accessName: string;
  message: string;
  slideNumber: string;
  slideTitle: string;
  deckTitle: string;
  submittedAt: string;
};

export type CabalInterestNotice = {
  name: string;
  accessName: string;
  preferredContact: string;
  note: string;
  slideNumber: string;
  slideTitle: string;
  deckTitle: string;
  submittedAt: string;
};

export async function sendCabalChatNotice(notice: CabalChatNotice): Promise<void> {
  const resend = getResend();
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

  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Cabal deck comment: ${notice.slideNumber} ${notice.slideTitle}`,
    text: body,
  });
}

export async function sendCabalInterestNotice(notice: CabalInterestNotice): Promise<void> {
  const resend = getResend();
  const typedName = notice.name.trim();
  const sender = typedName || notice.accessName.trim() || "Anonymous";
  const body = [
    `New cabal interest from ${sender}`,
    "",
    `Deck:              ${notice.deckTitle || "Cabal"}`,
    `Slide:             ${notice.slideNumber} - ${notice.slideTitle}`,
    `Access:            ${notice.accessName || "Unknown"}`,
    `Name field:        ${typedName || "Blank"}`,
    `Preferred contact: ${notice.preferredContact}`,
    `Submitted:         ${notice.submittedAt}`,
    "",
    "Optional note:",
    notice.note.trim() || "(none)",
  ].join("\n");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Cabal interest: ${sender}`,
    text: body,
  });
}