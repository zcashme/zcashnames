/**
 * Indexers page — displays a community-run indexer registry.
 * Server-rendered; queries the `indexer_registry` table from the local DB
 * and renders a read-only table of endpoints, networks, submitters, and dates.
 */
import type { Metadata } from "next";
import { db } from "@/lib/db";
import HeroShareButton from "@/components/HeroShareButton";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export const metadata: Metadata = {
  title: "Indexers | Zcash Names",
  description: "Community-run ZNS indexers for resolving .zcash names.",
  alternates: {
    canonical: "https://www.zcashnames.com/indexers",
  },
  openGraph: {
    title: "Indexers | Zcash Names",
    description: "Community-run ZNS indexers for resolving .zcash names.",
    url: "https://www.zcashnames.com/indexers",
    images: [
      {
        url: "/og/indexers.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names indexers preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Indexers | Zcash Names",
    description: "Community-run ZNS indexers for resolving .zcash names.",
    images: ["/og/indexers.png"],
  },
};

export default async function IndexersPage() {
  const indexers =
    (
      await db
        .from("indexer_registry")
        .select("id, url, network, submitted_by, submitted_at")
        .order("submitted_at", { ascending: false })
    ).data ?? [];

  return (
    <main className="w-full">
      <SiteRouteTitle title="Indexers" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        {/*
          Same join as /faq + /brandkit: open-bottom hero, fully rounded action card,
          vertical side rails bridging the short gap between them.
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
              message="Community-run ZNS indexers for resolving .zcash names:"
              shareUrl="https://www.zcashnames.com/indexers"
              emailSubject="Zcash Names Indexers"
            />
            <h1
              className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
              style={{ color: "var(--fg-heading)" }}
            >
              ZNS{" "}
              <span style={{ color: "var(--color-accent-interactive)" }}>Indexers</span>
            </h1>
            <p
              className="mx-auto mt-4 max-w-2xl text-lg leading-8"
              style={{ color: "var(--fg-body)" }}
            >
              Community-run ZNS indexers. Point your client at any of these to resolve Zcash names.
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
            <div
              className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
              style={{
                borderColor: "var(--faq-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
              }}
            >
              <span
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold opacity-50"
                style={{
                  borderColor: "color-mix(in srgb, var(--fg-heading) 18%, var(--faq-border))",
                  color: "var(--fg-heading)",
                }}
              >
                Submit Indexer
                <span
                  className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}
                >
                  Soon
                </span>
              </span>
            </div>
          </div>
        </div>

        <div
          className="mx-auto w-full max-w-[920px] overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--faq-border)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
          }}
        >
          <table className="w-full text-left text-sm">
            <thead>
              <tr
                className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em]"
                style={{ borderColor: "var(--faq-border)", color: "var(--fg-muted)" }}
              >
                <th className="px-4 py-3 sm:px-6">Endpoint</th>
                <th className="px-4 py-3 sm:px-6">Network</th>
                <th className="px-4 py-3 sm:px-6">Submitted by</th>
                <th className="px-4 py-3 sm:px-6">Added</th>
              </tr>
            </thead>
            <tbody>
              {indexers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    No indexers registered yet.
                  </td>
                </tr>
              ) : (
                indexers.map((indexer) => (
                  <tr
                    key={indexer.id}
                    className="border-b last:border-b-0"
                    style={{ borderColor: "var(--faq-border)" }}
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs sm:px-6"
                      style={{ color: "var(--fg-heading)" }}
                    >
                      {indexer.url}
                    </td>
                    <td className="px-4 py-3 sm:px-6">
                      <span
                        className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide"
                        style={{
                          background: "var(--market-stats-segment-active-bg)",
                          color: "var(--fg-muted)",
                        }}
                      >
                        {indexer.network}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs sm:px-6"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {indexer.submitted_by}
                    </td>
                    <td className="px-4 py-3 text-xs sm:px-6" style={{ color: "var(--fg-muted)" }}>
                      {new Date(indexer.submitted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
