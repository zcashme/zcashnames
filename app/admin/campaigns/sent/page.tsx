import Link from "next/link";
import { listSentCampaigns } from "@/lib/campaigns/repository";

export const dynamic = "force-dynamic";

export default async function CampaignSentPage() {
  const campaigns = await listSentCampaigns();

  if (campaigns.length === 0) {
    return (
      <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
        Nothing sent yet. Completed campaigns will appear here.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-md border border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
          <tr>
            <th className="px-3 py-2">Title</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Recipients</th>
            <th className="px-3 py-2">Completed</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
              <td className="px-3 py-2 font-medium text-zinc-100">{campaign.title}</td>
              <td className="px-3 py-2 text-zinc-300">{campaign.source_kind}</td>
              <td className="px-3 py-2 text-zinc-300">{campaign.recipient_count}</td>
              <td className="px-3 py-2 text-zinc-400">
                {campaign.send_completed_at
                  ? new Date(campaign.send_completed_at).toLocaleString()
                  : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/admin/campaigns/sent/${encodeURIComponent(campaign.id)}`}
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
