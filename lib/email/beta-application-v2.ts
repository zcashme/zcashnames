import "server-only";

// Internal notification email for beta v2 applications. Builds a plain-text
// summary of the applicant's profile and sends it to partner@zcash.me.
// No React template — deliberately plain text for operator visibility.
import { FROM_EMAIL, TO_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";

interface BetaV2ApplicationNotice {
  testerId: string;
  displayName: string;
  inviteCode: string;
  why: string;
  focusAreas: ("user" | "sdk")[];
  plannedWallet: string;
  plannedWallets: string[];
  experience?: string | null;
  referralSource?: string | null;
  contacts: { kind: string; value: string; isBest: boolean }[];
  submittedAt: string;
}

const FOCUS_LABEL: Record<"user" | "sdk", string> = {
  user: "Wallet / market flow",
  sdk: "SDK / developer",
};

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `${label}: ${value}\n`;
}

export async function sendBetaV2ApplicationNotice(
  notice: BetaV2ApplicationNotice,
): Promise<void> {
  const contactBlock = notice.contacts
    .map((c) => `  - ${c.kind}${c.isBest ? " (best)" : ""}: ${c.value}`)
    .join("\n");

  const focusBlock = notice.focusAreas.length
    ? notice.focusAreas.map((f) => FOCUS_LABEL[f]).join(", ")
    : "(none)";
  const walletBlock = notice.plannedWallets.length
    ? notice.plannedWallets.map((wallet, index) => `  - ${index === 0 ? "Primary: " : ""}${wallet}`).join("\n")
    : "  (none)";

  const body = [
    `New beta v2 application: ${notice.displayName}`,
    "",
    `Tester id:    ${notice.testerId}`,
    `Invite code:  ${notice.inviteCode}`,
    `Submitted:    ${notice.submittedAt}`,
    `Focus areas:  ${focusBlock}`,
    `Wallet:       ${notice.plannedWallet}`,
    "",
    "Planned wallets:",
    walletBlock,
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
    "-",
    "Open the beta_testers_v2 table in Supabase to review and invite this applicant.",
  ].join("\n");

  await sendEmail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `New beta v2 application: ${notice.displayName}`,
    text: body,
  });
}
