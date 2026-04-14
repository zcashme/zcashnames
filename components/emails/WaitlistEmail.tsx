import { Button, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton } from "@/lib/email/styles";

interface WaitlistEmailProps {
  name: string;
  referralUrl: string;
}

const tweetText = (referralUrl: string) =>
  `Sending and receiving $ZEC will be much easier with @ZcashNames.\n\nGet your @ZcashName before it's taken:\n${referralUrl}\n\nYou'll get your own referral link to earn rewards too.`;

export default function WaitlistEmail({ name, referralUrl }: WaitlistEmailProps) {
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText(referralUrl))}`;

  return (
    <EmailLayout preview="You're in. Start sharing your referral link and earn ZEC." headingText="You're on the waitlist">
      <Section style={content}>
        <Text style={paragraph}>Hi {name},</Text>
        <Text style={paragraph}>You're early. We will give you a heads up before we launch.</Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 16px" }}>
        <Text style={{ margin: "0 0 8px", fontSize: 13, color: "#a1a1aa" }}>REFERRAL REWARDS</Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 8px" }}>
        <Button href={shareUrl} style={ctaButton}>
          Share your link on X
        </Button>
        <Text style={{ margin: "12px 0 0", fontSize: 12, color: "#a1a1aa", wordBreak: "break-all" as const }}>{referralUrl}</Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "16px 40px 0" }}>
        <Text style={paragraph}>Earn <strong>0.05 ZEC</strong> for every friend who signs up and buys during launch week.</Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "0 40px 32px" }}>
        <Text style={{ ...paragraph, margin: 0 }}>Start sharing now and dominate the leaderboard for a chance to win even more rewards.</Text>
      </Section>
    </EmailLayout>
  );
}