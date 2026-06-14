import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton } from "@/lib/email/styles";

export default function BlogSubscriberConfirmEmail({
  seriesTitle,
  confirmUrl,
}: {
  seriesTitle: string;
  confirmUrl: string;
}) {
  return (
    <EmailLayout preview={`Confirm your subscription to ${seriesTitle}.`} headingText="Confirm your subscription">
      <Section style={content}>
        <Text style={paragraph}>You asked to subscribe to {seriesTitle}.</Text>
        <Text style={paragraph}>
          Click below to confirm your email and receive updates when new posts in this series are published.
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
          If you didn&apos;t request this, you can ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}
