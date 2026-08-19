import { Section, Text } from "@react-email/components";
import { EmailCtaButton } from "./EmailCtaButton";
import { createZcashNamesHeaderMark, EmailLayout } from "./EmailLayout";
import { content, paragraph } from "@/lib/email/styles";

export default function PreferencesLinkEmail({
  email,
  preferencesUrl,
}: {
  email: string;
  preferencesUrl: string;
}) {
  return (
    <EmailLayout
      preview="Manage your ZcashNames email preferences."
      headingText="Email preferences"
      headerMark={createZcashNamesHeaderMark()}
    >
      <Section style={content}>
        <Text style={paragraph}>Hi,</Text>
        <Text style={paragraph}>
          Use this link to manage email preferences for <strong>{email}</strong>, including
          early-access and waitlist updates.
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 8px" }}>
        <EmailCtaButton href={preferencesUrl}>Manage preferences</EmailCtaButton>
        <Text
          style={{
            margin: "12px 0 0",
            fontSize: 12,
            color: "#a1a1aa",
            wordBreak: "break-all" as const,
          }}
        >
          {preferencesUrl}
        </Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "16px 40px 32px" }}>
        <Text style={{ ...paragraph, margin: 0, color: "#a1a1aa", fontSize: 13 }}>
          If you didn&apos;t request this link, you can ignore this email.
        </Text>
      </Section>
    </EmailLayout>
  );
}
