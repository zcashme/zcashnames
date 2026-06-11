import Link from "next/link";
import { listSentTesters } from "@/lib/beta-v2/drafts";

export const dynamic = "force-dynamic";

function statusBadge(status: string | null) {
  const color =
    status === "sent"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "failed"
        ? "bg-red-500/15 text-red-300"
        : "bg-zinc-800 text-zinc-300";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${color}`}>{status ?? "-"}</span>;
}

export default async function SentListPage() {
  const rows = await listSentTesters();

  if (rows.length === 0) {
    return (
      <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
        Nothing sent yet. Beta invites you send from the Drafts view will appear here.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Contact</th>
            <th className="px-3 py-2">Sent at</th>
            <th className="px-3 py-2">Notice</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
              <td className="px-3 py-2 font-medium text-zinc-100">{row.display_name}</td>
              <td className="px-3 py-2 text-zinc-300">
                {row.best_contact_kind === "email" ? row.contact_email : (row.best_contact_kind ?? "-")}
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {row.code_sent_at ? new Date(row.code_sent_at).toLocaleString() : "-"}
              </td>
              <td className="px-3 py-2">{statusBadge(row.notice_status)}</td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/admin/beta-v2/sent/${encodeURIComponent(row.id)}`}
                  className="text-amber-400 hover:text-amber-300"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
