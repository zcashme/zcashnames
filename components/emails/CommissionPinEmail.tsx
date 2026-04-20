import { Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph } from "@/lib/email/styles";

interface CommissionPinEmailProps {
  name: string;
  pin: string;
  dashboardUrl: string;
}

export default function CommissionPinEmail({ name, pin, dashboardUrl }: CommissionPinEmailProps) {
  return (
    <EmailLayout preview="Your ZcashNames access code." headingText="Your access code">
      <Section style={content}>
        <Text style={{ ...paragraph, margin: "16px 0 16px", textAlign: "center" as const }}>
          Your referral dashboard access code is:
        </Text>
        <Text
          style={{
            margin: "0 0 16px",
            color: "#f0f0f0",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textAlign: "center" as const,
          }}
        >
          {pin}
        </Text>
        <Text style={{ ...paragraph, margin: "0 0 16px", textAlign: "center" as const, wordBreak: "break-all" as const }}>
          {dashboardUrl}
        </Text>
      </Section>
    </EmailLayout>
  );
}
