import Link from "next/link";
import { StatusBadge } from "@/components/admin/protected-names/StatusBadge";
import type { ProtectedNameDispute } from "@/lib/protected-names/types";

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function DisputeList({
  name,
  openDisputes,
  pastDisputes,
}: {
  name: string;
  openDisputes: ProtectedNameDispute[];
  pastDisputes: ProtectedNameDispute[];
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Disputes
      </h2>

      <div className="mt-3 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">
            Open ({openDisputes.length})
          </h3>
          {openDisputes.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No open disputes.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {openDisputes.map((dispute) => (
                <li
                  key={dispute.id}
                  className="rounded border border-zinc-800 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={dispute.review_status} />
                      <span className="text-xs text-zinc-500">
                        filed vs {dispute.name_status_at_submission}
                      </span>
                    </div>
                    <Link
                      href={`/admin/protected-names/${encodeURIComponent(name)}/disputes/${dispute.id}`}
                      className="text-sm text-amber-400 hover:text-amber-300"
                    >
                      Review dispute
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-300">
                    {dispute.reason}
                  </p>
                  <div className="mt-1 text-xs text-zinc-500">
                    {formatDate(dispute.created_at)} · evidence{" "}
                    {dispute.evidence.length}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Past ({pastDisputes.length})
          </h3>
          {pastDisputes.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No past disputes.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pastDisputes.map((dispute) => (
                <li
                  key={dispute.id}
                  className="rounded border border-zinc-800/70 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={dispute.review_status} />
                      <span className="text-xs text-zinc-500">
                        filed vs {dispute.name_status_at_submission}
                      </span>
                    </div>
                    <Link
                      href={`/admin/protected-names/${encodeURIComponent(name)}/disputes/${dispute.id}`}
                      className="text-sm text-zinc-400 hover:text-zinc-200"
                    >
                      Open
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                    {dispute.reason}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
