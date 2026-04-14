import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton } from "@/lib/email/styles";

interface ConfirmEmailProps {
  name: string;
  confirmUrl: string;
}

export default function ConfirmEmail({ name, confirmUrl }: ConfirmEmailProps) {
  return (
    <EmailLayout preview="Confirm your email to join the ZcashNames waitlist." headingText="Confirm your email">
      <Section style={content}>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>
          Click the button below to confirm your email and secure your spot on the
          ZcashNames waitlist.
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 8px" }}>
        <Button href={confirmUrl} style={ctaButton}>
          Confirm your email
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
          If you didn&apos;t sign up for ZcashNames, you can ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}