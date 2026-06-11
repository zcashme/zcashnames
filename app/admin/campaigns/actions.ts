"use server";

import { revalidatePath } from "next/cache";
import {
  createCampaignDraft,
  estimateCampaignRecipients,
  getCampaign,
  getCampaignDraft,
  listCampaignRecipientSnapshots,
  markCampaignStatus,
  recordCampaignAttempt,
  snapshotCampaignRecipients,
  updateCampaignDraft,
} from "@/lib/campaigns/repository";
import type {
  CampaignAudienceScope,
  CampaignDedupeMode,
  CampaignPersonalizationMode,
  CampaignSourceKind,
} from "@/lib/campaigns/types";
import { renderCampaignPreview, sendCampaignEmail } from "@/lib/email/campaign";

function revalidateCampaignPaths(campaignId?: string) {
  revalidatePath("/admin/campaigns/drafts");
  revalidatePath("/admin/campaigns/sent");
  if (campaignId) {
    revalidatePath(`/admin/campaigns/drafts/${campaignId}`);
    revalidatePath(`/admin/campaigns/sent/${campaignId}`);
  }
}

export async function createCampaignAction(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const campaign = await createCampaignDraft();
    revalidateCampaignPaths(campaign.id);
    return { ok: true, id: campaign.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function saveCampaignAction(
  campaignId: string,
  patch: {
    title: string;
    sourceKind: CampaignSourceKind;
    audienceScope: CampaignAudienceScope;
    dedupeMode: CampaignDedupeMode;
    personalizationMode: CampaignPersonalizationMode;
    subject: string;
    bodyText: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateCampaignDraft(campaignId, {
      title: patch.title,
      sourceKind: patch.sourceKind,
      audienceScope: patch.audienceScope,
      dedupeMode: patch.dedupeMode,
      personalizationMode: patch.personalizationMode,
      draft: { subject: patch.subject, bodyText: patch.bodyText },
    });
    revalidateCampaignPaths(campaignId);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function renderCampaignPreviewAction(
  campaignId: string,
  draft: { subject: string; bodyText: string },
): Promise<string> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) throw new Error("Campaign not found.");
  const estimate = await estimateCampaignRecipients(campaignId);
  const personalization = estimate.sample[0]?.personalization ?? {
    name: "Josh",
    referralCode: "jswihart",
    referralUrl: "https://zcashnames.com/?ref=jswihart",
    dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
    relatedNames: ["Josh"],
  };
  return renderCampaignPreview({
    subject: draft.subject,
    bodyText: draft.bodyText,
    personalization,
  });
}

export async function estimateCampaignRecipientsAction(
  campaignId: string,
): Promise<
  | { ok: true; count: number; sample: Array<{ email: string; name: string; names: string[] }> }
  | { ok: false; error: string }
> {
  try {
    const estimate = await estimateCampaignRecipients(campaignId);
    revalidateCampaignPaths(campaignId);
    return {
      ok: true,
      count: estimate.count,
      sample: estimate.sample.map((recipient) => ({
        email: recipient.email,
        name: recipient.personalization.name,
        names: recipient.personalization.relatedNames,
      })),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendCampaignAction(
  campaignId: string,
  options?: { scheduledAt?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const campaign = await getCampaign(campaignId);
  if (!campaign) return { ok: false, error: "Campaign not found." };

  const draft = await getCampaignDraft(campaignId);
  if (!draft) return { ok: false, error: "Campaign draft not found." };

  const nowIso = new Date().toISOString();
  const scheduledAt = options?.scheduledAt ?? null;

  try {
    const snapshots = await snapshotCampaignRecipients(campaignId);
    await markCampaignStatus(campaignId, "sending", {
      send_started_at: nowIso,
      recipient_count: snapshots.length,
      scheduled_at: scheduledAt,
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const snapshot of snapshots) {
      if (snapshot.send_status === "sent") continue;
      try {
        const result = await sendCampaignEmail({
          to: snapshot.email,
          subject: draft.subject,
          bodyText: draft.body_text,
          personalization: snapshot.personalization,
          scheduledAt,
        });
        await recordCampaignAttempt({
          campaignId,
          snapshotId: snapshot.id,
          email: snapshot.email,
          status: "sent",
          providerMessageId: result.id ?? null,
        });
        sentCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await recordCampaignAttempt({
          campaignId,
          snapshotId: snapshot.id,
          email: snapshot.email,
          status: "failed",
          error: message.slice(0, 1000),
        });
        failedCount += 1;
      }
    }

    const finalStatus =
      failedCount === 0
        ? scheduledAt
          ? "scheduled"
          : "sent"
        : sentCount === 0
          ? "failed"
          : "partial";

    await markCampaignStatus(campaignId, finalStatus, {
      send_completed_at: new Date().toISOString(),
      recipient_count: snapshots.length,
      scheduled_at: scheduledAt,
    });
    revalidateCampaignPaths(campaignId);
    return { ok: true };
  } catch (error) {
    await markCampaignStatus(campaignId, "failed", {
      send_completed_at: new Date().toISOString(),
      scheduled_at: scheduledAt,
    });
    revalidateCampaignPaths(campaignId);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
