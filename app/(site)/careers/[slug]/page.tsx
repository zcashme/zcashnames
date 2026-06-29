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
      title: "Job Not Found | ZcashNames",
    };
  }

  return {
    title: `${job.title} | ZcashNames Careers`,
    description: job.summary,
    alternates: {
      canonical: job.jobUrl,
    },
    openGraph: {
      title: `${job.title} | ZcashNames Careers`,
      description: job.summary,
      url: job.jobUrl,
    },
    twitter: {
      card: "summary_large_image",
      title: `${job.title} | ZcashNames Careers`,
      description: job.summary,
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
  const xShareMessage = `Seeking ${job.title} at @ZcashNames.`;

  return (
    <main className="w-full">
      <SiteRouteTitle title="Careers" />
      <section className="mx-auto grid w-full max-w-[1320px] gap-8 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        <article
          className="rounded-[30px] border bg-[var(--feature-card-bg)] p-6 md:p-8 [[data-theme=monochrome]_&]:bg-transparent"
          style={{
            borderColor: "color-mix(in srgb, var(--fg-heading) 16%, var(--faq-border))",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
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
            <ShareDropdown
              label="Share"
              message={shareMessage}
              xMessage={xShareMessage}
              shareUrl={job.jobUrl}
              emailSubject={`${job.title} | ZcashNames Careers`}
              menuAlign="right"
              buttonClassName="inline-flex min-h-10 items-center gap-2 rounded-md border border-border-muted bg-transparent px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
            />
          </div>

          <h1 className="mt-5 text-4xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
            {job.title}
          </h1>
          <p className="mt-4 text-base leading-8" style={{ color: "var(--fg-body)" }}>
            {job.summary}
          </p>

          <div className="mt-8">
            <CareerMarkdown markdown={job.descriptionMarkdown} />
          </div>
        </article>

        <aside
          className="h-fit rounded-[30px] border p-6 text-center"
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

          {applyIsExternal ? (
            <a
              href={applyHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
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
              className="mt-6 inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{
                background: "var(--home-result-primary-bg)",
                color: "var(--home-result-primary-fg)",
                boxShadow: "var(--home-result-primary-shadow)",
              }}
            >
              Apply for this role
            </Link>
          )}

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
