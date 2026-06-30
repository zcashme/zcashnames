"use server";

import { revalidatePath } from "next/cache";
import { createCampaignDraft } from "@/lib/campaigns/repository";

function revalidateCampaignPaths(campaignId?: string) {
  revalidatePath("/admin/campaigns/drafts");
  revalidatePath("/admin/campaigns/sent");
  if (campaignId) {
    revalidatePath(`/admin/campaigns/drafts/${campaignId}`);
    revalidatePath(`/admin/campaigns/sent/${campaignId}`);
  }
}

export async function createCampaignAction(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  try {
    const campaign = await createCampaignDraft();
    revalidateCampaignPaths(campaign.id);
    return { ok: true, id: campaign.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
