import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import ProtectedViewClient from "@/components/protected/ProtectedViewClient";
import { getProtectedViewData } from "@/lib/protected/view";

export const metadata: Metadata = {
  title: "Protected Names - Zcash Names",
  description: "Public protected names view for Zcash Names.",
  alternates: { canonical: "https://www.zcashnames.com/protected" },
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
  }>;
};

export default async function ProtectedPage({ searchParams }: ProtectedPageProps) {
  const params = (await searchParams) ?? {};
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
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title="Protected Names" href="/protected" />

      <ProtectedViewClient initialData={data} />
    </div>
  );
}
