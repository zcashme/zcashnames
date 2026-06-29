import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShareDropdown from "@/components/ShareDropdown";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import JobApplicationForm from "@/components/careers/JobApplicationForm";
import { getOpenCareerJobBySlug, listCareerJobs } from "@/lib/careers";

export async function generateStaticParams() {
  const jobs = await listCareerJobs();
  return jobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const job = await getOpenCareerJobBySlug(slug);

  if (!job) {
    return {
      title: "Application Closed | ZcashNames",
    };
  }

  return {
    title: `Apply: ${job.title} | ZcashNames Careers`,
    description: `Application form for ${job.title}.`,
    alternates: {
      canonical: job.applicationUrl,
    },
    openGraph: {
      title: `Apply: ${job.title} | ZcashNames Careers`,
      description: `Application form for ${job.title}.`,
      url: job.applicationUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `Apply: ${job.title} | ZcashNames Careers`,
      description: `Application form for ${job.title}.`,
    },
  };
}

export default async function CareerApplyPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const job = await getOpenCareerJobBySlug(slug);
  if (!job) notFound();
  const isExternal = job.applicationMode === "external";
  const applyLabel = "Now Hiring";
  const shareMessage = `Seeking ${job.title} at Zcash Names. Apply here:`;

  return (
    <main className="w-full">
      <SiteRouteTitle title="Careers" />
      <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span
                className="[--career-badge-accent:color-mix(in_srgb,#f4b728_82%,#ffe08b)] [--career-badge-soft:color-mix(in_srgb,#f4b728_18%,transparent)] inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold [[data-theme=light]_&]:[--career-badge-accent:var(--color-brand-blue)] [[data-theme=light]_&]:[--career-badge-soft:color-mix(in_srgb,var(--color-brand-blue)_14%,transparent)] [[data-theme=monochrome]_&]:[--career-badge-accent:var(--color-accent-green)] [[data-theme=monochrome]_&]:[--career-badge-soft:color-mix(in_srgb,var(--color-accent-green)_14%,transparent)]"
                style={{
                  background: "var(--career-badge-soft)",
                  color: "var(--career-badge-accent)",
                  border: "1px solid color-mix(in srgb, var(--career-badge-accent) 32%, var(--faq-border))",
                }}
              >
                {applyLabel}
              </span>
              <ShareDropdown
                label="Share"
                message={shareMessage}
                shareUrl={job.applicationUrl}
                emailSubject={`Apply: ${job.title} | ZcashNames Careers`}
                menuAlign="right"
                buttonClassName="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-muted bg-transparent px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              />
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
              Apply for {job.title}
            </h1>
            <p className="mt-4 text-base leading-8" style={{ color: "var(--fg-body)" }}>
              Use this page to apply. You can review the full role details before submitting if needed.
            </p>
          </div>

          <div className="mt-8">
            {isExternal ? (
              <div
                className="rounded-[26px] border p-8"
                style={{
                  background: "var(--feature-card-bg)",
                  borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
                }}
              >
                <p className="text-sm leading-7" style={{ color: "var(--fg-body)" }}>
                  This role uses an external application flow. Continue below to apply.
                </p>
                <a
                  href={job.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: "var(--home-result-primary-bg)",
                    color: "var(--home-result-primary-fg)",
                    boxShadow: "var(--home-result-primary-shadow)",
                  }}
                >
                  Continue to application
                </a>
              </div>
            ) : (
              <JobApplicationForm job={job} />
            )}
          </div>
        </div>

        <aside
          className="h-fit rounded-[30px] border p-6"
          style={{
            background: "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 78%, transparent), color-mix(in srgb, var(--faq-border) 18%, transparent))",
            borderColor: "color-mix(in srgb, var(--fg-heading) 16%, var(--faq-border))",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
            Role summary
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
            {job.title}
          </h2>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
            {job.summary}
          </p>

          <div className="mt-5 flex flex-col gap-2 text-sm" style={{ color: "var(--fg-muted)" }}>
            <span>{job.team}</span>
            <span>{job.employmentType}</span>
            <span>{job.location}</span>
            {job.compensation ? <span>{job.compensation}</span> : null}
          </div>

          <Link
            href={`/careers/${job.slug}`}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full border px-5 py-3 text-sm font-semibold transition-colors"
            style={{
              color: "var(--fg-heading)",
              borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
            }}
          >
            Read the full job
          </Link>
        </aside>
      </section>
    </main>
  );
}
