import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BetaV2Brief, { BETA_V2_SECTIONS } from "@/components/beta/BetaV2Brief";
import BetaV2Toc from "@/components/beta/BetaV2Toc";

export const metadata: Metadata = {
  title: "Beta - ZcashNames",
  description: "Apply for the next ZcashNames beta round.",
  openGraph: {
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    url: "https://www.zcashnames.com/beta",
    images: [
      {
        url: "https://www.zcashnames.com/og/beta.png",
        width: 1200,
        height: 630,
        alt: "ZcashNames beta invitation preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    images: ["https://www.zcashnames.com/og/beta.png"],
  },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Beta info page — a readable brief about the current beta round with a sticky
 * table-of-contents sidebar for section navigation. No data fetching; all content
 * is static and defined in the BetaV2Brief component and BETA_V2_SECTIONS constant.
 */
export default function BetaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-10">
      <SiteRouteTitle title="Beta" />
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="contents md:block md:w-56 md:shrink-0 md:sticky md:top-24 md:self-start">
          <BetaV2Toc sections={BETA_V2_SECTIONS} />
        </aside>
        <main className="flex-1 min-w-0">
          <BetaV2Brief />
        </main>
      </div>
    </div>
  );
}
