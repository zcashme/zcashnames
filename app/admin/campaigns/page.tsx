import { redirect } from "next/navigation";

export default function CampaignsIndexPage() {
  redirect("/admin/campaigns/drafts");
}
