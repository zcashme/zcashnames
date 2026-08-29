import Link from "next/link";
import { notFound } from "next/navigation";
import CampaignQuickActions from "@/components/admin/campaigns/CampaignQuickActions";
import { getProviderManagedScheduleState } from "@/lib/campaigns/provider-schedule";
import { formatEasternDateTime } from "@/lib/campaigns/schedule";
import {
  getCampaign,
  getCampaignDraft,
  listCampaignAttempts,
  listCampaignDeliveryBatches,
  listCampaignRecipientSnapshots,
} from "@/lib/campaigns/repository";
import { renderCampaignPreview } from "@/lib/email/campaign";

export const dynamic = "force-dynamic";

function shouldIncludeUnsubscribe(
  sourceKind: string,
  series: string | null | undefined,
  includeUnsubscribe: boolean,
) {
  if (sourceKind === "custom_emails" && !series?.trim()) return false;
  return includeUnsubscribe;
}

function seriesSummary(sourceKind: string, series: string | null | undefined) {
  if (sourceKind === "zn_waitlist") return "-";
  return series?.trim() || "-";
}

function deliverySummary(batches: Awaited<ReturnType<typeof listCampaignDeliveryBatches>>) {
  const total = batches.length;
  const current =
    batches.find((batch) => batch.status === "sending") ??
    batches.find((batch) => batch.status === "pending") ??
    null;
  const sentCount = batches.reduce((sum, batch) => sum + batch.sent_count, 0);
  const failedCount = batches.reduce((sum, batch) => sum + batch.failed_count, 0);

  return {
    total,
    current,
    sentCount,
    failedCount,
  };
}

export default async function CampaignSentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fromSend?: string }>;
}) {
  const { id } = await params;
  const { fromSend } = await searchParams;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const draft = await getCampaignDraft(id);
  if (!draft) notFound();

  const [snapshots, attempts, deliveryBatches] = await Promise.all([
    listCampaignRecipientSnapshots(id),
    listCampaignAttempts(id),
    listCampaignDeliveryBatches(id),
  ]);
  const delivery = deliverySummary(deliveryBatches);
  const providerScheduledAttempts = attempts.filter((attempt) => attempt.status === "scheduled");
  const providerSchedule = getProviderManagedScheduleState({
    hasDeliveryBatches: delivery.total > 0,
    acceptedCount: providerScheduledAttempts.length,
    scheduledAt: providerScheduledAttempts[0]?.scheduled_for ?? campaign.scheduled_at ?? null,
    canceledAt: campaign.delivery_canceled_at,
  });
  const providerManagedSchedule = providerSchedule.managed;
  const personalization = snapshots[0]?.personalization ?? {
    name: "Josh",
    referralCode: "jswihart",
    referralUrl: "https://zcashnames.com/?ref=jswihart",
    dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
    humanReferralCode: "josh",
    humanReferralUrl: "https://zcashnames.com/?ref=josh",
    humanDashboardUrl: "https://zcashnames.com/leaders/ref/josh",
    confirmResponseUrl: "https://zcashnames.com/api/campaign-click/waitlist-confirm?token=sample-token",
    reserveUrl: "https://zcashnames.com/reserve?token=sample-token",
    betaDisplayName: null,
    betaInviteCode: null,
    betaInviteLink: null,
    otherInterestedCount: null,
    referralStats: null,
    relatedNames: ["Josh"],
  };
  const previewHtml = await renderCampaignPreview({
    subject: draft.subject,
    bodyText: draft.body_text,
    headingText: draft.heading_text,
    showRelatedNamesFooter: draft.show_related_names_footer,
    personalization,
    includeUnsubscribe: shouldIncludeUnsubscribe(
      campaign.source_kind,
      campaign.series,
      campaign.include_unsubscribe,
    ),
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
          {campaign.status} | {campaign.recipient_count} recipients
        </span>
      </header>

      <CampaignQuickActions
        campaignId={campaign.id}
        editHref={`/admin/campaigns/drafts/${encodeURIComponent(campaign.id)}`}
        allowPauseResume={delivery.total > 0 && !providerManagedSchedule}
        isPaused={Boolean(campaign.delivery_paused_at)}
        isCanceled={Boolean(campaign.delivery_canceled_at)}
        allowCancel={delivery.total > 0 || providerSchedule.cancelable}
        allowRetry={attempts.some((attempt) => attempt.status === "failed")}
        allowRunWorker={delivery.total > 0 && !providerManagedSchedule}
      />

      {fromSend === "1" ? (
        <section className="rounded-md border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">
          Send requested. Verify the outcome below in Delivery progress and Send attempts.
        </section>
      ) : null}

      <dl className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-5">
        <div><dt className="text-zinc-500">Source</dt><dd className="text-zinc-200">{campaign.source_kind}</dd></div>
        <div><dt className="text-zinc-500">Series</dt><dd className="text-zinc-200">{seriesSummary(campaign.source_kind, campaign.series)}</dd></div>
        <div><dt className="text-zinc-500">Unsubscribe</dt><dd className="text-zinc-200">{shouldIncludeUnsubscribe(campaign.source_kind, campaign.series, campaign.include_unsubscribe) ? "included" : "hidden"}</dd></div>
        <div><dt className="text-zinc-500">Audience</dt><dd className="text-zinc-200">{campaign.source_kind === "zn_waitlist" ? campaign.audience_scope : "-"}</dd></div>
        <div><dt className="text-zinc-500">Dedupe</dt><dd className="text-zinc-200">{campaign.source_kind === "zn_waitlist" ? campaign.dedupe_mode : "-"}</dd></div>
        <div><dt className="text-zinc-500">Scheduled for</dt><dd className="text-zinc-200">{formatEasternDateTime(campaign.scheduled_at)}</dd></div>
        <div><dt className="text-zinc-500">Completed</dt><dd className="text-zinc-200">{formatEasternDateTime(campaign.send_completed_at)}</dd></div>
      </dl>

      {delivery.total > 0 ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Delivery progress</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Current batch</div>
              <div className="text-zinc-100">
                {delivery.current ? `${delivery.current.batch_number} / ${delivery.total}` : delivery.total}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Sent</div>
              <div className="text-zinc-100">{delivery.sentCount}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Failed</div>
              <div className="text-zinc-100">{delivery.failedCount}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Next eligible</div>
              <div className="text-zinc-100">
                {formatEasternDateTime(delivery.current?.next_eligible_at)}
              </div>
            </div>
          </div>
        </section>
      ) : null}
      {providerManagedSchedule ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Scheduled delivery</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Scheduled for</div>
              <div className="text-zinc-100">
                {formatEasternDateTime(providerScheduledAttempts[0]?.scheduled_for ?? campaign.scheduled_at)}
              </div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Accepted</div>
              <div className="text-zinc-100">{providerScheduledAttempts.length}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-sm">
              <div className="text-xs text-zinc-500">Failed before scheduling</div>
              <div className="text-zinc-100">
                {attempts.filter((attempt) => attempt.status === "failed").length}
              </div>
            </div>
          </div>
          {providerSchedule.pastDue ? (
            <div className="mt-3 text-xs text-amber-300">
              Scheduled time passed. Delivery outcome now depends on Resend webhook updates.
            </div>
          ) : null}
        </section>
      ) : null}

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
                <th className="px-3 py-2">{providerManagedSchedule ? "Scheduled / Attempted" : "Attempted"}</th>
                <th className="px-3 py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="border-t border-zinc-800">
                  <td className="px-3 py-2 text-zinc-200">{attempt.email}</td>
                  <td className="px-3 py-2 text-zinc-300">{attempt.status}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {formatEasternDateTime(attempt.scheduled_for ?? attempt.attempted_at)}
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
          <div className="border-b border-zinc-800 px-4 py-2 text-xs text-zinc-500">
            Preview uses the first recipient&apos;s final personalization captured at send time.
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
