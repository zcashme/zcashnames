import "server-only";

import { Resend } from "resend";

const FROM_EMAIL = "zechariah@updates.zcashnames.com";
const TO_EMAIL = "partner@zcash.me";

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

export type BetaApplicationNoticeStatus = "sent" | "failed" | "skipped";

export interface BetaApplicationNoticeResult {
  status: BetaApplicationNoticeStatus;
  error: string | null;
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
): Promise<BetaApplicationNoticeResult> {
  if (!process.env.RESEND_API_KEY) {
    const message = "RESEND_API_KEY not set; skipping notification email";
    console.error(`[beta-application] ${message}`);
    return { status: "skipped", error: message };
  }

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
  ]
    .filter((line) => line !== "")
    .join("\n");

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject: `New beta application: ${notice.displayName}`,
      text: body,
    });
    return { status: "sent", error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[beta-application] notification email failed:", err);
    return { status: "failed", error: message };
  }
}
