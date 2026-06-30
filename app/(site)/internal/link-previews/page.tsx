import type { Metadata } from "next";
import { LINK_PREVIEW_MANIFEST } from "@/lib/seo/linkPreviewManifest";

export const metadata: Metadata = {
  title: "Internal Link Preview QA | ZcashNames",
  description: "Temporary page to review social preview cards before release.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LinkPreviewsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <section className="rounded-2xl border p-5 sm:p-6" style={{ background: "var(--tool-panel-bg)", borderColor: "var(--tool-panel-border)" }}>
        <h1 className="text-3xl font-bold tracking-tight text-fg-heading">Link Preview QA</h1>
        <p className="mt-3 text-sm text-fg-muted">
          Temporary internal page to validate OG/Twitter previews before release. Each card below renders the real `/og/*.png` endpoint.
        </p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {LINK_PREVIEW_MANIFEST.map((item) => (
            <article key={item.id} className="rounded-xl border p-3" style={{ borderColor: "var(--tool-panel-border)", background: "var(--tool-panel-bg-solid, var(--tool-panel-bg))" }}>
              <img
                src={`${item.image}${item.image.includes("?") ? "&" : "?"}v=preview`}
                alt={`${item.label} preview`}
                className="w-full rounded-lg border"
                style={{ borderColor: "var(--tool-panel-border)", aspectRatio: "1200 / 630", objectFit: "cover" }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">{item.label}</p>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--tool-panel-border)" }}>
                  {item.kind}
                </span>
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-muted" style={{ borderColor: "var(--tool-panel-border)" }}>
                  {item.group}
                </span>
              </div>
              <p className="mt-1 text-base font-semibold text-fg-heading">{item.title}</p>
              <p className="mt-1 text-sm text-fg-muted">{item.description}</p>
              <p className="mt-2 break-all text-xs text-fg-muted">{item.url}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
