import "server-only";

import { render } from "@react-email/render";
import CampaignEmail from "@/components/emails/CampaignEmail";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import type { CampaignRecipientPersonalization } from "@/lib/campaigns/types";

export async function renderCampaignPreview(args: {
  subject: string;
  bodyText: string;
  personalization: CampaignRecipientPersonalization;
}): Promise<string> {
  return render(
    CampaignEmail({
      preview: args.subject,
      headingText: args.subject,
      bodyText: args.bodyText,
      personalization: args.personalization,
    }),
  );
}

export async function sendCampaignEmail(args: {
  to: string;
  subject: string;
  bodyText: string;
  personalization: CampaignRecipientPersonalization;
  scheduledAt?: string | null;
}): Promise<{ id: string | null | undefined }> {
  const result = await sendEmail({
    from: FROM_EMAIL,
    to: args.to,
    subject: args.subject,
    react: CampaignEmail({
      preview: args.subject,
      headingText: args.subject,
      bodyText: args.bodyText,
      personalization: args.personalization,
    }),
    scheduledAt: args.scheduledAt ?? undefined,
  });
  return { id: (result as { id?: string | null } | undefined)?.id };
}
