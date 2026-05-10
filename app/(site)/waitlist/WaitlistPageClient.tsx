"use client";

import Link from "next/link";
import HomePage from "@/components/landing/HomePage";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import type { NetworkStats as Stats } from "@/lib/network-stats";

const leaderboardLink = (
  <Link
    href="/leaders"
    className="inline-flex items-center gap-2 rounded-full border border-[var(--home-result-link-border)] bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform,background-color] duration-[140ms] hover:-translate-y-px hover:bg-[var(--home-result-link-hover-bg)]"
  >
    <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
      <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6.5L13.1 8.8L15.6 9.1L13.8 10.8L14.2 13.3L12 12.1L9.8 13.3L10.2 10.8L8.4 9.1L10.9 8.8L12 6.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
    Leaderboard →
  </Link>
);

export default function WaitlistPageClient({ stats }: { stats: Stats }) {
  return (
    <HomePage
      form={<WaitlistEntryForm />}
      actionLink={leaderboardLink}
      stats={stats}
    />
  );
}
