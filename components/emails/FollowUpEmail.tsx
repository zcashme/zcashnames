import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton } from "@/lib/email/styles";

interface FollowUpEmailProps {
  name: string;
  reasonCopy: string;
}

export default function FollowUpEmail({ name, reasonCopy }: FollowUpEmailProps) {
  return (
    <EmailLayout preview="We'd love to chat about ZcashNames with you." headingText="Let&rsquo;s connect">
      <Section style={content}>
        <Text style={paragraph}>Thanks for completing our survey, {name}.</Text>
        <Text style={paragraph}>{reasonCopy}</Text>
        <Text style={paragraph}>We&rsquo;d love to chat. Book a time that works for you:</Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 32px" }}>
        <Button href="https://cal.com/zcash" style={ctaButton}>
          Book a time to chat
        </Button>
      </Section>
    </EmailLayout>
  );
}