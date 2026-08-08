import { Link, Section, Text } from "@react-email/components";
import { EmailCtaButton } from "./EmailCtaButton";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph } from "@/lib/email/styles";

export type WaitlistReservationConfirmedOtherName = {
  name: string;
  status: "pending" | "protected";
};

function otherNamesSummaryLine(args: {
  pendingCount: number;
  protectedCount: number;
}): string {
  const parts: string[] = [];

  if (args.pendingCount > 0) {
    parts.push(
      `${args.pendingCount} pending reservation${args.pendingCount === 1 ? "" : "s"}`,
    );
  }

  if (args.protectedCount > 0) {
    parts.push(
      `${args.protectedCount} protected name${args.protectedCount === 1 ? "" : "s"}`,
    );
  }

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return `You still have ${parts[0]} linked to this email.`;
  }

  return `You still have ${parts[0]} and ${parts[1]} linked to this email.`;
}

const noteStyle = {
  ...paragraph,
  margin: "0 0 18px",
};

const signoffStyle = {
  ...paragraph,
  margin: "0",
};

const inlineLinkStyle = {
  color: "#F4B728",
  textDecoration: "underline" as const,
  fontWeight: 600,
};

export default function WaitlistReservationConfirmedEmail({
  name,
  dashboardUrl,
  reservationUrl,
  queueUrl,
  otherNames,
}: {
  name: string;
  dashboardUrl: string;
  reservationUrl: string;
  queueUrl: string;
  otherNames: WaitlistReservationConfirmedOtherName[];
}) {
  const pendingCount = otherNames.filter((entry) => entry.status === "pending").length;
  const protectedCount = otherNames.filter((entry) => entry.status === "protected").length;
  const summaryLine = otherNamesSummaryLine({ pendingCount, protectedCount });

  return (
    <EmailLayout
      preview="Your reservation is confirmed and you're ready for Early Access."
      headingText="You're ready for Early Access"
    >
      <Section style={content}>
        <Text style={paragraph}>Hello again,</Text>
        <Text style={paragraph}>
          Your reservation for <strong>{name}</strong> is confirmed.
        </Text>
      </Section>

      {otherNames.length > 0 ? (
        <Section style={{ textAlign: "left" as const, padding: "0 40px 4px" }}>
          <Text style={paragraph}>
            <strong>{summaryLine}</strong>
          </Text>
        </Section>
      ) : null}

      <Section style={{ textAlign: "center" as const, padding: "0 40px 12px" }}>
        <EmailCtaButton href={reservationUrl}>View reservation page</EmailCtaButton>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "0 40px 4px" }}>
        <Text style={noteStyle}>
          <strong>Please note:</strong> Early Access does not guarantee that{" "}
          <strong>{name}</strong> will remain available. Your position in line determines
          when you can try to purchase it.{" "}
          <Link href={queueUrl} style={inlineLinkStyle}>
            View queue
          </Link>
        </Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "0 40px 20px" }}>
        <Text style={noteStyle}>
          Improve your position and earn ZEC by referring others who join the waitlist
          and purchase a name during Early Access. Referral rewards are subject to
          eligibility and program terms.{" "}
          <Link href={dashboardUrl} style={inlineLinkStyle}>
            View referral dashboard
          </Link>
        </Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "0 40px 32px" }}>
        <Text style={signoffStyle}>See you in Early Access,</Text>
        <Text style={signoffStyle}>The Zcash Names team</Text>
      </Section>
    </EmailLayout>
  );
}
