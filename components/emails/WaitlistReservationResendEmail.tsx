import { Link, Section, Text } from "@react-email/components";
import { EmailCtaButton } from "./EmailCtaButton";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph } from "@/lib/email/styles";

export type WaitlistReservationEmailStatus = "reserved" | "pending" | "protected";

export type WaitlistReservationEmailName = {
  name: string;
  status: WaitlistReservationEmailStatus;
  shareKitUrl: string | null;
};

type WaitlistReservationSingleNameEmailProps = {
  variant?: "single-name";
  name?: string | null;
  confirmUrl: string;
  shareKitUrl?: string | null;
  names?: never;
};

type WaitlistReservationMultiNameEmailProps = {
  variant: "multi-name";
  confirmUrl: string;
  names: WaitlistReservationEmailName[];
  name?: never;
  shareKitUrl?: never;
};

type WaitlistReservationResendEmailProps =
  | WaitlistReservationSingleNameEmailProps
  | WaitlistReservationMultiNameEmailProps;

const cardStyle = {
  margin: "0 0 12px",
  padding: "14px 16px",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  backgroundColor: "#121212",
};

const labelStyle = {
  margin: "0 0 6px",
  fontSize: 12,
  lineHeight: "16px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#a1a1aa",
};

const nameStyle = {
  margin: "0 0 4px",
  fontSize: 16,
  lineHeight: "22px",
  fontWeight: 700,
  color: "#f4f4f5",
};

const statusStyle = {
  margin: 0,
  fontSize: 14,
  lineHeight: "20px",
  color: "#d4d4d8",
};

function formatStatusLabel(status: WaitlistReservationEmailStatus): string {
  if (status === "reserved") return "Reserved";
  if (status === "protected") return "Protected";
  return "Pending";
}

function MultiNameList({ names }: { names: WaitlistReservationEmailName[] }) {
  return (
    <Section style={{ padding: "8px 40px 0" }}>
      <Text style={{ ...paragraph, margin: "0 0 12px", fontWeight: 700, color: "#f4f4f5" }}>
        Names on this inbox
      </Text>
      {names.map((entry) => (
        <Section key={`${entry.name}:${entry.status}`} style={cardStyle}>
          <Text style={labelStyle}>Status</Text>
          <Text style={nameStyle}>{entry.name}</Text>
          <Text style={statusStyle}>{formatStatusLabel(entry.status)}</Text>
          {entry.shareKitUrl ? (
            <Text style={{ ...paragraph, margin: "10px 0 0", fontSize: 13 }}>
              <Link
                href={entry.shareKitUrl}
                style={{ color: "#d4d4d8", textDecoration: "underline" }}
              >
                Share referral link
              </Link>
            </Text>
          ) : null}
        </Section>
      ))}
    </Section>
  );
}

export default function WaitlistReservationResendEmail(props: WaitlistReservationResendEmailProps) {
  const { confirmUrl } = props;
  const variant = props.variant ?? "single-name";
  const name = variant === "single-name" ? props.name : null;
  const displayName = name?.trim() || "there";
  const preview =
    variant === "multi-name"
      ? "Open your reservation link and complete your reservations for Early Access."
      : "Open your reservation link and complete your reservation for Early Access.";

  return (
    <EmailLayout
      preview={preview}
      headingText="Get Ready to Claim Your Name!"
    >
      <Section style={content}>
        <Text style={paragraph}>Hi {variant === "multi-name" ? "there" : displayName},</Text>
        <Text style={paragraph}>
          {variant === "multi-name"
            ? "Use the link below to open your reservation link and complete your reservations for Early Access."
            : "Use the link below to open your reservation link and complete your reservation for Early Access."}
        </Text>
      </Section>

      <Section style={{ textAlign: "center" as const, padding: "0 40px 8px" }}>
        <EmailCtaButton href={confirmUrl}>Get started</EmailCtaButton>
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
      {variant === "multi-name" ? <MultiNameList names={props.names ?? []} /> : null}
    </EmailLayout>
  );
}
