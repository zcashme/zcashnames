import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { parseRoadmapMarkdown } from "@/lib/roadmap";
import RoadmapTimeline from "./RoadmapTimeline";

export const metadata: Metadata = {
  title: "Roadmap | ZcashNames",
  description: "Calendar roadmap for the next ZcashNames product phases and tasks.",
  alternates: {
    canonical: "https://www.zcashnames.com/roadmap",
  },
  openGraph: {
    title: "Roadmap | ZcashNames",
    description: "Calendar roadmap for the next ZcashNames product phases and tasks.",
    url: "https://www.zcashnames.com/roadmap",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roadmap | ZcashNames",
    description: "Calendar roadmap for the next ZcashNames product phases and tasks.",
  },
};

const ROADMAP_PATH = path.join(process.cwd(), "content", "roadmap.md");

export default async function RoadmapPage() {
  const markdown = await fs.readFile(ROADMAP_PATH, "utf8");
  const periods = parseRoadmapMarkdown(markdown);

  return (
    <main className="w-full">
      <SiteRouteTitle title="Roadmap" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <RoadmapTimeline periods={periods} />
      </section>
    </main>
  );
}
