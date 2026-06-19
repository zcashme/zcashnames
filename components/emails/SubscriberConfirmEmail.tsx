import { Button, Section, Text } from "@react-email/components";
import { createZcashNamesHeaderMark, EmailLayout } from "./EmailLayout";
import { content, ctaButton, paragraph } from "@/lib/email/styles";

export default function SubscriberConfirmEmail({
  email,
  series,
  confirmUrl,
}: {
  email: string;
  series: string;
  confirmUrl: string;
}) {
  return (
    <EmailLayout
      preview={`Confirm your ${series} email subscription.`}
      headingText="Confirm your subscription"
      headerMark={createZcashNamesHeaderMark()}
    >
      <Section style={content}>
        <Text style={paragraph}>Hi,</Text>
        <Text style={paragraph}>
          Click below to confirm that <strong>{email}</strong> should receive ZcashNames{" "}
          <strong>{series}</strong> emails.
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 8px" }}>
        <Button href={confirmUrl} style={ctaButton}>
          Confirm subscription
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

      <Section style={{ textAlign: "left" as const, padding: "16px 40px 32px" }}>
        <Text style={{ ...paragraph, margin: 0, color: "#a1a1aa", fontSize: 13 }}>
          If you didn&apos;t request this change, you can ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}
