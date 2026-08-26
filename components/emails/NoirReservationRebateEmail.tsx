import React from "react";
import { Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, paragraph } from "@/lib/email/styles";

const fieldLabelStyle = {
  margin: "0 0 4px",
  fontSize: 12,
  lineHeight: "18px",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#a1a1aa",
};

const fieldValueStyle = {
  margin: "0 0 18px",
  fontSize: 14,
  lineHeight: "1.5",
  color: "#f0f0f0",
  wordBreak: "break-all" as const,
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
};

const signoffStyle = {
  ...paragraph,
  margin: "0",
};

export default function NoirReservationRebateEmail({
  reservedName,
  unifiedAddress,
  txid,
  waitlistRowId,
}: {
  reservedName: string;
  unifiedAddress: string;
  txid: string;
  waitlistRowId: string;
}) {
  const name = reservedName.trim() || "this name";

  return (
    <EmailLayout
      preview={`Noir rebate details for ${name}.`}
      headingText="Noir reservation rebate"
    >
      <Section style={content}>
        <Text style={paragraph}>Hello,</Text>
        <Text style={paragraph}>
          A Noir Wallet reservation opted into the rebate program and has been confirmed
          for <strong>{name}</strong>.
        </Text>
        <Text style={paragraph}>
          This address and reservation details are shared with the Noir Wallet team to
          process the rebate.
        </Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "8px 40px 8px" }}>
        <Text style={fieldLabelStyle}>Name</Text>
        <Text style={{ ...paragraph, margin: "0 0 18px", color: "#f0f0f0" }}>{name}</Text>
        <Text style={fieldLabelStyle}>Unified Address</Text>
        <Text style={fieldValueStyle}>{unifiedAddress}</Text>
        <Text style={fieldLabelStyle}>Transaction ID</Text>
        <Text style={fieldValueStyle}>{txid}</Text>
        <Text style={fieldLabelStyle}>Waitlist UUID</Text>
        <Text style={fieldValueStyle}>{waitlistRowId}</Text>
      </Section>

      <Section style={{ textAlign: "left" as const, padding: "8px 40px 32px" }}>
        <Text style={signoffStyle}>Thanks,</Text>
        <Text style={signoffStyle}>The Zcash Names team</Text>
      </Section>
    </EmailLayout>
  );
}
