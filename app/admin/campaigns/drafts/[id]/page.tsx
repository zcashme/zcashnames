import Link from "next/link";
import { notFound } from "next/navigation";
import CampaignEditor from "@/components/admin/campaigns/CampaignEditor";
import { defaultScheduledSendIso, formatLocalDateTimeInput } from "@/lib/campaigns/schedule";
import {
  estimateCampaignRecipients,
  getCampaign,
  getOrCreateCampaignDraft,
} from "@/lib/campaigns/repository";
import { renderCampaignPreview } from "@/lib/email/campaign";

export const dynamic = "force-dynamic";

export default async function CampaignDraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const draft = await getOrCreateCampaignDraft(id);
  const estimate = await estimateCampaignRecipients(id);
  const personalization = estimate.sample[0]?.personalization ?? {
    name: "Josh",
    referralCode: "jswihart",
    referralUrl: "https://zcashnames.com/?ref=jswihart",
    dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
    relatedNames: ["Josh"],
  };
  const previewHtml = await renderCampaignPreview({
    subject: draft.subject,
    bodyText: draft.body_text,
    personalization,
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
        initialAudienceScope={campaign.audience_scope}
        initialDedupeMode={campaign.dedupe_mode}
        initialPersonalizationMode={campaign.personalization_mode}
        initialSubject={draft.subject}
        initialBodyText={draft.body_text}
        initialPreviewHtml={previewHtml}
        initialRecipientCount={estimate.count}
        initialRecipientSample={estimate.sample.map((recipient) => ({
          email: recipient.email,
          name: recipient.personalization.name,
          names: recipient.personalization.relatedNames,
        }))}
        initialScheduledAt={formatLocalDateTimeInput(campaign.scheduled_at ?? defaultScheduledSendIso())}
        draftsListHref="/admin/campaigns/drafts"
      />
    </div>
  );
}
