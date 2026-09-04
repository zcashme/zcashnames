import Link from "next/link";
import DecisionHistory from "@/components/admin/protected-names/DecisionHistory";
import {
  listProtectedNameDecisionHistory,
  parseProtectedNameDecisionHistoryFilters,
} from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function ProtectedNameDecisionHistoryPage({ searchParams }: PageProps) {
  const filters = parseProtectedNameDecisionHistoryFilters((await searchParams) ?? {});
  const result = await listProtectedNameDecisionHistory(filters);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">Decision and email history</h2>
        <p className="mt-1 text-sm text-zinc-400">Review all protected-name decisions, corrections, and email delivery attempts.</p>
      </div>
      <form className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-4 md:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
        <input name="q" defaultValue={filters.q} placeholder="Search name or recipient" className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100" />
        <select name="workflow" defaultValue={filters.workflow} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"><option value="all">All workflows</option><option value="suggestion">Suggestions</option><option value="dispute">Disputes</option><option value="access_request">Access requests</option></select>
        <select name="delivery" defaultValue={filters.delivery} className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"><option value="all">All delivery states</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="pending">Pending</option></select>
        <button type="submit" className="rounded bg-amber-500 px-3 py-2 text-sm font-medium text-zinc-950">Filter</button>
      </form>
      <p className="text-sm text-zinc-500">Showing {result.decisions.length} of {result.totalCount} decisions.</p>
      {result.decisions.length ? <DecisionHistory decisions={result.decisions} showSourceLink /> : <div className="rounded border border-zinc-800 p-8 text-center text-sm text-zinc-500">No decisions match these filters.</div>}
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>Page {result.page}</span>
        <div className="flex gap-3">
          {result.page > 1 ? <Link href={pageHref(filters, result.page - 1)} className="text-amber-400 hover:text-amber-300">Previous</Link> : null}
          {result.hasMore ? <Link href={pageHref(filters, result.page + 1)} className="text-amber-400 hover:text-amber-300">Next</Link> : null}
        </div>
      </div>
    </div>
  );
}

function pageHref(filters: ReturnType<typeof parseProtectedNameDecisionHistoryFilters>, page: number): string {
  const params = new URLSearchParams({ page: String(page) });
  if (filters.q) params.set("q", filters.q);
  if (filters.workflow !== "all") params.set("workflow", filters.workflow);
  if (filters.delivery !== "all") params.set("delivery", filters.delivery);
  return `/admin/protected-names/history?${params.toString()}`;
}
