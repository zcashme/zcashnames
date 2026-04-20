import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph, ctaButton, divider } from "@/lib/email/styles";

interface WaitlistEmailProps {
  name: string;
  referralUrl: string;
  referralCode: string;
  accessPin?: string;
}

const tweetText = (referralUrl: string) =>
  `Sending and receiving $ZEC will be much easier with @ZcashNames.\n\nGet your @ZcashName before it's taken:\n${referralUrl}\n\nYou'll get your own referral link to earn rewards too.`;

export default function WaitlistEmail({ name, referralUrl, referralCode, accessPin = "######" }: WaitlistEmailProps) {
  const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText(referralUrl))}`;
  const leaderboardUrl = new URL("/leaders", referralUrl).toString();
  const dashboardUrl = new URL(`/leaders/ref/${encodeURIComponent(referralCode)}`, referralUrl).toString();
  const termsUrl = new URL("/leaders/terms", referralUrl).toString();

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
        <Text style={paragraph}>
          Earn up to <strong>0.05 ZEC</strong> for each signup that buys a name during early access. Earn from their
          referrals too! You can view your referral activity and earnings{" "}
          <Link href={dashboardUrl} style={{ color: "#f4b728", textDecoration: "underline" }}>
            here
          </Link>
          {" "}(passcode <strong>{accessPin}</strong>).
        </Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "0 40px 32px" }}>
        <Text style={paragraph}>
          Start sharing now to stack ZEC and dominate the{" "}
          <Link href={leaderboardUrl} style={{ color: "#f4b728", textDecoration: "underline" }}>
            leaderboard
          </Link>
          !
        </Text>
        <Text style={paragraph}>Have fun!</Text>
        <Text style={{ ...paragraph, margin: 0 }}>Zechariah</Text>
      </Section>

      <Hr style={{ ...divider, margin: "0 40px 24px" }} />

      <Section style={{ textAlign: "left" as const, padding: "0 40px 32px" }}>
        <Text style={{ margin: 0, fontSize: 12, lineHeight: "18px", color: "#a1a1aa" }}>
          To ensure you receive updates, add our sending address to your contacts or allowlist. If any message lands in spam or promotions, move it to your main inbox and mark it as &ldquo;not spam.&rdquo; View{" "}
          <Link href={termsUrl} style={{ color: "#d4d4d8", textDecoration: "underline" }}>
            terms
          </Link>
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}
