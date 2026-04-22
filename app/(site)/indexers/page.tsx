import { db } from "@/lib/db";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export const metadata = {
  title: "Indexers - ZcashNames",
  description: "Community-run ZNS indexers for resolving .zcash names.",
};

export default async function IndexersPage() {
  const { data: indexers = [] } = await db
    .from("indexer_registry")
    .select("id, url, network, submitted_by, submitted_at")
    .order("submitted_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
      <SiteRouteTitle title="Indexers" />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="min-w-[220px] flex-1 text-sm text-fg-muted">
          Community-run ZNS indexers. Point your client at any of these to resolve ZcashNames.
        </p>
        <span
          className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold opacity-50"
          style={{
            background: "var(--leaders-card-bg)",
            border: "1px solid var(--leaders-card-border)",
            color: "var(--fg)",
          }}
        >
          Submit Indexer
          <span
            className="rounded-md px-2 py-0.5 text-xs font-bold uppercase tracking-wide [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
            style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}
          >
            SOON
          </span>
        </span>
      </div>

      <div
        className="overflow-hidden rounded-2xl border"
        style={{
          background: "var(--leaders-card-bg)",
          borderColor: "var(--leaders-card-border)",
        }}
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr
              className="border-b text-[0.74rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
              style={{ borderColor: "var(--leaders-card-border)" }}
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
                <td colSpan={4} className="px-4 py-12 text-center text-fg-muted">
                  No indexers registered yet.
                </td>
              </tr>
            ) : (
              indexers.map((indexer) => (
                <tr
                  key={indexer.id}
                  className="border-b last:border-b-0"
                  style={{ borderColor: "var(--leaders-card-border)" }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-fg-heading sm:px-6">
                    {indexer.url}
                  </td>
                  <td className="px-4 py-3 sm:px-6">
                    <span
                      className="rounded px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-muted"
                      style={{ background: "var(--market-stats-segment-active-bg)" }}
                    >
                      {indexer.network}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-fg-muted sm:px-6">
                    {indexer.submitted_by}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted sm:px-6">
                    {new Date(indexer.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
