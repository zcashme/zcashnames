import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, ctaButton, paragraph } from "@/lib/email/styles";
import type { WaitlistRowDeleteRequestRowStatus } from "@/lib/campaigns/waitlist-row-delete";

function statusWarning(status: WaitlistRowDeleteRequestRowStatus, name: string): string {
  if (status === "reserved") {
    return `This will remove ${name} from your active reservation dashboard. It will not reverse any on-chain payment or refund any reservation fee.`;
  }

  if (status === "protected") {
    return `This will remove ${name} and any active protected-name access request tied to this waitlist entry.`;
  }

  return `Removing ${name} will discard its position for Early Access.`;
}

export default function WaitlistDeleteConfirmEmail({
  email,
  name,
  confirmUrl,
  rowStatus,
}: {
  email: string;
  name: string;
  confirmUrl: string;
  rowStatus: WaitlistRowDeleteRequestRowStatus;
}) {
  return (
    <EmailLayout
      preview={`Confirm removal of ${name}.`}
      headingText="Confirm name removal"
    >
      <Section style={content}>
        <Text style={paragraph}>Hi there,</Text>
        <Text style={paragraph}>
          We received a request to remove <strong>{name}</strong> from the Zcash Names waitlist
          for <strong>{email}</strong>.
        </Text>
        <Text style={paragraph}>
          If you confirm, this name will be permanently removed from our active
          waitlist and from your reservation dashboard.
        </Text>
        <Text style={{ ...paragraph, marginTop: 18 }}>
          <strong>Warning:</strong> {statusWarning(rowStatus, name)}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 8px" }}>
        <Button href={confirmUrl} style={ctaButton}>
          Confirm removal
        </Button>
        <Text
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            color: "#a1a1aa",
            wordBreak: "break-all" as const,
          }}
        >
          {confirmUrl}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "16px 40px 32px" }}>
        <Text style={{ ...paragraph, margin: 0, color: "#a1a1aa", fontSize: 13 }}>
          If you did not request this, you can ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}
