import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BetaInstructionsBrief, {
  BETA_INSTRUCTIONS_SECTIONS,
} from "@/components/beta/BetaInstructionsBrief";
import BetaInstructionsToc from "@/components/beta/BetaInstructionsToc";

export const metadata: Metadata = {
  title: "Beta Instructions - ZcashNames",
  description: "Step-by-step instructions for ZcashNames beta testers.",
  robots: { index: false, follow: false, nocache: true },
};

export default function BetaInstructionsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-10">
      <SiteRouteTitle title="Beta Instructions" />
      <div className="flex flex-col md:flex-row gap-10">
        <aside className="contents md:block md:w-56 md:shrink-0 md:sticky md:top-24 md:self-start">
          <BetaInstructionsToc sections={BETA_INSTRUCTIONS_SECTIONS} />
        </aside>
        <main className="flex-1 min-w-0">
          <BetaInstructionsBrief />
        </main>
      </div>
    </div>
  );
}
