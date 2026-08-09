import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import WaitlistViewClient from "@/components/waitlist/WaitlistViewClient";
import { getPublicWaitlistViewData } from "@/lib/waitlist/view";

export const metadata: Metadata = {
  title: "Waitlist View - Zcash Names",
  description: "Public waitlist view for verified Zcash Names queue positions.",
  alternates: { canonical: "https://www.zcashnames.com/waitlist/view" },
  openGraph: {
    title: "Waitlist View | Zcash Names",
    description: "Public waitlist view for verified Zcash Names queue positions.",
    url: "https://www.zcashnames.com/waitlist/view",
    images: [
      {
        url: "/og/waitlist-view.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names waitlist view preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Waitlist View | Zcash Names",
    description: "Public waitlist view for verified Zcash Names queue positions.",
    images: ["/og/waitlist-view.png"],
  },
};

export const dynamic = "force-dynamic";

type WaitlistViewPageProps = {
  searchParams?: Promise<{
    search?: string;
    searchMode?: string;
  }>;
};

export default async function WaitlistViewPage({ searchParams }: WaitlistViewPageProps) {
  const params = (await searchParams) ?? {};
  const data = await getPublicWaitlistViewData({
    searchQuery: params.search ?? null,
    searchMode: params.searchMode ?? null,
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title="Waitlist View" href="/waitlist/view" />

      <WaitlistViewClient
        initialRows={data.rows}
        initialAllCount={data.allCount}
        initialTotalCount={data.totalCount}
        initialReservedOnlyCount={data.reservedOnlyCount}
        initialProtectedOnlyCount={data.protectedOnlyCount}
        initialHeroAllCount={data.heroAllCount}
        initialHeroReservedCount={data.heroReservedCount}
        initialHeroProtectedCount={data.heroProtectedCount}
        initialPage={data.page}
        initialPageSize={data.pageSize}
        initialHasMore={data.hasMore}
        initialSortKey={data.sortKey}
        initialSortDirection={data.sortDirection}
        initialSearchQuery={data.searchQuery}
        initialSearchMode={data.searchMode}
        earlyAccessStartAt={data.earlyAccessStartAt}
        earlyAccessLabel={data.earlyAccessLabel}
        adminWalletUivk={data.adminWalletUivk}
        referralsPerSpot={data.referralsPerSpot}
      />
    </div>
  );
}
