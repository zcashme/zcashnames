import "server-only";

import { render } from "@react-email/render";
import ProtectedNameDecisionEmail, { protectedNameDecisionSubject, type ProtectedNameDecisionEmailArgs } from "@/components/emails/ProtectedNameDecisionEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";

const PROTECTED_NAME_PUBLIC_BASE_URL = "https://zcashnames.com";

function protectedNameDetailsUrl(name: string): string {
  const params = new URLSearchParams({ search: name, searchMode: "exact", details: "1" });
  return `${PROTECTED_NAME_PUBLIC_BASE_URL}/protected?${params.toString()}`;
}

export async function renderProtectedNameDecisionPreview(args: ProtectedNameDecisionEmailArgs) {
  const emailArgs = { ...args, detailsUrl: args.detailsUrl || protectedNameDetailsUrl(args.name) };
  return {
    subject: protectedNameDecisionSubject(emailArgs),
    html: await render(ProtectedNameDecisionEmail(emailArgs)),
  };
}

export async function sendProtectedNameDecisionEmail(args: {
  to: string;
  name: string;
  workflow: string;
  decision: string;
  reason: string;
  nameStatus?: string | null;
  didTransition?: boolean;
  submittedReason?: string | null;
  isCorrection?: boolean;
}): Promise<string | null> {
  const preview = await renderProtectedNameDecisionPreview(args);
  return sendStoredProtectedNameDecisionEmail(args.to, preview.subject, preview.html);
}

export async function sendStoredProtectedNameDecisionEmail(
  to: string,
  subject: string,
  html: string,
): Promise<string | null> {
  const result = await sendEmail({
    from: FROM_EMAIL,
    to,
    cc: "support@zcashnames.com",
    subject,
    html,
  });
  return typeof result.data?.id === "string" ? result.data.id : null;
}
