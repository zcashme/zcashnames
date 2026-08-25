"use client";

import { useState, useTransition } from "react";
import type { ReserveinfoPlannedPost, ReserveinfoPostDestination, ReserveinfoPostResult, ReserveinfoPostScheduleState, ReserveinfoReportWindow } from "@/lib/reserveinfo-post/types";
import { RESERVEINFO_POST_DESTINATIONS } from "@/lib/reserveinfo-post/types";
import {
  getReserveinfoPostTemplateTheme,
  RESERVEINFO_POST_TEMPLATE_VARIANTS,
  type ReserveinfoPostTemplateVariant,
} from "@/lib/reserveinfo-post/template-variant";
import { dryRunReserveinfoPostAction, runReserveinfoPostAction, saveReserveinfoPostScheduleAction } from "./actions";

function PreviewCard({ post, templateVariant }: { post: ReserveinfoPlannedPost; templateVariant: ReserveinfoPostTemplateVariant }) {
  const theme = getReserveinfoPostTemplateTheme(templateVariant);
  const columns = Array.from({ length: 3 }, (_, column) => Array.from({ length: 10 }, (_, row) => post.names[column * 10 + row] ?? null));
  return <div className="relative aspect-square overflow-hidden rounded-xl border border-border-muted" style={{ fontFamily: "Consolas, monospace", backgroundColor: theme.canvasColor, color: theme.textColor, backgroundImage: `url(/api/reserveinfo-post/background?variant=${templateVariant})`, backgroundSize: "cover", containerType: "inline-size" }}>
    <div className="absolute left-[19.8%] top-[5.7%] text-[1.852cqw] font-bold tracking-[0.12em]">Last Week's Reservations</div>
    <div className="absolute left-[19.8%] top-[8%] text-[3.981cqw] font-bold tracking-[-0.06em]">Reserved Names</div>
    <div className="absolute left-[10.4%] top-[23%] grid w-[79.3%] grid-cols-3 gap-3 text-[2.593cqw] font-bold leading-[5.556cqw]">
      {columns.map((column, columnIndex) => <div key={columnIndex} className="overflow-hidden whitespace-nowrap text-center">{column.map((entry, rowIndex) => <div key={entry ? `${entry.name}-${entry.reservedAt}` : `empty-${columnIndex}-${rowIndex}`}>{entry?.name ?? "..."}</div>)}</div>)}
    </div>
    <div className="absolute left-[10.4%] top-[81%] w-[79.3%] text-center text-[2.037cqw] font-bold">Showing {post.shownStart}-{post.shownEnd} of {post.totalNames}</div>
    <div className="absolute right-[9.4%] top-[91.6%] whitespace-nowrap text-right text-[1.852cqw] font-extrabold tracking-[0.02em]">{post.weekLabel}</div>
  </div>;
}

export default function ReserveinfoPostTool(props: { initialSchedule: ReserveinfoPostScheduleState; initialQueue: ReserveinfoPlannedPost[]; initialPreview: ReserveinfoPlannedPost[]; reportWindow: ReserveinfoReportWindow | null; previewError: string | null; initialTemplateVariant: ReserveinfoPostTemplateVariant }) {
  const [schedule, setSchedule] = useState(props.initialSchedule); const [destination, setDestination] = useState<ReserveinfoPostDestination>(props.initialSchedule.destination);
  const [templateVariant, setTemplateVariant] = useState<ReserveinfoPostTemplateVariant>(props.initialTemplateVariant);
  const [result, setResult] = useState<ReserveinfoPostResult | null>(null); const [status, setStatus] = useState<string | null>(props.previewError); const [pending, startTransition] = useTransition();
  const posts = result?.plannedPosts?.length ? result.plannedPosts : (props.initialQueue.length ? props.initialQueue : props.initialPreview);
  const window = result?.reportWindow ?? props.reportWindow;
  function execute(mode: "run" | "dry") { startTransition(async () => { setStatus(null); const response = mode === "run" ? await runReserveinfoPostAction(destination, templateVariant) : await dryRunReserveinfoPostAction(destination, templateVariant); setResult(response); setStatus(response.ok ? (response.skipped ? response.skipReason ?? "No post was due." : mode === "run" ? "Queue page processed." : "Dry run completed.") : response.error ?? "Reserveinfo workflow failed."); }); }
  function save() { startTransition(async () => { const response = await saveReserveinfoPostScheduleAction({ enabled: schedule.enabled, destination, templateVariant, weeklyTimezone: schedule.weeklyTimezone }); if (response.ok) { setSchedule(response.schedule); setDestination(response.schedule.destination); setTemplateVariant(response.schedule.templateVariant); setStatus("Schedule saved."); } else setStatus(response.error); }); }
  return <div className="grid w-full gap-6 px-4 pb-12 sm:px-6 xl:px-8 2xl:px-10">
    <section className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">Persistent Weekly Queue</div><h2 className="text-2xl font-bold text-fg-heading">Reserveinfo Post</h2>
      <p className="max-w-4xl text-sm leading-6 text-fg-body">Snapshots completed Monday-Sunday reservations, puts names without digits first, and publishes 30-name three-column pages across the following workweek. A retry sends only unfinished channel deliveries.</p>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">Destination<select value={destination} onChange={(event) => setDestination(event.target.value as ReserveinfoPostDestination)} className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading">{RESERVEINFO_POST_DESTINATIONS.map((value) => <option key={value} value={value}>{value === "both" ? "Telegram and X" : value}</option>)}</select></label>
        <label className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">Timezone<input value={schedule.weeklyTimezone} onChange={(event) => setSchedule((current) => ({ ...current, weeklyTimezone: event.target.value }))} className="rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold normal-case tracking-normal text-fg-heading" /></label>
        <label className="flex items-center gap-3 rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-heading"><input type="checkbox" checked={schedule.enabled} onChange={(event) => setSchedule((current) => ({ ...current, enabled: event.target.checked }))} /> Enable weekday schedule</label>
      </div>
      <div className="text-sm text-fg-body">Configured schedule: <span className="font-semibold text-fg-heading">Monday-Friday, 11:30 ET first, then additional deterministic slots as needed.</span></div>
      <div className="grid gap-2 text-sm font-semibold text-fg-heading">
        <span>Preview template</span>
        <div role="group" aria-label="Preview template" className="grid w-full max-w-md grid-cols-2 rounded-lg border border-border-muted bg-[var(--color-raised)] p-1">
          {RESERVEINFO_POST_TEMPLATE_VARIANTS.map((variant) => {
            const active = templateVariant === variant;
            const label = variant === "original" ? "Original" : "Light";
            const description = variant === "original" ? "Lime on dark" : "Black on ivory";
            return <button key={variant} type="button" aria-pressed={active} onClick={() => setTemplateVariant(variant)} className={`rounded-md px-3 py-2 text-left transition-colors ${active ? "bg-fg-heading text-[var(--color-background)]" : "text-fg-heading hover:bg-[var(--color-card)]"}`}><span className="block text-sm font-bold">{label}</span><span className={`block text-xs font-medium ${active ? "text-[var(--color-background)]/75" : "text-fg-muted"}`}>{description}</span></button>;
          })}
        </div>
        <span className="text-xs font-medium text-fg-muted">This template is used for previews and posts when you save the schedule.</span>
      </div>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => execute("dry")} disabled={pending} className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading disabled:opacity-60">Dry Run</button><button type="button" onClick={() => execute("run")} disabled={pending} className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:opacity-60">Run Next Post</button><button type="button" onClick={save} disabled={pending} className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold text-fg-heading disabled:opacity-60">Save schedule</button></div>
      {status ? <div className="text-sm font-semibold text-fg-body">{status}</div> : null}
    </section>
    <section className="grid gap-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-[0.18em] text-fg-muted">{props.initialQueue.length ? "Persisted Queue" : "Live Preview"}</div><div className="mt-1 text-sm text-fg-body">{window?.weekLabel ?? "Completed week unavailable"}{window ? `, ${window.timeZone}` : ""}</div></div><div className="text-sm font-semibold text-fg-heading">{posts[0]?.totalNames ?? 0} unique names · {posts.length} pages</div></div>
      {posts.length ? <div className="grid gap-5 xl:grid-cols-2">{posts.map((post) => <article key={`${post.pageIndex}-${post.scheduledAt}`} className="grid gap-3 rounded-2xl border border-border-muted bg-[var(--color-card)] p-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm text-fg-body"><span className="font-semibold text-fg-heading">Page {post.pageIndex + 1}: {post.shownStart}-{post.shownEnd}</span><span>{new Date(post.scheduledAt).toLocaleString("en-US", { timeZone: window?.timeZone, weekday: "short", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}</span></div><PreviewCard post={post} templateVariant={templateVariant} /><div className="flex flex-wrap gap-3 text-xs text-fg-body"><a href={`/api/reserveinfo-post/image?page=${post.pageIndex}&variant=${templateVariant}`} className="font-semibold text-fg-heading underline">Download PNG</a><span>Telegram: {post.telegramMessageId ? `sent (${post.telegramMessageId})` : post.telegramError || "pending"}; protection reply: {post.telegramProtectionMessageId ? `sent (${post.telegramProtectionMessageId})` : post.telegramProtectionError || "pending"}</span><span>X: {post.xPostId ? `posted (${post.xPostId})` : post.xError || "pending"}; protection reply: {post.xProtectionPostId ? `posted (${post.xProtectionPostId})` : post.xProtectionError || "pending"}</span></div></article>)}</div> : <div className="rounded-2xl border border-border-muted bg-[var(--color-card)] p-5 text-sm text-fg-muted">No reservations were found in the completed week.</div>}</section>
  </div>;
}
