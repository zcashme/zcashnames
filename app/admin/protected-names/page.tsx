import Link from "next/link";
import QueueNavigation from "@/components/admin/protected-names/QueueNavigation";
import QueueFilters from "@/components/admin/protected-names/QueueFilters";
import QueueTable from "@/components/admin/protected-names/QueueTable";
import {
  listProtectedNamesQueue,
  getProtectedNameQueueCounts,
  parseQueueFilters,
} from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProtectedNamesQueuePage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const filters = parseQueueFilters(params);
  filters.status = "under_review";
  filters.dispute = "any";
  const counts = await getProtectedNameQueueCounts();

  let result;
  let loadError: string | null = null;
  try {
    result = await listProtectedNamesQueue(filters);
  } catch (error) {
    loadError =
      error instanceof Error ? error.message : "Failed to load protected names.";
    result = null;
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Review queue
            </div>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Review suggestions to protect names. Decisions require a reason,
              are audited with submitted contact methods, and email the author.
            </p>
          </div>
          {result ? (
            <div className="text-sm text-zinc-400">
              Showing{" "}
              <span className="text-zinc-200">{result.rows.length}</span>
              {filters.dispute === "any" ? (
                <>
                  {" "}
                  of <span className="text-zinc-200">{result.totalCount}</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <QueueNavigation counts={counts} active="suggestions" />

      <QueueFilters filters={filters} />

      {loadError ? (
        <div className="rounded border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      ) : result ? (
        <>
          <QueueTable rows={result.rows} />
          <div className="flex items-center justify-between text-sm text-zinc-500">
            <span>
              Page {result.page}
              {result.hasMore ? " · more available" : ""}
            </span>
            <div className="flex gap-3">
              {result.page > 1 ? (
                <Link
                  href={buildPageHref(filters, result.page - 1)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Previous
                </Link>
              ) : null}
              {result.hasMore ? (
                <Link
                  href={buildPageHref(filters, result.page + 1)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function buildPageHref(
  filters: ReturnType<typeof parseQueueFilters>,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.status !== "needs_attention") {
    params.set("status", filters.status);
  }
  if (filters.dispute !== "any") params.set("dispute", filters.dispute);
  if (filters.redeemed !== "any") params.set("redeemed", filters.redeemed);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.q) params.set("q", filters.q);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo) params.set("createdTo", filters.createdTo);
  params.set("page", String(page));
  return `/admin/protected-names?${params.toString()}`;
}
