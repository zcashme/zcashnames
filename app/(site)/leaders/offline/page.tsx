import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard Offline | ZcashNames",
  description: "The referral dashboard needs a network connection to load live data.",
  robots: { index: false, follow: false },
};

export default function LeadersOfflinePage() {
  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <section
        className="w-full rounded-[28px] border px-6 py-8 sm:px-8 sm:py-10"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <div className="max-w-xl">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            Referral dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg-heading sm:text-4xl">
            Dashboard unavailable offline
          </h1>
          <p className="mt-4 text-base leading-relaxed text-fg-body">
            This installed dashboard loads live referral counts, estimated rewards, and leaderboard rank from the
            network. Reconnect to refresh your dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/leaders/ref"
              className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-muted"
              style={{ borderColor: "var(--leaders-card-border)" }}
            >
              Open dashboard lookup
            </a>
            <a
              href="/leaders"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-fg-muted underline-offset-4 transition-colors hover:text-fg-heading hover:underline"
            >
              View leaderboard
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
