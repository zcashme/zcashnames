import Link from "next/link";
import { getInviteStats, listSentTesters } from "@/lib/beta-v2/drafts";
import { getWalletVariant, subcategoryLabel } from "@/lib/wallets/catalog";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type WalletFilter = "all" | "specified" | "generic";
type SortColumn = "name" | "contact" | "wallet" | "sent" | "activated" | "notice";
type SortDirection = "asc" | "desc";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="mb-1 text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function statusBadge(status: string | null) {
  const color =
    status === "sent"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "failed"
        ? "bg-red-500/15 text-red-300"
        : "bg-zinc-800 text-zinc-300";
  return <span className={`rounded px-1.5 py-0.5 text-xs ${color}`}>{status ?? "-"}</span>;
}

function formatRate(numerator: number, denominator: number): string {
  if (denominator <= 0) return "-";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatCompactRate(numerator: number, denominator: number): string {
  if (denominator <= 0) return "-";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function walletLabelForRow(walletVariantId: string | null): string {
  if (!walletVariantId) return "Generic CTA";
  const variant = getWalletVariant(walletVariantId);
  return variant ? `${variant.displayName} / ${subcategoryLabel(variant.subcategory)}` : walletVariantId;
}

function sortIndicator(column: SortColumn, activeSort: SortColumn, activeDir: SortDirection): string {
  if (column !== activeSort) return "^v";
  return activeDir === "asc" ? "^" : "v";
}

function buildQuery(
  current: { wallet: string; sort: SortColumn; dir: SortDirection },
  patch: Partial<{ wallet: string; sort: SortColumn; dir: SortDirection }>,
) {
  const params = new URLSearchParams();
  const next = { ...current, ...patch };
  if (next.wallet !== "all") params.set("wallet", next.wallet);
  if (next.sort !== "sent") params.set("sort", next.sort);
  if (next.dir !== "desc") params.set("dir", next.dir);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function SentListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const [rows, stats] = await Promise.all([listSentTesters(), getInviteStats()]);
  const walletFilterParam = getSingleParam(params.wallet) ?? "all";
  const sortParam = getSingleParam(params.sort) ?? "sent";
  const dirParam = getSingleParam(params.dir) ?? "desc";
  const walletFilter: WalletFilter | string = walletFilterParam;
  const sort = (
    ["name", "contact", "wallet", "sent", "activated", "notice"] as const
  ).includes(sortParam as SortColumn)
    ? (sortParam as SortColumn)
    : "sent";
  const dir: SortDirection = dirParam === "asc" ? "asc" : "desc";
  const walletRows = Array.from(
    rows.reduce((map, row) => {
      const walletVariantId = row.preferred_wallet_variant_id;
      if (!walletVariantId) return map;

      const current = map.get(walletVariantId) ?? { sent: 0, converted: 0 };
      current.sent += 1;
      if (row.activated_at) current.converted += 1;
      map.set(walletVariantId, current);
      return map;
    }, new Map<string, { sent: number; converted: number }>()),
  )
    .map(([walletVariantId, counts]) => {
      const variant = getWalletVariant(walletVariantId);
      const walletLabel = variant
        ? `${variant.displayName} / ${subcategoryLabel(variant.subcategory)}`
        : walletVariantId;
      return {
        walletVariantId,
        walletLabel,
        sent: counts.sent,
        converted: counts.converted,
      };
    })
    .filter((entry) => entry.sent > 0)
    .sort((a, b) => b.sent - a.sent || a.walletLabel.localeCompare(b.walletLabel));
  const walletTargetedSent = walletRows.reduce((total, entry) => total + entry.sent, 0);
  const walletOptions = walletRows.map((entry) => ({
    value: entry.walletVariantId,
    label: entry.walletLabel,
  }));
  const filteredRows = rows.filter((row) => {
    if (walletFilter === "all") return true;
    if (walletFilter === "specified") return !!row.preferred_wallet_variant_id;
    if (walletFilter === "generic") return !row.preferred_wallet_variant_id;
    return row.preferred_wallet_variant_id === walletFilter;
  });
  const sortedRows = [...filteredRows].sort((a, b) => {
    const direction = dir === "asc" ? 1 : -1;
    const aContact = a.best_contact_kind === "email" ? a.contact_email ?? "" : a.best_contact_kind ?? "";
    const bContact = b.best_contact_kind === "email" ? b.contact_email ?? "" : b.best_contact_kind ?? "";
    const aWallet = walletLabelForRow(a.preferred_wallet_variant_id);
    const bWallet = walletLabelForRow(b.preferred_wallet_variant_id);
    const aSent = a.code_sent_at ? new Date(a.code_sent_at).getTime() : 0;
    const bSent = b.code_sent_at ? new Date(b.code_sent_at).getTime() : 0;
    const aActivated = a.activated_at ? new Date(a.activated_at).getTime() : 0;
    const bActivated = b.activated_at ? new Date(b.activated_at).getTime() : 0;
    const compareText = (left: string, right: string) => left.localeCompare(right) * direction;
    const compareNumber = (left: number, right: number) => (left - right) * direction;

    const primary =
      sort === "name"
        ? compareText(a.display_name, b.display_name)
        : sort === "contact"
          ? compareText(aContact, bContact)
          : sort === "wallet"
            ? compareText(aWallet, bWallet)
            : sort === "activated"
              ? compareNumber(aActivated, bActivated)
              : sort === "notice"
                ? compareText(a.notice_status ?? "", b.notice_status ?? "")
                : compareNumber(aSent, bSent);

    if (primary !== 0) return primary;
    return compareNumber(aSent, bSent);
  });
  const currentQuery = {
    wallet: walletFilter,
    sort,
    dir,
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Summary
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatCard
            label="Converted / Sent % (All)"
            value={`${stats.convertedApplicants} / ${stats.sentInvites} ${formatCompactRate(stats.convertedApplicants, stats.sentInvites)} (${stats.totalApplicants})`}
          />
          <StatCard
            label="Conversion Rate Sent (All)"
            value={`${formatRate(stats.convertedApplicants, stats.sentInvites)} (${formatRate(stats.convertedApplicants, stats.totalApplicants)})`}
          />
        </div>
      </section>

      {walletRows.length > 0 && (
        <section>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Wallet Conversion
            </h2>
            <p className="text-xs text-zinc-500">
              Sent to wallets: {walletTargetedSent}
            </p>
          </div>
          <div className="overflow-hidden rounded-md border border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Wallet</th>
                  <th className="px-3 py-2 text-right">Converted / Sent %</th>
                </tr>
              </thead>
              <tbody>
                {walletRows.map((entry) => (
                  <tr key={entry.walletVariantId} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                    <td className="px-3 py-2 text-zinc-100">{entry.walletLabel}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">
                      {entry.converted} / {entry.sent} {formatCompactRate(entry.converted, entry.sent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
          Nothing sent yet. Beta invites you send from the Drafts view will appear here.
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <form className="flex flex-wrap items-end gap-3" method="get">
              <div className="flex flex-col gap-1">
                <label htmlFor="wallet-filter" className="text-xs uppercase tracking-wide text-zinc-500">
                  Wallet specified
                </label>
                <select
                  id="wallet-filter"
                  name="wallet"
                  defaultValue={walletFilter}
                  className="rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="all">All</option>
                  <option value="specified">Wallet specified</option>
                  <option value="generic">Generic CTA</option>
                  {walletOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />
              <button
                type="submit"
                className="rounded bg-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
              >
                Apply
              </button>
            </form>
            <div className="text-xs text-zinc-500">
              {sortedRows.length} of {rows.length} sent invites
            </div>
          </div>

          {sortedRows.length === 0 ? (
            <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400">
              No sent invites match the current filter.
            </section>
          ) : (
        <section className="overflow-hidden rounded-md border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-3 py-2">
                  <Link href={buildQuery(currentQuery, { sort: "name", dir: sort === "name" && dir === "asc" ? "desc" : "asc" })} className="hover:text-zinc-200">
                    Name {sortIndicator("name", sort, dir)}
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildQuery(currentQuery, { sort: "contact", dir: sort === "contact" && dir === "asc" ? "desc" : "asc" })} className="hover:text-zinc-200">
                    Contact {sortIndicator("contact", sort, dir)}
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildQuery(currentQuery, { sort: "wallet", dir: sort === "wallet" && dir === "asc" ? "desc" : "asc" })} className="hover:text-zinc-200">
                    Wallet specified {sortIndicator("wallet", sort, dir)}
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildQuery(currentQuery, { sort: "sent", dir: sort === "sent" && dir === "asc" ? "desc" : "asc" })} className="hover:text-zinc-200">
                    Sent at {sortIndicator("sent", sort, dir)}
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildQuery(currentQuery, { sort: "activated", dir: sort === "activated" && dir === "asc" ? "desc" : "asc" })} className="hover:text-zinc-200">
                    Activated {sortIndicator("activated", sort, dir)}
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildQuery(currentQuery, { sort: "notice", dir: sort === "notice" && dir === "asc" ? "desc" : "asc" })} className="hover:text-zinc-200">
                    Notice {sortIndicator("notice", sort, dir)}
                  </Link>
                </th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="border-t border-zinc-800 hover:bg-zinc-900/60">
                  <td className="px-3 py-2 font-medium text-zinc-100">{row.display_name}</td>
                  <td className="px-3 py-2 text-zinc-300">
                    {row.best_contact_kind === "email" ? row.contact_email : (row.best_contact_kind ?? "-")}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {walletLabelForRow(row.preferred_wallet_variant_id)}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {row.code_sent_at ? new Date(row.code_sent_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {row.activated_at ? new Date(row.activated_at).toLocaleString() : "-"}
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
          )}
        </section>
      )}
    </div>
  );
}
