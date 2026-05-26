import { Button, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton, divider } from "@/lib/email/styles";

interface BetaInviteEmailProps {
  displayName: string;
  joinUrl: string;
}

export default function BetaInviteEmail({ displayName, joinUrl }: BetaInviteEmailProps) {
  return (
    <EmailLayout preview="You've been accepted to the ZcashNames beta." headingText="You're in the beta">
      <Section style={content}>
        <Text style={paragraph}>Hi {displayName},</Text>
        <Text style={paragraph}>
          You've been accepted to the ZcashNames closed beta. Click the button below to redeem your
          invite and get started.
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "8px 40px 32px" }}>
        <Button href={joinUrl} style={ctaButton}>
          Redeem your invite
        </Button>
      </Section>

      <Hr style={{ ...divider, margin: "0 40px 24px" }} />

      <Section style={{ textAlign: "left" as const, padding: "0 40px 32px" }}>
        <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: "#a1a1aa" }}>
          This invite is personal to you. If the button does not work, copy and paste this link into
          your browser: {joinUrl}
        </Text>
      </Section>
    </EmailLayout>
  );
}
