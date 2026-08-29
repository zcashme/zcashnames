import Link from "next/link";
import {
  RedeemedBadge,
  StatusBadge,
} from "@/components/admin/protected-names/StatusBadge";
import type { ProtectedNameQueueRow } from "@/lib/protected-names/types";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function QueueTable({ rows }: { rows: ProtectedNameQueueRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-400">
        No protected names match the current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Submitted</th>
            <th className="px-3 py-2 font-medium">Redeemed</th>
            <th className="px-3 py-2 font-medium">Evidence</th>
            <th className="px-3 py-2 font-medium">Open disputes</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-t border-zinc-800/80 hover:bg-zinc-900/40"
            >
              <td className="px-3 py-2">
                <div className="font-medium text-zinc-100">{row.name}</div>
                {row.parent_name ? (
                  <div className="text-xs text-zinc-500">
                    parent: {row.parent_name}
                  </div>
                ) : null}
              </td>
              <td className="px-3 py-2 text-zinc-300">{row.category}</td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {formatDate(row.created_at)}
              </td>
              <td className="px-3 py-2">
                <RedeemedBadge redeemed={row.redeemed} />
              </td>
              <td className="px-3 py-2 text-zinc-300">{row.evidenceCount}</td>
              <td className="px-3 py-2">
                {row.openDisputeCount > 0 ? (
                  <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">
                    {row.openDisputeCount}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">0</span>
                )}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/admin/protected-names/${encodeURIComponent(row.name)}`}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
