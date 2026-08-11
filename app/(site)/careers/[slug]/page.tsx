import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShareDropdown from "@/components/ShareDropdown";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import CareerMarkdown from "@/components/careers/CareerMarkdown";
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
      title: "Job Not Found | Zcash Names",
    };
  }

  return {
    title: `${job.title} | Zcash Names Careers`,
    description: job.summary,
    alternates: {
      canonical: job.jobUrl,
    },
    openGraph: {
      title: `${job.title} | Zcash Names Careers`,
      description: job.summary,
      url: job.jobUrl,
      images: [
        {
          url: `/og/careers/${job.slug}`,
          width: 1200,
          height: 630,
          alt: `${job.title} | Zcash Names Careers`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} | Zcash Names Careers`,
      description: job.summary,
      images: [`/og/careers/${job.slug}`],
    },
  };
}

export default async function CareerJobPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const job = await getOpenCareerJobBySlug(slug);
  if (!job) notFound();
  const applyHref = job.applicationMode === "external" ? job.applicationUrl : `/careers/${job.slug}/apply`;
  const applyIsExternal = job.applicationMode === "external";
  const metaLabels = [job.employmentType];
  const shareMessage = `Seeking ${job.title} at Zcash Names. ${job.summary}`;
  const xShareMessage = `Seeking ${job.title} at @ZcashNames. ${job.summary}`;

  return (
    <main className="w-full">
      <SiteRouteTitle title="Careers" href="/careers" />
      {/*
        Single column: Application URL under the job body.
        Larger gap above the Application URL box; tight bottom padding so the
        Careers/Top/Sitemap straddle sits closer to the box bottom border.
      */}
      <section className="mx-auto flex w-full max-w-[1320px] flex-col px-4 pb-0 pt-10 sm:px-6 lg:px-8">
        <article className="min-w-0">
          {metaLabels.length > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {metaLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: "transparent",
                    color: "var(--fg-heading)",
                    border: "1px solid color-mix(in srgb, var(--fg-heading) 12%, var(--faq-border))",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="min-w-0 text-4xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
              {job.title}
            </h1>
            <ShareDropdown
              label="Share"
              message={shareMessage}
              xMessage={xShareMessage}
              shareUrl={job.jobUrl}
              emailSubject={`${job.title} | Zcash Names Careers`}
              menuAlign="left"
              rootClassName="relative shrink-0"
              buttonClassName="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-transparent text-fg-heading transition-colors duration-200 hover:text-[var(--color-accent-interactive)] [&>span]:hidden"
            />
          </div>
          <p className="mt-4 text-base leading-8" style={{ color: "var(--fg-body)" }}>
            {job.summary}
          </p>

          {/* Separates intro (title/summary) from Responsibilities and the rest of the description. */}
          <div className="mt-8 border-t border-border-muted pt-8">
            <CareerMarkdown markdown={job.descriptionMarkdown} />
          </div>
        </article>

        <aside
          className="mt-20 h-fit rounded-2xl border p-6 sm:mt-24"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 78%, transparent), color-mix(in srgb, var(--faq-border) 18%, transparent))",
            borderColor: "color-mix(in srgb, var(--fg-heading) 16%, var(--faq-border))",
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--fg-muted)" }}>
            Application URL
          </p>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
            Applications are reviewed on a rolling basis. If there&apos;s a fit, we&apos;ll reach out.
            Otherwise, we may keep your information on file for similar future roles.
          </p>

          <div className="mt-6 flex justify-center">
            {applyIsExternal ? (
              <a
                href={applyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                Apply for this role
              </a>
            ) : (
              <Link
                href={applyHref}
                className="inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                Apply for this role
              </Link>
            )}
          </div>

          <p
            className="mt-4 break-all text-center text-xs leading-6 font-semibold"
            style={{ color: "var(--fg-heading)" }}
          >
            {job.applicationUrl}
          </p>
        </aside>
      </section>
    </main>
  );
}
