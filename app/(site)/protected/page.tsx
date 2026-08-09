import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ProtectedViewClient from "@/components/protected/ProtectedViewClient";
import { getProtectedViewData } from "@/lib/protected/view";

export const metadata: Metadata = {
  title: "Protected Names - Zcash Names",
  description: "Public protected names view for Zcash Names.",
  alternates: { canonical: "https://www.zcashnames.com/protected" },
  openGraph: {
    title: "Protected Names | Zcash Names",
    description: "Public protected names view for Zcash Names.",
    url: "https://www.zcashnames.com/protected",
    images: [
      {
        url: "/og/protected.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names protected names preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Protected Names | Zcash Names",
    description: "Public protected names view for Zcash Names.",
    images: ["/og/protected.png"],
  },
};

export const dynamic = "force-dynamic";

type ProtectedPageProps = {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
    sortKey?: string;
    sortDirection?: string;
    search?: string;
    searchMode?: string;
    redeemedOnly?: string;
    underReviewOnly?: string;
    rejectedOnly?: string;
    disputedOnly?: string;
    categoryOnly?: string;
    ensOnly?: string;
    zmOnly?: string;
  }>;
};

export default async function ProtectedPage({ searchParams }: ProtectedPageProps) {
  const params = (await searchParams) ?? {};
  // getProtectedViewData awaits expireProtectedNames() so past-due unclaimed
  // protection is rejected before the table is built (also on /api/protected/view).
  const data = await getProtectedViewData({
    page: params.page,
    pageSize: params.pageSize,
    sortKey: params.sortKey,
    sortDirection: params.sortDirection,
    searchQuery: params.search ?? null,
    searchMode: params.searchMode ?? null,
    redeemedOnly: params.redeemedOnly ?? null,
    underReviewOnly: params.underReviewOnly ?? null,
    rejectedOnly: params.rejectedOnly ?? null,
    disputedOnly: params.disputedOnly ?? null,
    categoryOnly: params.categoryOnly ?? null,
    ensOnly: params.ensOnly ?? null,
    zmOnly: params.zmOnly ?? null,
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title="Protected Names" href="/protected" />

      <ProtectedViewClient initialData={data} />
    </div>
  );
}
