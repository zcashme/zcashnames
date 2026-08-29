import {
  PROTECTED_NAME_CATEGORIES,
  type ProtectedNameQueueFilters,
} from "@/lib/protected-names/types";

export default function QueueFilters({
  filters,
}: {
  filters: ProtectedNameQueueFilters;
}) {
  return (
    <form
      method="get"
      className="grid gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-4 md:grid-cols-3 xl:grid-cols-6"
    >
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Status
        <select
          name="status"
          defaultValue={filters.status}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        >
          <option value="needs_attention">
            needs attention (under_review or open disputes)
          </option>
          <option value="under_review">under_review only</option>
          <option value="protected">protected</option>
          <option value="rejected">rejected</option>
          <option value="all">all</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Open disputes
        <select
          name="dispute"
          defaultValue={filters.dispute}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        >
          <option value="any">any</option>
          <option value="has_open">has open disputes</option>
          <option value="no_open">no open disputes</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Redemption
        <select
          name="redeemed"
          defaultValue={filters.redeemed}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        >
          <option value="any">any</option>
          <option value="redeemed">redeemed</option>
          <option value="not_redeemed">not redeemed</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Category
        <select
          name="category"
          defaultValue={filters.category}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        >
          <option value="all">all</option>
          {PROTECTED_NAME_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400 md:col-span-2">
        Name search
        <input
          name="q"
          defaultValue={filters.q}
          placeholder="name or normalized_name"
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Submitted from
        <input
          type="date"
          name="createdFrom"
          defaultValue={filters.createdFrom ?? ""}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Submitted to
        <input
          type="date"
          name="createdTo"
          defaultValue={filters.createdTo ?? ""}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
        />
      </label>

      <div className="flex items-end gap-2 md:col-span-2">
        <button
          type="submit"
          className="rounded bg-amber-500/90 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-400"
        >
          Apply filters
        </button>
        <a
          href="/admin/protected-names"
          className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
        >
          Reset
        </a>
      </div>
    </form>
  );
}
