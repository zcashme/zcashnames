import Link from "next/link";
import { notFound } from "next/navigation";
import CampaignEditor from "@/components/admin/campaigns/CampaignEditor";
import { campaignDraftUsesLiveStats } from "@/lib/campaigns/content";
import {
  defaultScheduledSendIso,
  formatEasternDateTimeInput,
} from "@/lib/campaigns/schedule";
import { getCampaignSeriesOptions } from "@/lib/campaigns/series";
import {
  buildCampaignRecipientEstimateCacheKey,
  getCampaign,
  getCampaignPreviewRecipient,
  getOrCreateCampaignDraft,
  isCampaignDeliveryMigrationError,
  listCampaignAttempts,
  listCampaignDeliveryBatches,
} from "@/lib/campaigns/repository";
import {
  enrichCampaignPreviewPersonalization,
  renderCampaignPreview,
} from "@/lib/email/campaign";

export const dynamic = "force-dynamic";

function shouldIncludeUnsubscribe(
  sourceKind: string,
  series: string | null | undefined,
  includeUnsubscribe: boolean,
) {
  if (sourceKind === "custom_emails" && !series?.trim()) return false;
  return includeUnsubscribe;
}

export default async function CampaignDraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const [draft, deliveryBatchResult, attempts] = await Promise.all([
    getOrCreateCampaignDraft(id),
    listCampaignDeliveryBatches(id)
      .then((batches) => ({ batches, warning: null as string | null }))
      .catch((error) => {
        if (isCampaignDeliveryMigrationError(error)) {
          return {
            batches: [],
            warning: error instanceof Error ? error.message : String(error),
          };
        }
        throw error;
      }),
    listCampaignAttempts(id),
  ]);
  const deliveryBatches = deliveryBatchResult.batches;
  const providerScheduledAttempts = attempts.filter((attempt) => attempt.status === "scheduled");
  const seriesOptions = Array.from(new Set([campaign.series, ...getCampaignSeriesOptions()]));
  const estimateCacheKey = buildCampaignRecipientEstimateCacheKey({
    sourceKind: campaign.source_kind,
    audienceScope: campaign.audience_scope,
    dedupeMode: campaign.dedupe_mode,
    series: campaign.series,
    customEmailsText: draft.custom_emails_text,
  });
  const hasCurrentEstimateCache =
    campaign.recipient_estimate_cache_key === estimateCacheKey &&
    Boolean(campaign.recipient_estimate_generated_at);
  const previewRecipient = await getCampaignPreviewRecipient(id).catch(() => null);
  let personalization = previewRecipient?.personalization ?? {
    name: "Josh",
    referralCode: "jswihart",
    referralUrl: "https://zcashnames.com/?ref=jswihart",
    dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
    humanReferralCode: "josh",
    humanReferralUrl: "https://zcashnames.com/?ref=josh",
    humanDashboardUrl: "https://zcashnames.com/leaders/ref/josh",
    referralStats: null,
    relatedNames: ["Josh"],
  };
  if (
    campaign.source_kind === "zn_waitlist" &&
    campaignDraftUsesLiveStats({
      subject: draft.subject,
      bodyText: draft.body_text,
    })
  ) {
    personalization = await enrichCampaignPreviewPersonalization(
      personalization,
      campaign.source_kind,
    );
  }
  const previewHtml = await renderCampaignPreview({
    subject: draft.subject,
    bodyText: draft.body_text,
    personalization,
    includeUnsubscribe: shouldIncludeUnsubscribe(
      campaign.source_kind,
      campaign.series,
      campaign.include_unsubscribe,
    ),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-zinc-500">
        <Link href="/admin/campaigns/drafts" className="text-amber-400 hover:text-amber-300">
          Back to drafts
        </Link>
      </div>
      <CampaignEditor
        campaignId={campaign.id}
        initialTitle={campaign.title}
        initialSourceKind={campaign.source_kind}
        initialSeries={campaign.series}
        initialIncludeUnsubscribe={campaign.include_unsubscribe}
        initialAudienceScope={campaign.audience_scope}
        initialDedupeMode={campaign.dedupe_mode}
        initialPersonalizationMode={campaign.personalization_mode}
        initialSeriesOptions={seriesOptions}
        initialCustomEmailsText={draft.custom_emails_text ?? ""}
        initialSubject={draft.subject}
        initialBodyText={draft.body_text}
        initialPreviewHtml={previewHtml}
        initialRecipientCount={campaign.recipient_count}
        initialRecipientSample={campaign.recipient_sample ?? []}
        initialBlockedRecipients={campaign.recipient_blocked ?? []}
        initialEstimateError={null}
        initialRecipientEstimateDirty={!hasCurrentEstimateCache}
        initialDeliveryBatches={deliveryBatches.map((batch) => ({
          id: batch.id,
          batchNumber: batch.batch_number,
          status: batch.status,
          recipientCount: batch.recipient_count,
          sentCount: batch.sent_count,
          failedCount: batch.failed_count,
          nextEligibleAt: batch.next_eligible_at,
        }))}
        initialDeliveryPausedAt={campaign.delivery_paused_at}
        initialDeliveryCanceledAt={campaign.delivery_canceled_at}
        initialDeliveryWarning={deliveryBatchResult.warning}
        initialProviderScheduledAt={
          providerScheduledAttempts[0]?.scheduled_for ?? campaign.scheduled_at ?? null
        }
        initialProviderScheduledCount={providerScheduledAttempts.length}
        initialProviderFailedCount={attempts.filter((attempt) => attempt.status === "failed").length}
        initialProviderManaged={deliveryBatches.length === 0 && providerScheduledAttempts.length > 0}
        initialScheduledAt={formatEasternDateTimeInput(campaign.scheduled_at ?? defaultScheduledSendIso())}
        draftsListHref="/admin/campaigns/drafts"
      />
    </div>
  );
}
