import Link from "next/link";
import QueueNavigation from "@/components/admin/protected-names/QueueNavigation";
import { StatusBadge } from "@/components/admin/protected-names/StatusBadge";
import {
  getProtectedNameQueueCounts,
  listProtectedNameDisputes,
} from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

export default async function ProtectedNameDisputesPage() {
  const [disputes, counts] = await Promise.all([
    listProtectedNameDisputes(),
    getProtectedNameQueueCounts(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <QueueNavigation counts={counts} active="disputes" />
      <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Disputes</div>
        <p className="mt-1 text-sm text-zinc-400">Open requests to reconsider protected or rejected names.</p>
      </section>
      {disputes.length === 0 ? <div className="rounded border border-zinc-800 p-8 text-center text-sm text-zinc-500">No disputes need review.</div> : <div className="overflow-x-auto rounded border border-zinc-800"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-900 text-xs uppercase text-zinc-500"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Filed against</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Submitted</th><th className="px-3 py-2" /></tr></thead><tbody>{disputes.map((dispute) => <tr key={dispute.id} className="border-t border-zinc-800"><td className="px-3 py-2"><div className="font-medium text-zinc-100">{dispute.protected_name}</div><StatusBadge status={dispute.review_status} /></td><td className="px-3 py-2 text-zinc-300">{dispute.name_status_at_submission}</td><td className="px-3 py-2 text-zinc-400">{dispute.submitted_by_email ?? "-"}</td><td className="px-3 py-2 text-zinc-400">{new Date(dispute.created_at).toLocaleString()}</td><td className="px-3 py-2"><Link href={`/admin/protected-names/${encodeURIComponent(dispute.protected_name)}/disputes/${dispute.id}`} className="text-amber-400">Review</Link></td></tr>)}</tbody></table></div>}
    </div>
  );
}
