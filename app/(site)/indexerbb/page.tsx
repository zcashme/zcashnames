/**
 * Indexer Bug Bounty — a placeholder landing page for a forthcoming bug bounty
 * program targeting the ZNS indexer. Static server component that explains the
 * program scope and collects emails via IndexerLaunchAlertForm.
 */
import type { Metadata } from "next";
import Link from "next/link";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import IndexerLaunchAlertForm from "@/components/indexerbb/IndexerLaunchAlertForm";

export const metadata: Metadata = {
  title: "Indexer Bug Bounty | Zcash Names",
  description: "Indexer bug bounty details and submission guidance for Zcash Names.",
  robots: { index: false, follow: false, nocache: true },
};

const upcomingItems = [
  "Indexer bug bounty scope and reward tiers.",
  "Instructions for running your own indexer and comparing results.",
  "Submission guidance for bugs, divergences, and reproducible reports.",
  "Rules for eligibility, duplicates, and payout decisions.",
] as const;

export default function IndexerBugBountyPage() {
  return (
    <main className="w-full">
      <SiteRouteTitle title="Indexer Bug Bounty" />
      <section className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        {/*
          Same join as /protected/suggest and careers apply: open-bottom hero,
          fully rounded form card, vertical side rails bridging the gap.
        */}
        <div className="mx-auto w-full max-w-[920px]">
          <div
            className="relative w-full rounded-t-2xl border border-b-0 px-6 py-8 text-center sm:px-8 sm:py-10"
            style={{
              borderColor: "var(--faq-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
            }}
          >
            <HeroShareButton
              message="Help break the Zcash Names indexer before launch — get notified when the bug bounty opens:"
              shareUrl="https://www.zcashnames.com/indexerbb"
              emailSubject="Zcash Names Indexer Bug Bounty"
            />
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "var(--fg-muted)" }}
            >
              Under Construction
            </p>
            <h1
              className="mt-3 text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
              style={{ color: "var(--fg-heading)" }}
            >
              Help break the indexer before we{" "}
              <span style={{ color: "var(--color-accent-interactive)" }}>launch.</span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-lg leading-8"
              style={{ color: "var(--fg-body)" }}
            >
              The program is not posted yet. For now, treat this as a placeholder while we finalize
              the reward structure and the testing brief.
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
            <IndexerLaunchAlertForm />
          </div>
        </div>

        <div className="mx-auto mt-12 w-full max-w-[920px] sm:mt-14">
          <h2
            className="text-xl font-semibold tracking-tight sm:text-[1.35rem]"
            style={{ color: "var(--fg-heading)" }}
          >
            What will appear here
          </h2>
          <ul className="mt-4 flex list-none flex-col gap-3 p-0">
            {upcomingItems.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-5 shrink-0 items-center justify-center"
                  style={{ color: "var(--fg-body)" }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full border"
                    style={{ borderColor: "currentColor" }}
                  />
                </span>
                <span className="min-w-0 text-base leading-7" style={{ color: "var(--fg-body)" }}>
                  {item}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading hover:text-[var(--color-accent-interactive)]"
              style={{
                borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
              }}
            >
              Read the docs
            </Link>
            <Link
              href="https://github.com/zcashme/ZNS/tree/master"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading hover:text-[var(--color-accent-interactive)]"
              style={{
                borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
              }}
            >
              View the code
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
