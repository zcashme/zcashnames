"use client";

import Link from "next/link";

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
      <path d="M12 19V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
      <path d="M19 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5L5 12L12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CareersPageControls({ showBackToCareers = false }: { showBackToCareers?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 pb-10 ${showBackToCareers ? "justify-between" : "justify-center"}`}>
      {showBackToCareers ? (
        <Link
          href="/careers"
          className="inline-flex items-center gap-2 rounded-full bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform] duration-[140ms] hover:-translate-y-px"
        >
          <ArrowLeftIcon />
          Careers
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform] duration-[140ms] hover:-translate-y-px"
      >
        <ArrowUpIcon />
        Back to top
      </button>
    </div>
  );
}
