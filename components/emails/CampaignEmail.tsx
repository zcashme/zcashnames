import { Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { content, divider, paragraph } from "@/lib/email/styles";
import { resolveCampaignTokens } from "@/lib/campaigns/content";
import EmailRichBody from "./EmailRichBody";
import type { CampaignRecipientPersonalization } from "@/lib/campaigns/types";
import type { EmailUnsubscribeLinks } from "@/lib/email/policy";

export default function CampaignEmail({
  preview,
  headingText,
  bodyText,
  showRelatedNamesFooter,
  personalization,
  unsubscribeLinks,
}: {
  preview: string;
  headingText?: string | null;
  bodyText: string;
  showRelatedNamesFooter?: boolean;
  personalization: CampaignRecipientPersonalization;
  unsubscribeLinks?: EmailUnsubscribeLinks | null;
}) {
  const resolvedBodyText = resolveCampaignTokens(bodyText, personalization);
  return (
    <EmailLayout preview={preview} headingText={headingText} unsubscribeLinks={unsubscribeLinks}>
      <Section style={content}>
        <EmailRichBody bodyText={resolvedBodyText} />
      </Section>

      {showRelatedNamesFooter !== false && personalization.relatedNames.length > 1 && (
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
