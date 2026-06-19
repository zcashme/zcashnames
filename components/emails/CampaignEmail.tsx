import { Hr, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, divider, paragraph } from "@/lib/email/styles";
import {
  parseInlineLinks,
  resolveCampaignTokens,
  splitCampaignParagraphs,
} from "@/lib/campaigns/content";
import type { CampaignRecipientPersonalization } from "@/lib/campaigns/types";

type EmailUnsubscribeLinks = {
  seriesHref: string;
  allHref: string;
};

function Paragraph({
  text,
  personalization,
}: {
  text: string;
  personalization: CampaignRecipientPersonalization;
}) {
  const resolved = resolveCampaignTokens(text, personalization);
  const parts = parseInlineLinks(resolved);
  return (
    <Text style={paragraph}>
      {parts.map((part, index) =>
        part.type === "link" && part.href ? (
          <Link key={`${part.href}-${index}`} href={part.href} style={{ color: "#F4B728" }}>
            {part.text}
          </Link>
        ) : (
          <span key={`${part.text}-${index}`}>{part.text}</span>
        ),
      )}
    </Text>
  );
}

export default function CampaignEmail({
  preview,
  headingText,
  bodyText,
  personalization,
  unsubscribeLinks,
}: {
  preview: string;
  headingText: string;
  bodyText: string;
  personalization: CampaignRecipientPersonalization;
  unsubscribeLinks?: EmailUnsubscribeLinks | null;
}) {
  const paragraphs = splitCampaignParagraphs(bodyText);
  return (
    <EmailLayout
      preview={preview}
      headingText={headingText}
      unsubscribeLinks={unsubscribeLinks}
    >
      <Section style={content}>
        <Text style={paragraph}>Hi {personalization.name},</Text>
        {paragraphs.map((text, index) => (
          <Paragraph
            key={`${index}-${text.slice(0, 24)}`}
            text={text}
            personalization={personalization}
          />
        ))}
      </Section>

      {personalization.relatedNames.length > 1 && (
        <>
          <Hr style={{ ...divider, margin: "0 40px 24px" }} />
          <Section style={{ padding: "0 40px 24px" }}>
            <Text style={{ ...paragraph, marginBottom: 8 }}>
              This inbox is associated with these waitlist names:
            </Text>
            <Text style={{ ...paragraph, marginBottom: 0 }}>
              {personalization.relatedNames.join(", ")}
            </Text>
          </Section>
        </>
      )}
    </EmailLayout>
  );
}
