import Link from "next/link";
import { listDistinctSubscriberSeries } from "@/lib/email/subscriber-series";
import {
  buildUnsubscribeToken,
  type UnsubscribeMode,
} from "@/lib/email/unsubscribe-token";

export const dynamic = "force-dynamic";

const MAIN_SITE_URL = "https://www.zcashnames.com";

function normalizeSeries(value: string | undefined, seriesList: string[]): string {
  const trimmed = value?.trim();
  if (trimmed && seriesList.includes(trimmed)) return trimmed;
  return seriesList[0] ?? "general";
}

function normalizeMode(value: string | undefined): UnsubscribeMode {
  return value === "all" ? "all" : "series";
}

export default async function InternalUnsubscribePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; series?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const seriesList = await listDistinctSubscriberSeries();
  const email = params.email?.trim().toLowerCase() || "preview@example.com";
  const series = normalizeSeries(params.series, seriesList);
  const mode = normalizeMode(params.mode);
  const token = buildUnsubscribeToken({ email, series, mode, ttlSeconds: 60 * 60 * 24 * 7 });
  const previewHref = `${MAIN_SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header
        className="mb-6 rounded-2xl border p-6"
        style={{
          background: "var(--tool-panel-bg)",
          borderColor: "var(--tool-panel-border)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fg-muted">
          Local Only
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg-heading">
          Unsubscribe Preview
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-fg-muted">
          Generate a valid unsubscribe/preferences token and open the live page hosted by dotzcash_main.
        </p>
      </header>

      <section
        className="mb-6 rounded-2xl border p-5"
        style={{
          background: "var(--tool-panel-bg)",
          borderColor: "var(--tool-panel-border)",
        }}
      >
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px_auto] md:items-end">
          <label className="flex flex-col gap-2 text-sm text-fg-body">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Email
            </span>
            <input
              type="email"
              name="email"
              defaultValue={email}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-fg-body">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Series
            </span>
            <select
              name="series"
              defaultValue={series}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              {seriesList.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-fg-body">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Mode
            </span>
            <select
              name="mode"
              defaultValue={mode}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
            >
              <option value="series">series</option>
              <option value="all">all</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
          >
            Refresh preview
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link href={previewHref} className="font-medium text-amber-400 hover:text-amber-300">
            Open full page
          </Link>
          <span className="text-fg-muted">{previewHref}</span>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border"
        style={{
          background: "var(--tool-panel-bg)",
          borderColor: "var(--tool-panel-border)",
        }}
      >
        <iframe
          title="Unsubscribe preferences preview"
          src={previewHref}
          className="min-h-[900px] w-full bg-black"
        />
      </section>
    </main>
  );
}
