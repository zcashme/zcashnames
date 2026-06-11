import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCampaign,
  getCampaignDraft,
  listCampaignAttempts,
  listCampaignRecipientSnapshots,
} from "@/lib/campaigns/repository";
import { renderCampaignPreview } from "@/lib/email/campaign";

export const dynamic = "force-dynamic";

export default async function CampaignSentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const draft = await getCampaignDraft(id);
  if (!draft) notFound();

  const [snapshots, attempts] = await Promise.all([
    listCampaignRecipientSnapshots(id),
    listCampaignAttempts(id),
  ]);
  const personalization = snapshots[0]?.personalization ?? {
    name: "Josh",
    referralCode: "jswihart",
    referralUrl: "https://zcashnames.com/?ref=jswihart",
    dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
    relatedNames: ["Josh"],
  };
  const previewHtml = await renderCampaignPreview({
    subject: draft.subject,
    bodyText: draft.body_text,
    personalization,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-zinc-500">
        <Link href="/admin/campaigns/sent" className="text-amber-400 hover:text-amber-300">
          Back to sent
        </Link>
      </div>

      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-zinc-100">{campaign.title}</h1>
        <span className="text-xs text-zinc-400">
          {campaign.status} · {campaign.recipient_count} recipients
        </span>
      </header>

      <dl className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-4">
        <div><dt className="text-zinc-500">Source</dt><dd className="text-zinc-200">{campaign.source_kind}</dd></div>
        <div><dt className="text-zinc-500">Audience</dt><dd className="text-zinc-200">{campaign.audience_scope}</dd></div>
        <div><dt className="text-zinc-500">Dedupe</dt><dd className="text-zinc-200">{campaign.dedupe_mode}</dd></div>
        <div><dt className="text-zinc-500">Completed</dt><dd className="text-zinc-200">{campaign.send_completed_at ? new Date(campaign.send_completed_at).toLocaleString() : "-"}</dd></div>
      </dl>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-md border border-zinc-800">
          <div className="border-b border-zinc-800 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
            Send attempts
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Attempted</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-200">{attempt.email}</td>
                  <td className="px-3 py-2 text-zinc-300">{attempt.status}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {new Date(attempt.attempted_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-red-300">{attempt.error ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="overflow-hidden rounded-md border border-zinc-800">
          <div className="border-b border-zinc-800 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
            Preview
          </div>
          <iframe
            title="sent campaign preview"
            srcDoc={previewHtml}
            className="h-[640px] w-full bg-white"
            style={{ border: 0 }}
          />
        </section>
      </div>
    </div>
  );
}
