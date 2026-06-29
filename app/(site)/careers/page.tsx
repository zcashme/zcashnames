import type { Metadata } from "next";
import ShareDropdown from "@/components/ShareDropdown";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { CareerCard } from "@/components/careers/CareerCards";
import { listOpenCareerJobs } from "@/lib/careers";

export const metadata: Metadata = {
  title: "Careers | ZcashNames",
  description: "Open roles at ZcashNames, with a dedicated learn-more page and application URL for each job.",
  alternates: {
    canonical: "https://www.zcashnames.com/careers",
  },
  openGraph: {
    title: "Careers | ZcashNames",
    description: "Open roles at ZcashNames, with a dedicated learn-more page and application URL for each job.",
    url: "https://www.zcashnames.com/careers",
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers | ZcashNames",
    description: "Open roles at ZcashNames, with a dedicated learn-more page and application URL for each job.",
  },
};

export default async function CareersPage() {
  const jobs = await listOpenCareerJobs();
  const shareUrl = "https://www.zcashnames.com/careers";
  const shareMessage = "We're preparing to launch and hiring across a few focused roles at Zcash Names.";

  return (
    <main className="w-full">
      <SiteRouteTitle title="Careers" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "transparent",
                color: "var(--fg-heading)",
                border: "1px solid color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
              }}
            >
              Applications Open
            </span>
            <ShareDropdown
              label="Share"
              message={shareMessage}
              shareUrl={shareUrl}
              emailSubject="ZcashNames Careers"
              menuAlign="right"
              buttonClassName="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-muted bg-transparent px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            />
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl" style={{ color: "var(--fg-heading)" }}>
            We&apos;re preparing to launch.
          </h1>
          <p className="mt-4 text-base leading-8" style={{ color: "var(--fg-body)" }}>
            We&apos;re hiring for a small set of focused roles as we move toward launch.
          </p>
        </div>

        {jobs.length === 0 ? (
          <div
            className="rounded-[26px] border p-8"
            style={{
              background: "var(--feature-card-bg)",
              borderColor: "color-mix(in srgb, var(--fg-heading) 16%, var(--faq-border))",
            }}
          >
            <p className="text-sm leading-7" style={{ color: "var(--fg-body)" }}>
              There are no public openings right now.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {jobs.map((job) => (
              <CareerCard key={job.slug} job={job} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
