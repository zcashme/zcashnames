"use client";

import { startTransition, useState } from "react";
import { ENS_OUTREACH_VARIATIONS, ensOutreachDraft, type EnsOutreachBatch, type EnsOutreachItem } from "@/lib/ens-outreach/types";
import { createEnsOutreachBatchAction, generateEnsOutreachStaticImageAction, prepareEnsOutreachItemsAction, updateEnsOutreachItemAction } from "./actions";

const REVIEW_REASONS = ["Stale account", "No ZEC mentions", "ETH name not displayed", "Custom"] as const;
const PAGE_SIZE = 25;

function searchUrl(username: string) { return `https://x.com/search?q=${encodeURIComponent(`from:${username} (zec OR zcash OR privacy OR zkp)`)}&src=typed_query&f=live`; }
function itemCount(status: string, items: EnsOutreachItem[]) { return items.filter((item) => item.status === status).length; }

function QueueItem({ item, onBatch, onPatch }: { item: EnsOutreachItem; onBatch: (batch: EnsOutreachBatch) => void; onPatch: (id: string, patch: Partial<EnsOutreachItem>) => void }) {
  const legacyDraft = item.draftText.trim().startsWith("If you want it, it's yours!");
  const [draft, setDraft] = useState(legacyDraft ? ensOutreachDraft(item.xUsername, item.name, item.protectedUrl) : item.draftText);
  const [targetUrl, setTargetUrl] = useState(item.targetTweetUrl ?? "");
  const [variation, setVariation] = useState(0);
  const [reviewReason, setReviewReason] = useState(item.reviewReason ?? "");
  const [customReason, setCustomReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const composeUrl = `https://x.com/intent/post?text=${encodeURIComponent(draft)}`;

  async function save() {
    const result = await updateEnsOutreachItemAction(item.id, { draftText: draft, targetTweetUrl: targetUrl || null });
    setMessage(result.ok ? "Changes saved." : result.error);
    if (result.ok) onPatch(item.id, { draftText: draft, targetTweetUrl: targetUrl || null });
  }
  async function mark(status: "rejected" | "sent") {
    const reason = reviewReason === "Custom" ? customReason.trim() : reviewReason;
    if (status === "rejected" && !reason) { setMessage("Select a review reason first."); return; }
    const result = await updateEnsOutreachItemAction(item.id, { status, ...(status === "rejected" ? { reviewReason: reason } : {}) });
    setMessage(result.ok ? `Marked ${status}.` : result.error);
    if (result.ok) onPatch(item.id, { status, ...(status === "rejected" ? { reviewReason: reason } : {}) });
  }
  async function generateStaticImage() {
    setMessage("Generating static image...");
    const result = await generateEnsOutreachStaticImageAction(item.id);
    if (result.ok) { onBatch(result.batch); setMessage("Static image generated."); } else setMessage(result.error);
  }
  async function copyImage() {
    if (!item.pngUrl) return;
    const blob = await (await fetch(item.pngUrl)).blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    setMessage("PNG copied to clipboard.");
  }

  return <article className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border-muted px-3 py-1 text-xs font-bold">#{item.queueOrder + 1}</span><b>{item.name}</b><span className="text-sm text-fg-muted">@{item.xUsername} · {item.followerCount.toLocaleString()} followers</span><span className="rounded-full border border-border-muted px-3 py-1 text-xs font-semibold uppercase text-fg-muted">{item.status.replace("_", " ")}</span></div>
      <a href={item.protectedUrl} target="_blank" rel="noreferrer" className="break-all text-sm font-semibold underline">{item.protectedUrl}</a>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[.12em] text-fg-muted">Copy variation<select value={variation} onChange={(event) => { const next = Number(event.target.value); setVariation(next); setDraft(ensOutreachDraft(item.xUsername, item.name, item.protectedUrl, next)); }} className="rounded-lg border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm normal-case tracking-normal text-fg-heading">{ENS_OUTREACH_VARIATIONS.map((text, index) => <option key={text} value={index}>Variation {index + 1}: {text}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[.12em] text-fg-muted">Draft<textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-28 rounded-lg border border-border-muted bg-[var(--color-raised)] p-3 text-sm normal-case tracking-normal text-fg-heading" /></label>
      <label className="grid gap-1 text-xs font-bold uppercase tracking-[.12em] text-fg-muted">Reply target<input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="Standalone draft" className="rounded-lg border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm normal-case tracking-normal text-fg-heading" /></label>
      {item.targetTweetText ? <p className="rounded-lg border border-border-muted bg-[var(--color-raised)] p-3 text-sm">Latest match: {item.targetTweetText}</p> : null}
      {item.error ? <p className="rounded-lg border border-red-400/50 bg-red-50 p-3 text-sm text-red-800">{item.error}</p> : null}
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigator.clipboard.writeText(draft).then(() => setMessage("Copy saved to clipboard."))} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold">Copy post</button><button type="button" disabled={!item.pngUrl} onClick={() => void copyImage()} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold disabled:opacity-50">Copy PNG</button><button type="button" onClick={() => void save()} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold">Save</button><select value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="rounded-lg border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm"><option value="">Rejection reason</option>{REVIEW_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</select>{reviewReason === "Custom" ? <input value={customReason} onChange={(event) => setCustomReason(event.target.value)} placeholder="Custom reason" className="rounded-lg border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm" /> : null}<button type="button" onClick={() => void mark("rejected")} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold">Mark rejected</button><button type="button" onClick={() => void mark("sent")} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold">Mark sent</button><a href={composeUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white">Open X compose</a></div>
      {targetUrl ? <a href={targetUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">Open reply target</a> : <button type="button" onClick={() => window.open(searchUrl(item.xUsername), `x-search-${item.id}`, "popup=yes,width=1200,height=900,noopener,noreferrer")} className="w-fit text-left text-sm font-semibold underline">Search @{item.xUsername} for ZEC, Zcash, privacy, or ZKP</button>}
      {message ? <p className="text-sm font-semibold text-fg-body">{message}</p> : null}
    </div>
    <div className="grid content-start gap-3">{item.pngUrl ? <button type="button" onClick={() => setPreviewOpen((open) => !open)} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold">{previewOpen ? "Minimize static preview" : "Show static preview"}</button> : null}{item.pngUrl && previewOpen ? <img src={item.pngUrl} alt={`Protected ${item.name} popup`} className="w-full rounded-lg border border-border-muted" /> : null}<button type="button" onClick={() => void generateStaticImage()} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold">Generate static image</button></div>
  </article>;
}

export default function EnsOutreachTool({ initialBatch, initialError }: { initialBatch: EnsOutreachBatch | null; initialError: string | null }) {
  const [batch, setBatch] = useState(initialBatch);
  const [status, setStatus] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "rejected" | "sent">("all"); const [page, setPage] = useState(0);
  function run(action: () => Promise<{ ok: true; batch: EnsOutreachBatch } | { ok: false; error: string }>) { setPending(true); startTransition(async () => { const result = await action(); if (result.ok) { setBatch(result.batch); setStatus(null); } else setStatus(result.error); setPending(false); }); }
  function patchItem(id: string, patch: Partial<EnsOutreachItem>) { setBatch((current) => current ? { ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) } : current); }
  const visible = batch?.items.filter((item) => filter === "all" || filter === "rejected" && item.status === "rejected" || filter === "sent" && item.status === "sent" || filter === "pending" && item.status !== "rejected" && item.status !== "sent") ?? [];
  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages - 1);
  const pagedItems = visible.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);
  return <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-12 sm:px-6"><section className="grid gap-4 rounded-2xl border border-border-muted bg-[var(--color-card)] p-6"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-fg-muted">Manual X Outreach</p><h2 className="mt-1 text-2xl font-bold text-fg-heading">ENS Outreach Draft Queue</h2><p className="mt-2 text-sm text-fg-body">Reads only from X. Copy the draft and PNG, then post manually from the intended account.</p></div><div className="flex flex-wrap gap-3"><button type="button" disabled={pending} onClick={() => run(() => createEnsOutreachBatchAction(false))} className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold">Create or resume queue</button><button type="button" disabled={pending} onClick={() => run(() => createEnsOutreachBatchAction(true))} className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold">Start new queue</button>{batch ? <button type="button" disabled={pending} onClick={() => run(() => prepareEnsOutreachItemsAction(batch.id))} className="rounded-lg border border-border-muted px-4 py-2 text-sm font-semibold">Prepare next 5</button> : null}<select value={filter} onChange={(event) => { setFilter(event.target.value as typeof filter); setPage(0); }} className="rounded-lg border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold"><option value="all">All items</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="sent">Sent</option></select></div>{batch ? <p className="text-sm text-fg-body">{batch.totalItems} items · {itemCount("sent", batch.items)} sent · {itemCount("rejected", batch.items)} rejected · {itemCount("pending", batch.items) + itemCount("preparing", batch.items) + itemCount("ready", batch.items) + itemCount("no_match", batch.items) + itemCount("failed", batch.items)} pending</p> : null}{status ? <p className="rounded-lg border border-red-400/50 bg-red-50 p-3 text-sm text-red-800">{status}</p> : null}</section>{visible.length ? <><div className="flex items-center justify-between gap-3"><span className="text-sm text-fg-muted">Showing {activePage * PAGE_SIZE + 1}-{Math.min((activePage + 1) * PAGE_SIZE, visible.length)} of {visible.length}</span><div className="flex items-center gap-2"><button type="button" disabled={activePage === 0} onClick={() => setPage(activePage - 1)} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold disabled:opacity-50">Previous</button><span className="text-sm font-semibold">Page {activePage + 1} of {totalPages}</span><button type="button" disabled={activePage + 1 === totalPages} onClick={() => setPage(activePage + 1)} className="rounded-lg border border-border-muted px-3 py-2 text-sm font-semibold disabled:opacity-50">Next</button></div></div><section className="grid gap-4">{pagedItems.map((item) => <QueueItem key={item.id} item={item} onBatch={setBatch} onPatch={patchItem} />)}</section></> : <div className="rounded-2xl border border-border-muted bg-[var(--color-card)] p-6 text-sm text-fg-muted">No items match this filter.</div>}</div>;
}
