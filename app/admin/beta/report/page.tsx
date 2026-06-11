import {
  getAllFeedback,
  computeStats,
  countByChecklistItem,
  computeRatingBoxPlot,
  buildRatingPlotPoints,
  countByWalletVariant,
} from "@/lib/beta/report";
import { BETA_CHECKLIST } from "@/lib/beta/checklist";
import { BETA_GIT_CHANGES } from "@/lib/beta/git-changes";
import FeedbackTable from "@/components/admin/beta/FeedbackTable";
import RatingBoxPlot from "@/components/admin/beta/RatingBoxPlot";
import { getWalletVariant, subcategoryLabel } from "@/lib/wallets/catalog";

export const dynamic = "force-dynamic";

const CHECKLIST_LABEL = new Map(BETA_CHECKLIST.map((i) => [i.id, i.label]));
const CHECKLIST_LABELS_OBJ = Object.fromEntries(CHECKLIST_LABEL);
const CHECKLIST_GROUP = new Map(BETA_CHECKLIST.map((i) => [i.id, i.group]));

function commitTypeBadge(message: string) {
  const match = message.match(/^(\w+)[\((:]/);
  const type = match?.[1] ?? "other";
  const styles: Record<string, string> = {
    feat: "bg-emerald-500/15 text-emerald-300",
    fix: "bg-red-500/15 text-red-300",
    refactor: "bg-sky-500/15 text-sky-300",
    style: "bg-purple-500/15 text-purple-300",
    perf: "bg-orange-500/15 text-orange-300",
  };
  const cls = styles[type] ?? "bg-zinc-800 text-zinc-400";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-mono ${cls}`}>{type}</span>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

export default async function BetaReportPage() {
  const rows = await getAllFeedback();
  const stats = computeStats(rows);
  const checklistCounts = countByChecklistItem(rows);
  const walletCounts = countByWalletVariant(rows);
  const ratingBox = computeRatingBoxPlot(rows);
  const ratingPoints = buildRatingPlotPoints(rows, (itemId) => {
    if (!itemId) return "uncategorized";
    const group = CHECKLIST_GROUP.get(itemId);
    return group === "user" ? "user" : "uncategorized";
  });

  const avgDisplay =
    stats.avgRating != null ? `${stats.avgRating.toFixed(1)} / 5` : "-";

  return (
    <div className="space-y-10 text-sm">
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total submissions" value={stats.totalSubmissions} />
          <StatCard label="Unique testers" value={stats.uniqueTesters} />
          <StatCard label="Avg experience" value={avgDisplay} />
          <StatCard label="High severity" value={stats.highSeverity} />
          <StatCard label="Testnet reports" value={stats.testnet} />
          <StatCard label="Mainnet reports" value={stats.mainnet} />
          <StatCard label="V1 reports" value={stats.v1} />
          <StatCard label="V2 reports" value={stats.v2} />
        </div>
      </section>

      <section>
        <RatingBoxPlot stats={ratingBox} points={ratingPoints} />
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Checklist coverage
        </h2>
        {BETA_CHECKLIST.length === 0 ? (
          <p className="text-zinc-400">No checklist items defined.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-zinc-800">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Group</th>
                  <th className="px-3 py-2 text-right">Reports</th>
                  <th className="px-3 py-2 text-right">Avg rating</th>
                </tr>
              </thead>
              <tbody>
                {BETA_CHECKLIST.map((item) => {
                  const entry = checklistCounts.get(item.id);
                  const count = entry?.count ?? 0;
                  const avg =
                    entry && entry.ratingCount > 0
                      ? (entry.ratingSum / entry.ratingCount).toFixed(1)
                      : "-";
                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-zinc-800 ${count === 0 ? "opacity-40" : "hover:bg-zinc-900/60"}`}
                    >
                      <td className="px-3 py-2 text-zinc-100">
                        <span className={count === 0 ? "line-through" : ""}>{item.label}</span>
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{item.group}</td>
                      <td className="px-3 py-2 text-right text-zinc-300">{count}</td>
                      <td className="px-3 py-2 text-right text-zinc-400">{avg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Wallet coverage
        </h2>
        {walletCounts.length === 0 ? (
          <p className="text-zinc-400">No v2 wallet-attributed reports yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-zinc-800">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Wallet</th>
                  <th className="px-3 py-2">Variant ID</th>
                  <th className="px-3 py-2 text-right">Reports</th>
                </tr>
              </thead>
              <tbody>
                {walletCounts.map((entry) => {
                  const variant = entry.walletVariantId ? getWalletVariant(entry.walletVariantId) : null;
                  const label = variant
                    ? `${variant.displayName} / ${subcategoryLabel(variant.subcategory)}`
                    : "Unspecified";
                  return (
                    <tr key={entry.walletVariantId ?? "unspecified"} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                      <td className="px-3 py-2 text-zinc-100">{label}</td>
                      <td className="px-3 py-2 font-mono text-zinc-400">{entry.walletVariantId ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-zinc-300">{entry.count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Feedback by tester
        </h2>
        <FeedbackTable rows={rows} checklistLabels={CHECKLIST_LABELS_OBJ} />
      </section>

      <section>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Git changes during beta
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          2026-04-20 to 2026-05-04 · {BETA_GIT_CHANGES.length} commits
        </p>
        <div className="overflow-hidden rounded-md border border-zinc-800">
          <table className="w-full text-left">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">Hash</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Message</th>
              </tr>
            </thead>
            <tbody>
              {BETA_GIT_CHANGES.map((commit) => (
                <tr key={commit.hash} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                  <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                    {commit.hash}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                    {commit.date}
                  </td>
                  <td className="px-3 py-2">{commitTypeBadge(commit.message)}</td>
                  <td className="px-3 py-2 text-zinc-300">{commit.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
