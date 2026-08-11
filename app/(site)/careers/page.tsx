import type { Metadata } from "next";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { CareerJobList } from "@/components/careers/CareerCards";
import { listOpenCareerJobs } from "@/lib/careers";

const CAREERS_OG_IMAGE = {
  url: "/og/careers.png",
  width: 1200,
  height: 630,
  alt: "Zcash Names careers",
};

export const metadata: Metadata = {
  title: "Careers | Zcash Names",
  description: "Open roles at Zcash Names. Learn more and apply.",
  alternates: {
    canonical: "https://www.zcashnames.com/careers",
  },
  openGraph: {
    title: "Careers | Zcash Names",
    description: "Open roles at Zcash Names. Learn more and apply.",
    url: "https://www.zcashnames.com/careers",
    images: [CAREERS_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers | Zcash Names",
    description: "Open roles at Zcash Names. Learn more and apply.",
    images: [CAREERS_OG_IMAGE.url],
  },
};

export default async function CareersPage() {
  const jobs = await listOpenCareerJobs();
  const shareUrl = "https://www.zcashnames.com/careers";
  const shareMessage =
    "We're preparing to launch and hiring across a few focused roles at Zcash Names.";
  const xShareMessage =
    "We're preparing to launch and hiring across a few focused roles at @ZcashNames.";

  return (
    <main className="w-full">
      <SiteRouteTitle title="Careers" href="/careers" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <div
          className="relative w-full border-0 border-b px-6 py-8 text-center sm:px-8 sm:py-10"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
          }}
        >
          <HeroShareButton
            message={shareMessage}
            xMessage={xShareMessage}
            shareUrl={shareUrl}
            emailSubject="Zcash Names Careers"
          />
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: "var(--fg-muted)" }}
          >
            Applications Open
          </p>
          <h1
            className="mt-3 text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
            style={{ color: "var(--fg-heading)" }}
          >
            We&apos;re preparing to{" "}
            <span style={{ color: "var(--color-accent-interactive)" }}>launch.</span>
          </h1>
          <p
            className="mx-auto mt-4 max-w-2xl text-lg leading-8"
            style={{ color: "var(--fg-body)" }}
          >
            We&apos;re hiring for a small set of focused roles as we move toward launch.
          </p>
        </div>

        {jobs.length === 0 ? (
          <p className="text-sm leading-7" style={{ color: "var(--fg-body)" }}>
            There are no public openings right now.
          </p>
        ) : (
          <CareerJobList jobs={jobs} />
        )}
      </section>
    </main>
  );
}
