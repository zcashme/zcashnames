import Link from "next/link";
import BetaInviteWalletPicker from "./BetaInviteWalletPicker";
import EmailPreviewUnsubscribeToggle from "./EmailPreviewUnsubscribeToggle";
import { getPreviewDriftStatus } from "@/lib/email-preview/drift";
import {
  EMAIL_PREVIEW_GROUPS,
  filterEmailPreviews,
  getEmailPreviewRegistry,
  renderEmailPreview,
  type EmailPreviewFilter,
  type EmailPreviewRegistryEntry,
} from "@/lib/email-preview/registry";
import { isWalletVariantId, type WalletVariantId } from "@/lib/wallets/catalog";

function normalizeFilter(value: string | undefined): EmailPreviewFilter {
  if (value === "main" || value === "other") return value;
  return "all";
}

function driftDotStyle(status: "in_sync" | "drift" | "unknown") {
  if (status === "in_sync") return { background: "#22c55e" };
  if (status === "drift") return { background: "#ef4444" };
  return { background: "#71717a" };
}

function filterLabel(filter: EmailPreviewFilter): string {
  if (filter === "main") return "Main";
  if (filter === "other") return "Other";
  return "All";
}

function buildPreviewHref(args: {
  key: string;
  filter: EmailPreviewFilter;
  name?: string;
  code?: string;
  wallet?: string;
  includeUnsubscribe?: boolean;
}): string {
  const params = new URLSearchParams();
  params.set("email", args.key);
  params.set("filter", args.filter);

  if (args.name?.trim()) params.set("name", args.name.trim());
  if (args.code?.trim()) params.set("code", args.code.trim());
  if (args.wallet?.trim()) params.set("wallet", args.wallet.trim());
  if (typeof args.includeUnsubscribe === "boolean") {
    params.set("includeUnsubscribe", args.includeUnsubscribe ? "1" : "0");
  }

  return `/internal/email-preview?${params.toString()}`;
}

function PreviewBadgeRow({
  entry,
  driftDetail,
  compact = false,
}: {
  entry: EmailPreviewRegistryEntry;
  driftDetail?: { status: "in_sync" | "drift" | "unknown"; detail: string };
  compact?: boolean;
}) {
  if (entry.sourceRepo !== "main_production") return null;

  return (
    <div className={`${compact ? "" : "mt-1 "}flex items-center gap-2`}>
      <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-amber-300">
        Main
      </span>
      <span
        title={driftDetail?.detail ?? "No drift data."}
        className="inline-flex items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-fg-muted"
      >
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={driftDotStyle(driftDetail?.status ?? "unknown")}
        />
        {driftDetail?.status === "in_sync"
          ? "In sync"
          : driftDetail?.status === "drift"
            ? "Drift"
            : "Unknown"}
      </span>
    </div>
  );
}

export default async function InternalEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string | string[];
    name?: string;
    code?: string;
    wallet?: string;
    includeUnsubscribe?: string;
    filter?: string;
  }>;
}) {
  const params = await searchParams;
  const registry = getEmailPreviewRegistry();
  const filter = normalizeFilter(params.filter);
  const filteredRegistry = filterEmailPreviews(registry, filter);
  const requestedKey = Array.isArray(params.email) ? params.email[0] : params.email;
  const selected =
    filteredRegistry.find((entry) => entry.key === requestedKey) ??
    filteredRegistry[0] ??
    registry[0];
  const includeUnsubscribe = params.includeUnsubscribe !== "0";
  const selectedWallet =
    params.wallet && isWalletVariantId(params.wallet) ? (params.wallet as WalletVariantId) : null;

  const driftByKey = new Map(
    registry
      .filter((entry) => entry.sourceRepo === "main_production")
      .map((entry) => [entry.key, getPreviewDriftStatus(entry.driftManifest)]),
  );

  const html = await renderEmailPreview(selected, {
    name: params.name,
    code: params.code,
    wallet: params.wallet,
    includeUnsubscribe,
  });
  const selectedSubject = selected.resolveSubject(selectedWallet);
  const permalink = buildPreviewHref({
    key: selected.key,
    filter,
    name: params.name?.trim() || "Josh",
    code: params.code?.trim() || "7QFMb3jv",
    wallet: params.wallet?.trim(),
    includeUnsubscribe,
  });

  return (
    <main style={{ width: "100%", padding: "12px", boxSizing: "border-box" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "320px minmax(0, 1fr)",
          gap: 12,
          minHeight: "calc(100vh - 160px)",
          alignItems: "stretch",
        }}
      >
        <aside
          className="rounded-lg border"
          style={{
            background: "var(--tool-panel-bg)",
            borderColor: "var(--tool-panel-border)",
            padding: 10,
            maxHeight: "calc(100vh - 170px)",
            overflowY: "auto",
          }}
        >
          <div className="mb-3 px-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Internal
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-fg-heading">Email Preview</h1>
            <p className="mt-1 text-xs leading-5 text-fg-muted">
              Superset preview catalog for internal-only and dotzcash_main production emails.
            </p>
          </div>

          <div className="mb-4 px-2">
            <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
              Filter
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "main", "other"] as const).map((value) => {
                const active = filter === value;
                return (
                  <Link
                    key={value}
                    href={buildPreviewHref({
                      key: selected.key,
                      filter: value,
                      name: params.name?.trim() || "Josh",
                      code: params.code?.trim() || "7QFMb3jv",
                      wallet: params.wallet?.trim(),
                      includeUnsubscribe,
                    })}
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition-colors"
                    style={{
                      borderColor: active ? "var(--fg-heading)" : "var(--tool-panel-border)",
                      background: active ? "var(--market-stats-segment-active-bg)" : "transparent",
                      color: active ? "var(--fg-heading)" : "var(--fg-muted)",
                    }}
                  >
                    {filterLabel(value)}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            {EMAIL_PREVIEW_GROUPS.map((group) => {
              const groupEntries = filteredRegistry.filter((entry) => entry.group === group);
              if (groupEntries.length === 0) return null;

              return (
                <div key={group}>
                  <h2 className="mb-1.5 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                    {group}
                  </h2>
                  <div className="grid gap-1.5">
                    {groupEntries.map((entry) => {
                      const active = entry.key === selected.key;
                      const drift = driftByKey.get(entry.key);

                      return (
                        <Link
                          key={entry.key}
                          href={buildPreviewHref({
                            key: entry.key,
                            filter,
                            name: params.name?.trim() || "Josh",
                            code: params.code?.trim() || "7QFMb3jv",
                            wallet: params.wallet?.trim(),
                            includeUnsubscribe,
                          })}
                          className="block rounded-lg border transition-colors hover:border-fg-muted"
                          style={{
                            background: active ? "var(--market-stats-segment-active-bg)" : "transparent",
                            borderColor: active ? "var(--fg-muted)" : "var(--tool-panel-border)",
                            padding: "8px 10px",
                          }}
                        >
                          <span className="block truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                            {entry.kind === "text" ? "Text" : "React"} -{" "}
                            {entry.resolveSubject(selectedWallet)}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-fg-heading">
                            {entry.title}
                          </span>
                          <PreviewBadgeRow entry={entry} driftDetail={drift} />
                          <span className="mt-1 block text-xs leading-4 text-fg-muted">
                            {entry.description}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section
          className="min-w-0 overflow-hidden rounded-lg border"
          style={{
            borderColor: "var(--tool-panel-border)",
            minHeight: "calc(100vh - 170px)",
          }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--tool-panel-border)", background: "var(--tool-panel-bg)" }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-fg-heading">{selected.title}</h2>
                <PreviewBadgeRow
                  entry={selected}
                  driftDetail={driftByKey.get(selected.key)}
                  compact
                />
              </div>
              <p className="mt-1 truncate text-xs text-fg-muted">Subject: {selectedSubject}</p>
              {selected.controls?.wallet && <BetaInviteWalletPicker value={selectedWallet} />}
              {selected.controls?.includeUnsubscribe && (
                <EmailPreviewUnsubscribeToggle value={includeUnsubscribe} />
              )}
            </div>
            <Link
              href={permalink}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted underline-offset-2 hover:underline"
            >
              Permalink
            </Link>
          </div>
          <iframe
            title={`${selected.title} preview`}
            srcDoc={html}
            className="w-full bg-white"
            style={{
              display: "block",
              width: "100%",
              height: "calc(100vh - 236px)",
              minHeight: 760,
              border: 0,
            }}
            sandbox=""
          />
        </section>
      </section>
    </main>
  );
}
