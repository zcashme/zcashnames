import Link from "next/link";
import QueueNavigation from "@/components/admin/protected-names/QueueNavigation";
import { StatusBadge } from "@/components/admin/protected-names/StatusBadge";
import {
  getProtectedNameQueueCounts,
  listProtectedNameAccessRequests,
} from "@/lib/protected-names/queries";

export const dynamic = "force-dynamic";

export default async function ProtectedNameAccessQueuePage() {
  const [requests, counts] = await Promise.all([
    listProtectedNameAccessRequests(),
    getProtectedNameQueueCounts(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <QueueNavigation counts={counts} active="access" />
      <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
        <div className="text-xs uppercase tracking-wide text-zinc-500">Access requests</div>
        <p className="mt-1 text-sm text-zinc-400">Approve or deny access without changing claim or resolver behavior.</p>
      </section>
      {requests.length === 0 ? <div className="rounded border border-zinc-800 p-8 text-center text-sm text-zinc-500">No access requests need review.</div> : <div className="overflow-x-auto rounded border border-zinc-800"><table className="min-w-full text-left text-sm"><thead className="bg-zinc-900 text-xs uppercase text-zinc-500"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Requester</th><th className="px-3 py-2">Reference</th><th className="px-3 py-2">Submitted</th><th className="px-3 py-2" /></tr></thead><tbody>{requests.map((request) => <tr key={request.id} className="border-t border-zinc-800"><td className="px-3 py-2"><div className="font-medium text-zinc-100">{request.requested_name}</div><StatusBadge status={request.status} /></td><td className="px-3 py-2 text-zinc-400">{request.normalized_email}</td><td className="px-3 py-2 font-mono text-xs text-zinc-400">{request.reference_number}</td><td className="px-3 py-2 text-zinc-400">{new Date(request.submitted_at).toLocaleString()}</td><td className="px-3 py-2"><Link href={`/admin/protected-names/access/${request.id}`} className="text-amber-400">Review</Link></td></tr>)}</tbody></table></div>}
    </div>
  );
}
