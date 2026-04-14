import "server-only";

import { FROM_EMAIL, TO_EMAIL } from "@/lib/email/constants";
import { getResend } from "@/lib/email/client";

interface BetaApplicationNotice {
  testerId: string;
  displayName: string;
  inviteCode: string;
  why: string;
  focusAreas: ("user" | "sdk")[];
  experience?: string | null;
  referralSource?: string | null;
  contacts: { kind: string; value: string; isBest: boolean }[];
  submittedAt: string;
}

const FOCUS_LABEL: Record<"user" | "sdk", string> = {
  user: "User flow",
  sdk: "SDK / developer",
};

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `${label}: ${value}\n`;
}

export async function sendBetaApplicationNotice(
  notice: BetaApplicationNotice,
): Promise<void> {
  const resend = getResend();
  const contactBlock = notice.contacts
    .map((c) => `  - ${c.kind}${c.isBest ? " (best)" : ""}: ${c.value}`)
    .join("\n");

  const focusBlock = notice.focusAreas.length
    ? notice.focusAreas.map((f) => FOCUS_LABEL[f]).join(", ")
    : "(none)";

  const body = [
    `New beta application: ${notice.displayName}`,
    "",
    `Tester id:    ${notice.testerId}`,
    `Invite code:  ${notice.inviteCode}`,
    `Submitted:    ${notice.submittedAt}`,
    `Focus areas:  ${focusBlock}`,
    "",
    "Contacts:",
    contactBlock || "  (none)",
    "",
    "Why:",
    notice.why,
    "",
    row("Experience", notice.experience).trimEnd(),
    row("Heard about it from", notice.referralSource).trimEnd(),
    "",
    "—",
    "Open the beta_testers table in Supabase to flip status when you've sent the code.",
  ].join("\n");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `New beta application: ${notice.displayName}`,
    text: body,
  });
}