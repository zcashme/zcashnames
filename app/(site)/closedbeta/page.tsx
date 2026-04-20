import type { Metadata } from "next";
import BetaBrief, { BETA_SECTIONS } from "@/components/closedbeta/BetaBrief";
import BetaToc from "@/components/closedbeta/BetaToc";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export const metadata: Metadata = {
  title: "Closed Beta — ZcashNames",
  description: "Invite-only.",
  robots: { index: false, follow: false, nocache: true },
};

export default function ClosedBetaPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-10">
      <SiteRouteTitle title="Closed Beta" />
      <div className="flex flex-col md:flex-row gap-10">
        {/* BetaToc handles its own responsive rendering: a sticky in-page list
            on md+ and a fixed hamburger trigger + slide-in drawer on mobile,
            mirroring how the Nextra docs TOC drops the right rail and folds
            into the hamburger overlay on smaller viewports. */}
        <aside className="contents md:block md:w-56 md:shrink-0 md:sticky md:top-24 md:self-start">
          <BetaToc sections={BETA_SECTIONS} />
        </aside>
        <main className="flex-1 min-w-0">
          <BetaBrief />
        </main>
      </div>
    </div>
  );
}
