import Link from "next/link";
import { contactValueFor, listDraftTesters } from "@/lib/beta-v2/drafts";

export const dynamic = "force-dynamic";

export default async function DraftsListPage() {
  const drafts = await listDraftTesters();

  if (drafts.length === 0) {
    return (
      <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
        No pending beta invite drafts. Applicants whose best contact is email and
        who have not been sent yet will appear here.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Focus</th>
            <th className="px-3 py-2">Experience</th>
            <th className="px-3 py-2">Contact</th>
            <th className="px-3 py-2">Submitted</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((draft) => {
            const hasSdk = draft.focus_areas.includes("sdk");
            const expLen = draft.experience?.length ?? 0;
            return (
              <tr key={draft.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-3 py-2 font-medium text-zinc-100">{draft.display_name}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {draft.focus_areas.map((focus) => (
                      <span
                        key={focus}
                        className={
                          "rounded px-1.5 py-0.5 text-xs " +
                          (focus === "sdk"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-zinc-800 text-zinc-300")
                        }
                      >
                        {focus}
                      </span>
                    ))}
                    {hasSdk && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                        sdk-first
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-zinc-400">{expLen} chars</td>
                <td className="px-3 py-2 text-zinc-300">
                  <span className="mr-1 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                    {draft.best_contact_kind ?? "-"}
                  </span>
                  {contactValueFor(draft) ?? "-"}
                </td>
                <td className="px-3 py-2 text-zinc-500">
                  {new Date(draft.submitted_at).toLocaleDateString()}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/beta-v2/drafts/${encodeURIComponent(draft.id)}`}
                    className="text-amber-400 hover:text-amber-300"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
