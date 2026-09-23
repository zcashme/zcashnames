import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import WaitlistViewClient from "@/components/waitlist/WaitlistViewClient";
import { buildWaitlistViewOgMetadata } from "@/lib/seo/table-og-pills";
import { getPublicWaitlistViewData } from "@/lib/waitlist/view";

export const dynamic = "force-dynamic";

type WaitlistViewPageProps = {
  searchParams?: Promise<{
    search?: string;
    searchMode?: string;
    details?: string;
    tab?: string;
  }>;
};

const WAITLIST_VIEW_DESCRIPTION =
  "Public waitlist view for verified Zcash Names queue positions.";

type WaitlistViewTab = "all" | "reserved" | "protected";

function parseWaitlistViewTab(value: string | undefined): WaitlistViewTab {
  if (value === "reserved" || value === "protected") return value;
  return "all";
}

export async function generateMetadata({
  searchParams,
}: WaitlistViewPageProps): Promise<Metadata> {
  const params = (await searchParams) ?? {};
  const og = buildWaitlistViewOgMetadata(params);

  return {
    title: "View Waitlist - Zcash Names",
    description: WAITLIST_VIEW_DESCRIPTION,
    alternates: { canonical: "https://www.zcashnames.com/waitlist/view" },
    openGraph: {
      title: "View Waitlist | Zcash Names",
      description: WAITLIST_VIEW_DESCRIPTION,
      url: og.pageUrl,
      images: [
        {
          url: og.imageUrl,
          width: 1200,
          height: 630,
          alt: "Zcash Names waitlist view preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "View Waitlist | Zcash Names",
      description: WAITLIST_VIEW_DESCRIPTION,
      images: [og.imageUrl],
    },
  };
}

export default async function WaitlistViewPage({ searchParams }: WaitlistViewPageProps) {
  const params = (await searchParams) ?? {};
  const initialTab = parseWaitlistViewTab(params.tab);
  const data = await getPublicWaitlistViewData({
    searchQuery: params.search ?? null,
    searchMode: params.searchMode ?? null,
    reservedOnly: initialTab === "reserved",
    protectedOnly: initialTab === "protected",
  });

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <SiteRouteTitle title="View Waitlist" href="/waitlist/view" />

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
        initialTab={initialTab}
        earlyAccessStartAt={data.earlyAccessStartAt}
        earlyAccessLabel={data.earlyAccessLabel}
        adminWalletUivk={data.adminWalletUivk}
        referralsPerSpot={data.referralsPerSpot}
        indirectReferralsPerSpot={data.indirectReferralsPerSpot}
        openMatchingDetails={
          params.details === "1"
          || params.details === "true"
          || (typeof params.details === "string" && params.details.trim().length > 0)
        }
      />

      <section className="mx-auto mt-6 max-w-[920px] sm:mt-8">
        <h2
          className="text-balance text-center text-[1.65rem] font-bold tracking-tight"
          style={{ color: "var(--hero-headline-primary, var(--fg-heading))" }}
        >
          Add your name to the waitlist.
        </h2>
        <div className="mt-6 flex justify-center">
          <WaitlistEntryForm showNewsletter={false} />
        </div>
      </section>
    </div>
  );
}
