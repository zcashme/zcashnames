import Link from "next/link";
import type { CareerJob } from "@/lib/careers";

function metaPill(label: string) {
  return (
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
  );
}

export function CareerCard({ job }: { job: CareerJob }) {
  const applyHref = job.applicationMode === "external" ? job.applicationUrl : `/careers/${job.slug}/apply`;

  return (
    <article className="flex flex-col border-0 border-b border-border-muted bg-transparent py-6 last:border-b-0">
      <div className="flex flex-wrap gap-2">
        {metaPill(job.employmentType)}
      </div>

      <h2 className="mt-4 text-2xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
        <Link
          href={`/careers/${job.slug}`}
          className="transition-colors hover:text-[var(--color-accent-interactive)]"
        >
          {job.title}
        </Link>
      </h2>

      <p className="mt-3 flex-1 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
        {job.summary}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/careers/${job.slug}`}
          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          View role
        </Link>
        {job.applicationMode === "external" ? (
          <a
            href={applyHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
            style={{
              color: "var(--fg-heading)",
              borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
            }}
          >
            Apply
          </a>
        ) : (
          <Link
            href={applyHref}
            className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
            style={{
              color: "var(--fg-heading)",
              borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
            }}
          >
            Apply
          </Link>
        )}
      </div>
    </article>
  );
}

/** Single column on small screens; two columns with a vertical rule from lg up when 2+ roles. */
export function CareerJobList({ jobs }: { jobs: CareerJob[] }) {
  if (jobs.length === 0) return null;

  if (jobs.length === 1) {
    return (
      <div className="flex flex-col">
        <CareerCard job={jobs[0]} />
      </div>
    );
  }

  const mid = Math.ceil(jobs.length / 2);
  const leftJobs = jobs.slice(0, mid);
  const rightJobs = jobs.slice(mid);

  return (
    <>
      {/* Narrow: one stack, original order */}
      <div className="flex flex-col lg:hidden">
        {jobs.map((job) => (
          <CareerCard key={job.slug} job={job} />
        ))}
      </div>

      {/* Wide: side-by-side columns with a full-height vertical separator */}
      <div className="hidden lg:grid lg:grid-cols-2">
        <div className="flex flex-col border-r border-border-muted pr-8 xl:pr-10">
          {leftJobs.map((job) => (
            <CareerCard key={job.slug} job={job} />
          ))}
        </div>
        <div className="flex flex-col pl-8 xl:pl-10">
          {rightJobs.map((job) => (
            <CareerCard key={job.slug} job={job} />
          ))}
        </div>
      </div>
    </>
  );
}
