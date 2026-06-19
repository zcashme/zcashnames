/**
 * React Email template: partner/survey follow-up email. Uses a dynamic reasonCopy
 * string (set by the admin sending the follow-up) to personalize the message,
 * with a Cal.com booking link for scheduling a call.
 */
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton } from "@/lib/email/styles";

interface FollowUpEmailProps {
  name: string;
  reasonCopy: string;
  unsubscribeLinks?: {
    seriesHref: string;
    allHref: string;
  } | null;
}

export default function FollowUpEmail({
  name,
  reasonCopy,
  unsubscribeLinks,
}: FollowUpEmailProps) {
  return (
    <EmailLayout
      preview="We'd love to chat about ZcashNames with you."
      headingText="Let&rsquo;s connect"
      unsubscribeLinks={unsubscribeLinks}
    >
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
