import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HeroShareButton from "@/components/HeroShareButton";
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
      title: "Application Closed | Zcash Names",
    };
  }

  return {
    title: `Apply: ${job.title} | Zcash Names Careers`,
    description: `Application form for ${job.title}.`,
    alternates: {
      canonical: job.applicationUrl,
    },
    openGraph: {
      title: `Apply: ${job.title} | Zcash Names Careers`,
      description: `Application form for ${job.title}.`,
      url: job.applicationUrl,
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
      title: `Apply: ${job.title} | Zcash Names Careers`,
      description: `Application form for ${job.title}.`,
      images: [`/og/careers/${job.slug}`],
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
  const shareMessage = `Seeking ${job.title} at Zcash Names. Apply here:`;
  const xShareMessage = `Seeking ${job.title} at @ZcashNames. Apply here:`;
  // Location + compensation only (e.g. Remote, Contract-to-hire) — not team/employment type.
  const heroPills = [job.location, job.compensation].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  // Match /protected/suggest form pane (filled surface + soft elevation).
  const formPaneStyle = {
    borderColor: "var(--faq-border)",
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
    boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
  } as const;

  return (
    <main className="w-full">
      <SiteRouteTitle title="Careers" href="/careers" />
      <section className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        {/*
          Same join as /protected/suggest: open-bottom hero, fully rounded form card,
          vertical side rails bridging the short gap between them.
        */}
        <div className="mx-auto w-full max-w-[920px]">
          <div
            className="relative w-full rounded-t-2xl border border-b-0 bg-transparent px-6 py-8 text-center sm:px-8 sm:py-10"
            style={{
              borderColor: "var(--faq-border)",
            }}
          >
            <HeroShareButton
              message={shareMessage}
              xMessage={xShareMessage}
              shareUrl={job.applicationUrl}
              emailSubject={`Apply: ${job.title} | Zcash Names Careers`}
            />
            <h1
              className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
              style={{ color: "var(--color-accent-interactive)" }}
            >
              {job.title}
            </h1>
            {heroPills.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {heroPills.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "transparent",
                      color: "var(--fg-heading)",
                      border:
                        "1px solid color-mix(in srgb, var(--fg-heading) 12%, var(--faq-border))",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : null}
            <p
              className="mx-auto mt-4 max-w-2xl text-lg leading-8"
              style={{ color: "var(--fg-body)" }}
            >
              {job.summary}
            </p>
            <p className="mt-4">
              <Link
                href={`/careers/${job.slug}`}
                className="text-base font-semibold text-fg-heading underline underline-offset-2 transition-colors hover:text-[var(--color-accent-interactive)]"
              >
                View job description
              </Link>
            </p>
          </div>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
              style={{ background: "var(--faq-border)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[calc(100%-1px)] top-[-1rem] z-10 block h-8 w-px"
              style={{ background: "var(--faq-border)" }}
            />
            {isExternal ? (
              <div className="rounded-2xl border px-5 py-8 text-center sm:px-6 sm:py-10" style={formPaneStyle}>
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

      </section>
    </main>
  );
}
