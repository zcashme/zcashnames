import type { Metadata } from "next";
import CommunityPageClient from "@/components/community/CommunityPageClient";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export const metadata: Metadata = {
  title: "Community | Zcash Names",
  description:
    "Join the Zcash Names community, beta test releases, become an ambassador, and find partner resources.",
  alternates: {
    canonical: "https://www.zcashnames.com/community",
  },
  openGraph: {
    title: "Community | Zcash Names",
    description:
      "Join the Zcash Names community, beta test releases, become an ambassador, and find partner resources.",
    url: "https://www.zcashnames.com/community",
    images: [
      {
        url: "/og/community.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names community preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community | Zcash Names",
    description:
      "Join the Zcash Names community, beta test releases, become an ambassador, and find partner resources.",
    images: ["/og/community.png"],
  },
};

export default async function CommunityPage() {
  return (
    <>
      <SiteRouteTitle title="Community" />
      <CommunityPageClient />
    </>
  );
}
