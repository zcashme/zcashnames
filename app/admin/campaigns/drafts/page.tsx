import Link from "next/link";
import CreateCampaignButton from "@/components/admin/campaigns/CreateCampaignButton";
import { listDraftCampaigns } from "@/lib/campaigns/repository";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  const color =
    status === "scheduled"
      ? "bg-sky-500/15 text-sky-300"
      : status === "partial"
        ? "bg-amber-500/15 text-amber-300"
        : status === "failed"
          ? "bg-red-500/15 text-red-300"
          : "bg-zinc-800 text-zinc-300";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${color}`}>{status}</span>;
}

function audienceSummary(campaign: {
  source_kind: string;
  audience_scope: string;
  dedupe_mode: string;
}) {
  if (campaign.source_kind !== "zn_waitlist") return "-";
  if (campaign.audience_scope === "selected_emails") {
    return `selected_emails / ${campaign.dedupe_mode}`;
  }
  return `${campaign.audience_scope} / ${campaign.dedupe_mode}`;
}

function seriesSummary(sourceKind: string, series: string | null | undefined) {
  if (sourceKind === "zn_waitlist") return "-";
  return series?.trim() || "-";
}

export default async function CampaignDraftsPage() {
  const campaigns = await listDraftCampaigns();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-400">
          Generic admin-managed campaigns. Source targeting is configured per draft.
        </p>
        <CreateCampaignButton />
      </div>

      {campaigns.length === 0 ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
          No draft or scheduled campaigns yet.
        </section>
      ) : (
        <section className="overflow-hidden rounded-md border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Series</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Audience</th>
                <th className="px-3 py-2">Recipients</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                  <td className="px-3 py-2 font-medium text-zinc-100">{campaign.title}</td>
                  <td className="px-3 py-2 text-zinc-300">{seriesSummary(campaign.source_kind, campaign.series)}</td>
                  <td className="px-3 py-2 text-zinc-300">{campaign.source_kind}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {audienceSummary(campaign)}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{campaign.recipient_count}</td>
                  <td className="px-3 py-2">{statusBadge(campaign.status)}</td>
                  <td className="px-3 py-2 text-zinc-500">
                    {new Date(campaign.updated_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/campaigns/drafts/${encodeURIComponent(campaign.id)}`}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
