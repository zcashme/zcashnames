import Link from "next/link";
import type { CareerJob } from "@/lib/careers";

function metaPill(label: string) {
  return (
    <span
      key={label}
      className="[--career-badge-accent:color-mix(in_srgb,#f4b728_82%,#ffe08b)] [--career-badge-soft:color-mix(in_srgb,#f4b728_18%,transparent)] inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold [[data-theme=light]_&]:[--career-badge-accent:var(--color-brand-blue)] [[data-theme=light]_&]:[--career-badge-soft:color-mix(in_srgb,var(--color-brand-blue)_14%,transparent)] [[data-theme=monochrome]_&]:[--career-badge-accent:var(--color-accent-green)] [[data-theme=monochrome]_&]:[--career-badge-soft:color-mix(in_srgb,var(--color-accent-green)_14%,transparent)]"
      style={{
        background: "var(--career-badge-soft)",
        color: "var(--career-badge-accent)",
        border: "1px solid color-mix(in srgb, var(--career-badge-accent) 32%, var(--faq-border))",
      }}
    >
      {label}
    </span>
  );
}

export function CareerCard({ job }: { job: CareerJob }) {
  const applyHref = job.applicationMode === "external" ? job.applicationUrl : `/careers/${job.slug}/apply`;

  return (
    <article
      className="flex h-full flex-col rounded-[26px] border p-6"
      style={{
        borderColor: "color-mix(in srgb, var(--fg-heading) 16%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 78%, transparent), color-mix(in srgb, var(--faq-border) 18%, transparent))",
        boxShadow: "0 16px 40px color-mix(in srgb, #000 8%, transparent)",
      }}
    >
      <div className="flex flex-wrap gap-2">
        {metaPill(job.employmentType)}
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight" style={{ color: "var(--fg-heading)" }}>
        <Link href={`/careers/${job.slug}`} className="hover:opacity-80 transition-opacity">
          {job.title}
        </Link>
      </h2>

      <p className="mt-3 flex-1 text-sm leading-7" style={{ color: "var(--fg-body)" }}>
        {job.summary}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/careers/${job.slug}`}
          className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
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
            className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
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
            className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
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
