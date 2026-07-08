import "server-only";

import { render } from "@react-email/render";
import CampaignEmail from "@/components/emails/CampaignEmail";
import { flattenToPlainText, resolveCampaignTokens } from "@/lib/campaigns/content";
import { getCampaignReferralStats, withCampaignReferralStats } from "@/lib/campaigns/referral-stats";
import { FROM_EMAIL } from "@/lib/email/constants";
import {
  sendBatchEmails,
  sendEmail,
  type SendBatchEmailParams,
  type SendEmailParams,
} from "@/lib/email/client";
import { buildUnsubscribeLinks, ensureMarketingEmailAllowed } from "@/lib/email/policy";
import type { CampaignRecipientPersonalization } from "@/lib/campaigns/types";

export interface CampaignSendEmailArgs {
  to: string;
  subject: string;
  bodyText: string;
  headingText?: string | null;
  showRelatedNamesFooter?: boolean;
  personalization: CampaignRecipientPersonalization;
  series?: string | null;
  includeUnsubscribe?: boolean;
  baseUrl?: string;
  scheduledAt?: string | null;
  skipConsentCheck?: boolean;
}

export async function enrichCampaignPreviewPersonalization(
  personalization: CampaignRecipientPersonalization,
  sourceKind?: string | null,
): Promise<CampaignRecipientPersonalization> {
  if (sourceKind !== "zn_waitlist" || !personalization.referralCode?.trim()) {
    return withCampaignReferralStats(personalization, null);
  }
  const stats = await getCampaignReferralStats(personalization.referralCode);
  return withCampaignReferralStats(personalization, stats);
}

export async function renderCampaignPreview(args: {
  subject: string;
  bodyText: string;
  headingText?: string | null;
  showRelatedNamesFooter?: boolean;
  personalization: CampaignRecipientPersonalization;
  includeUnsubscribe?: boolean;
  unsubscribeLinks?: {
    seriesHref: string;
    allHref: string;
  } | null;
}): Promise<string> {
  const resolvedSubject = resolveCampaignTokens(args.subject, args.personalization);
  const resolvedHeadingText = args.headingText?.trim()
    ? resolveCampaignTokens(args.headingText, args.personalization)
    : null;
  return render(
    CampaignEmail({
      preview: resolvedSubject,
      headingText: resolvedHeadingText,
      bodyText: args.bodyText,
      showRelatedNamesFooter: args.showRelatedNamesFooter,
      personalization: args.personalization,
      unsubscribeLinks:
        args.includeUnsubscribe === false
          ? null
          : args.unsubscribeLinks ?? {
              seriesHref: "https://zcashnames.com/unsubscribe?token=sample-series-token",
              allHref: "https://zcashnames.com/unsubscribe?token=sample-all-token",
            },
    }),
  );
}

async function buildCampaignEmailBasePayload(
  args: CampaignSendEmailArgs,
): Promise<Omit<SendEmailParams, "scheduledAt">> {
  const resolvedSubject = resolveCampaignTokens(args.subject, args.personalization);
  const resolvedHeadingText = args.headingText?.trim()
    ? resolveCampaignTokens(args.headingText, args.personalization)
    : null;
  const resolvedBodyText = resolveCampaignTokens(args.bodyText, args.personalization);
  const hasSeries = Boolean(args.series?.trim());
  if (!args.skipConsentCheck && hasSeries) {
    await ensureMarketingEmailAllowed(args.to, args.series!.trim());
  }
  const unsubscribeLinks =
    args.includeUnsubscribe === false || !hasSeries
      ? null
      : buildUnsubscribeLinks({
          email: args.to,
          series: args.series!.trim(),
          baseUrl: args.baseUrl,
        });
  const html = await render(
    CampaignEmail({
      preview: resolvedSubject,
      headingText: resolvedHeadingText,
      bodyText: args.bodyText,
      showRelatedNamesFooter: args.showRelatedNamesFooter,
      personalization: args.personalization,
      unsubscribeLinks,
    }),
  );
  const plainTextParts = [
    resolvedHeadingText?.trim() ? resolvedHeadingText.trim() : null,
    flattenToPlainText(resolvedBodyText),
    args.showRelatedNamesFooter !== false && args.personalization.relatedNames.length > 1
      ? `This inbox is associated with these waitlist names:\n\n${args.personalization.relatedNames.join(", ")}`
      : null,
  ].filter((value): value is string => Boolean(value && value.trim()));

  return {
    from: FROM_EMAIL,
    to: args.to,
    subject: resolvedSubject,
    html,
    text: plainTextParts.join("\n\n"),
  };
}

export async function buildCampaignBatchEmailPayload(
  args: CampaignSendEmailArgs,
): Promise<SendBatchEmailParams[number]> {
  return buildCampaignEmailBasePayload(args);
}

export async function sendCampaignEmail(
  args: CampaignSendEmailArgs,
): Promise<{ id: string | null | undefined }> {
  const payload = {
    ...(await buildCampaignEmailBasePayload(args)),
    scheduledAt: args.scheduledAt ?? undefined,
  } as SendEmailParams;
  const result = await sendEmail(payload);
  return {
    id:
      (result as { data?: { id?: string | null } } | undefined)?.data?.id ??
      (result as { id?: string | null } | undefined)?.id ??
      null,
  };
}

export async function sendCampaignEmailBatch(
  payloads: SendBatchEmailParams,
): Promise<Array<{ id: string | null | undefined }>> {
  const result = await sendBatchEmails(payloads);
  const ids = ((result as { data?: Array<{ id?: string | null }> } | undefined)?.data ?? []).map(
    (entry) => ({ id: entry.id ?? null }),
  );
  if (ids.length !== payloads.length) {
    throw new Error(
      `Batch send returned ${ids.length} accepted emails for ${payloads.length} payloads.`,
    );
  }
  return ids;
}
