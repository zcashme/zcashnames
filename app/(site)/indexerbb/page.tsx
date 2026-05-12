/**
 * Indexer Bug Bounty — a placeholder landing page for a forthcoming bug bounty
 * program targeting the ZNS indexer. Static server component that explains the
 * program scope and collects emails via IndexerLaunchAlertForm.
 */
import type { Metadata } from "next";
import Link from "next/link";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import IndexerLaunchAlertForm from "@/components/indexerbb/IndexerLaunchAlertForm";

export const metadata: Metadata = {
  title: "Indexer Bug Bounty - ZcashNames",
  description: "Indexer bug bounty details and submission guidance for ZcashNames.",
  robots: { index: false, follow: false, nocache: true },
};

const sectionTitle: React.CSSProperties = {
  color: "var(--fg-heading)",
  fontSize: "1.35rem",
  fontWeight: 700,
  marginBottom: "0.85rem",
};

const bodyText: React.CSSProperties = {
  color: "var(--fg-body)",
  lineHeight: 1.75,
  fontSize: "0.97rem",
};

export default function IndexerBugBountyPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <SiteRouteTitle title="Indexer Bug Bounty" />
      <div className="mx-auto max-w-2xl">
        <section
          className="rounded-3xl border px-6 py-8 md:px-8 md:py-10"
          style={{
            background: "var(--color-card, var(--color-raised))",
            borderColor: "var(--border-muted)",
            boxShadow: "0 18px 50px rgba(0, 0, 0, 0.12)",
          }}
        >
          <span
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "var(--color-accent-green-light)",
              color: "var(--color-accent-green)",
            }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            Under Construction
          </span>

          <h1
            className="text-3xl font-bold tracking-tight md:text-4xl"
            style={{ color: "var(--fg-heading)" }}
          >
            Help break the indexer before we launch.
          </h1>


          <p className="mt-4" style={bodyText}>
            The program is not posted yet. For now, treat this as a placeholder
            while we finalize the reward structure and the testing brief.
          </p>

          <div
            className="mt-6 rounded-2xl border p-6 md:p-8"
            style={{
              background: "var(--color-raised)",
              borderColor: "var(--border-muted)",
            }}
          >
            <h2 style={sectionTitle}>What will appear here</h2>
            <ul className="list-disc space-y-2 pl-5" style={bodyText}>
              <li>Indexer bug bounty scope and reward tiers.</li>
              <li>Instructions for running your own indexer and comparing results.</li>
              <li>Submission guidance for bugs, divergences, and reproducible reports.</li>
              <li>Rules for eligibility, duplicates, and payout decisions.</li>
            </ul>
          </div>

          <div className="mt-6">
            <IndexerLaunchAlertForm />
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{
                borderColor: "var(--border-muted)",
                color: "var(--fg-body)",
                textDecoration: "none",
              }}
            >
              Read the docs
            </Link>
            <Link
              href="https://github.com/zcashme/ZNS/tree/master"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{
                borderColor: "var(--border-muted)",
                color: "var(--fg-body)",
                textDecoration: "none",
              }}
            >
              View the code
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
