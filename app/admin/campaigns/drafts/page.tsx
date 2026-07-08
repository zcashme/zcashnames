import CreateCampaignButton from "@/components/admin/campaigns/CreateCampaignButton";
import CampaignQuickActions from "@/components/admin/campaigns/CampaignQuickActions";
import CampaignSuppressionManager from "@/components/admin/campaigns/CampaignSuppressionManager";
import {
  getCampaignAdminHealthSummary,
  listCampaignOperationalSummaries,
  listRecentActiveSuppressions,
} from "@/lib/campaigns/admin-overview";
import { getProviderManagedScheduleState } from "@/lib/campaigns/provider-schedule";
import { formatEasternDateTime } from "@/lib/campaigns/schedule";
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
  const [summaries, health, suppressions] = await Promise.all([
    listCampaignOperationalSummaries(campaigns),
    getCampaignAdminHealthSummary(campaigns),
    listRecentActiveSuppressions(),
  ]);
  const summaryByCampaignId = new Map(
    summaries.map((summary) => [summary.campaign.id, summary]),
  );

  return (
    <div className="flex flex-col gap-4">
      <section
        className={`rounded-md border p-4 ${
          health.ready
            ? "border-emerald-900/60 bg-emerald-950/30"
            : "border-amber-900/60 bg-amber-950/30"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Campaign readiness
            </div>
            <div
              className={`mt-1 text-lg font-semibold ${
                health.ready ? "text-emerald-200" : "text-amber-200"
              }`}
            >
              {health.ready ? "Ready for production use" : "Not ready yet"}
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            Last worker success:{" "}
            <span className="text-zinc-200">
              {formatEasternDateTime(health.workerHealth?.last_success_at)}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Delivery schema</div>
            <div className={health.deliverySchemaOk ? "text-emerald-300" : "text-amber-300"}>
              {health.deliverySchemaOk ? "ok" : "missing pieces"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Suppression schema</div>
            <div className={health.suppressionSchemaOk ? "text-emerald-300" : "text-amber-300"}>
              {health.suppressionSchemaOk ? "ok" : "missing"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Worker health schema</div>
            <div className={health.workerHealthSchemaOk ? "text-emerald-300" : "text-amber-300"}>
              {health.workerHealthSchemaOk ? "ok" : "missing"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Webhook event schema</div>
            <div className={health.webhookSchemaOk ? "text-emerald-300" : "text-amber-300"}>
              {health.webhookSchemaOk ? "ok" : "missing"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Resend API key</div>
            <div className={health.resendApiConfigured ? "text-emerald-300" : "text-amber-300"}>
              {health.resendApiConfigured ? "configured" : "missing"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Resend webhook secret</div>
            <div className={health.resendWebhookConfigured ? "text-emerald-300" : "text-amber-300"}>
              {health.resendWebhookConfigured ? "configured" : "missing"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Worker auth</div>
            <div className={health.cronSecretConfigured ? "text-emerald-300" : "text-amber-300"}>
              {health.cronSecretConfigured ? "CRON_SECRET configured" : "route is unprotected"}
            </div>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm">
            <div className="text-xs text-zinc-500">Worker heartbeat</div>
            <div className={health.workerHealthy ? "text-emerald-300" : "text-amber-300"}>
              {health.workerHealthy ? "recent success observed" : "stale or missing"}
            </div>
          </div>
        </div>
        {health.workerHealth?.last_error ? (
          <div className="mt-3 rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
            Last worker error: {health.workerHealth.last_error}
          </div>
        ) : null}
        {health.warnings.length > 0 ? (
          <div className="mt-3 space-y-1 text-sm text-amber-200">
            {health.warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-400">
          Generic admin-managed campaigns. Source targeting is configured per draft.
        </p>
        <CreateCampaignButton />
      </div>

      <CampaignSuppressionManager
        suppressions={suppressions.map((suppression) => ({
          id: suppression.id,
          email: suppression.email,
          reason: suppression.reason,
          source: suppression.source,
          createdAt: suppression.created_at,
          notes: suppression.notes,
        }))}
      />

      {campaigns.length === 0 ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
          No draft or scheduled campaigns yet.
        </section>
      ) : (
        <section className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Series</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Audience</th>
                <th className="px-3 py-2">Recipients</th>
                <th className="px-3 py-2">Sent</th>
                <th className="px-3 py-2">Failed</th>
                <th className="px-3 py-2">Pending</th>
                <th className="px-3 py-2">Next</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const summary = summaryByCampaignId.get(campaign.id);
                const providerSchedule = summary
                  ? getProviderManagedScheduleState({
                      hasDeliveryBatches: !summary.providerManaged,
                      acceptedCount: summary.providerScheduledCount,
                      scheduledAt: summary.providerScheduledAt,
                      canceledAt: campaign.delivery_canceled_at,
                    })
                  : null;
                const canPauseResume = Boolean(
                  summary &&
                    !summary.providerManaged &&
                    (summary.pendingCount > 0 || Boolean(campaign.delivery_paused_at)),
                );
                const canDelete = campaign.status === "draft";
                const canCancel = Boolean(
                  summary &&
                    (summary.pendingCount > 0 ||
                      providerSchedule?.cancelable ||
                      Boolean(campaign.delivery_paused_at)),
                );
                const canRunWorker = Boolean(
                  summary && !summary.providerManaged && summary.pendingCount > 0,
                );
                return (
                  <tr
                    key={campaign.id}
                    className="border-t border-zinc-800 align-top hover:bg-zinc-900/60"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-100">{campaign.title}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      {seriesSummary(campaign.source_kind, campaign.series)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{campaign.source_kind}</td>
                    <td className="px-3 py-2 text-zinc-400">
                      {audienceSummary(campaign)}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{campaign.recipient_count}</td>
                    <td className="px-3 py-2 text-zinc-300">{summary?.sentCount ?? 0}</td>
                    <td className="px-3 py-2 text-zinc-300">{summary?.failedCount ?? 0}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      {summary?.providerManaged
                        ? providerSchedule?.pendingCount ?? 0
                        : summary?.pendingCount ?? 0}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatEasternDateTime(
                        summary?.providerManaged
                          ? providerSchedule?.nextEligibleAt ?? null
                          : summary?.nextEligibleAt ?? campaign.scheduled_at,
                      )}
                    </td>
                    <td className="px-3 py-2">{statusBadge(campaign.status)}</td>
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(campaign.updated_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <CampaignQuickActions
                        campaignId={campaign.id}
                        editHref={`/admin/campaigns/drafts/${encodeURIComponent(campaign.id)}`}
                        allowPauseResume={canPauseResume}
                        isPaused={Boolean(campaign.delivery_paused_at)}
                        isCanceled={Boolean(campaign.delivery_canceled_at)}
                        allowCancel={canCancel}
                        allowRetry={Boolean(summary?.hasFailedRecipients)}
                        allowRunWorker={canRunWorker}
                        allowDelete={canDelete}
                        compact
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
