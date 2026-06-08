import { Hr, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, divider, paragraph } from "@/lib/email/styles";

interface ReferralRecoveryEntry {
  name: string;
  referralCode: string;
  referralUrl: string;
  dashboardUrl: string;
  accessPin: string;
}

export default function ReferralRecoveryEmail({
  entries,
}: {
  entries: ReferralRecoveryEntry[];
}) {
  return (
    <EmailLayout
      preview="Your verified ZcashNames referral codes."
      headingText="Your referral codes"
    >
      <Section style={content}>
        <Text style={paragraph}>
          We found the following verified waitlist names tied to this email address.
        </Text>
      </Section>

      {entries.map((entry, index) => (
        <Section key={entry.referralCode} style={{ padding: "0 40px 24px" }}>
          <Text style={{ margin: "0 0 6px", fontSize: 12, color: "#a1a1aa" }}>
            NAME
          </Text>
          <Text style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 600, color: "#f0f0f0" }}>
            {entry.name}.zcash
          </Text>
          <Text style={{ ...paragraph, marginBottom: 10 }}>
            Referral code: <strong>{entry.referralCode}</strong>
          </Text>
          <Text
            style={{
              ...paragraph,
              marginBottom: 10,
              fontSize: 13,
              wordBreak: "break-all",
            }}
          >
            Share link:{" "}
            <Link href={entry.referralUrl} style={{ color: "#f4b728", textDecoration: "underline" }}>
              {entry.referralUrl}
            </Link>
          </Text>
          <Text style={{ ...paragraph, margin: 0 }}>
            Dashboard:{" "}
            <Link href={entry.dashboardUrl} style={{ color: "#f4b728", textDecoration: "underline" }}>
              open referral dashboard
            </Link>
            {" "} (passcode <strong>{entry.accessPin}</strong>)
          </Text>
          {index < entries.length - 1 ? (
            <Hr style={{ ...divider, margin: "24px 0 0" }} />
          ) : null}
        </Section>
      ))}

      <Section style={{ textAlign: "left" as const, padding: "0 40px 32px" }}>
        <Text style={{ ...paragraph, margin: 0 }}>
          Use any of these referral codes in Share Kit or when opening your leaderboard dashboard.
        </Text>
      </Section>
    </EmailLayout>
  );
}
