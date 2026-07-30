import type { Metadata } from "next";
import CommunityPageClient from "@/components/community/CommunityPageClient";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export const metadata: Metadata = {
  title: "Community | Zcash Names",
  description:
    "Join the Zcash Names community, beta test releases, become an ambassador, and find partner resources.",
};

export default async function CommunityPage() {
  return (
    <>
      <SiteRouteTitle title="Community" />
      <CommunityPageClient />
    </>
  );
}
