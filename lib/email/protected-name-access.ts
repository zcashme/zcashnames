import "server-only";

import type { WaitlistProtectedAccessRequest } from "@/lib/campaigns/waitlist-protected-access";
import { FROM_EMAIL, TO_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import { PROTECTED_ACCESS_RELATIONSHIP_LABEL } from "@/lib/protected/shared";

type ProtectedNameAccessRequestNotice = {
  event: "submitted" | "updated";
  request: WaitlistProtectedAccessRequest;
};

function row(label: string, value: string | null | undefined): string {
  if (!value) return "";
  return `${label}: ${value}\n`;
}

export async function sendProtectedNameAccessRequestNotice(
  notice: ProtectedNameAccessRequestNotice,
): Promise<void> {
  const requestedName = notice.request.requestedName.trim() || "Protected name";
  const contactBlock = notice.request.contactMethods.length
    ? notice.request.contactMethods
        .map((contact) => {
          const isPreferred =
            contact.kind === notice.request.preferredContactKind &&
            contact.value === notice.request.preferredContactValue;
          return `  - ${contact.kind}${isPreferred ? " (preferred)" : ""}: ${contact.value}`;
        })
        .join("\n")
    : "  (none)";

  const body = [
    `Protected name access request ${notice.event}: ${requestedName}`,
    "",
    `Request id:         ${notice.request.id}`,
    `Reference number:   ${notice.request.referenceNumber}`,
    `Event:              ${notice.event}`,
    `Status:             ${notice.request.status}`,
    `Requested name:     ${requestedName}`,
    `Waitlist row id:    ${notice.request.waitlistRowId ?? "(none — public /protected/request)"}`,
    `Normalized email:   ${notice.request.normalizedEmail}`,
    `Submitted at:       ${notice.request.submittedAt}`,
    `Updated at:         ${notice.request.updatedAt}`,
    row(
      "Relationship",
      notice.request.relationship
        ? PROTECTED_ACCESS_RELATIONSHIP_LABEL[notice.request.relationship]
        : null,
    ).trimEnd(),
    row(
      "Preferred contact",
      notice.request.preferredContactKind && notice.request.preferredContactValue
        ? `${notice.request.preferredContactKind}: ${notice.request.preferredContactValue}`
        : null,
    ).trimEnd(),
    "",
    "Contact methods:",
    contactBlock,
    "",
    "Supporting details:",
    row("Supporting link", notice.request.supportingLink).trimEnd() || "Supporting link: (none)",
    "",
    "Additional context:",
    notice.request.additionalContext || "(none)",
    "",
    "-",
    "Open the waitlist_protected_name_access_requests table in Supabase to review this request.",
    "Approval and denial are still handled manually.",
  ].join("\n");

  await sendEmail({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: `Protected name access request: ${requestedName}`,
    text: body,
  });
}
