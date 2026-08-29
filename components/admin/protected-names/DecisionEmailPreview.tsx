"use client";

import { useState, useTransition } from "react";
import { renderProtectedNameDecisionPreviewAction } from "@/app/admin/protected-names/actions";

export default function DecisionEmailPreview({ name, workflow, decision, reason, nameStatus, didTransition, submittedReason }: { name: string; workflow: string; decision: "approved" | "denied"; reason: string; nameStatus?: string | null; didTransition?: boolean; submittedReason?: string | null }) {
  const [open, setOpen] = useState(false); const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null); const [error, setError] = useState<string | null>(null);
  function toggle() { if (open) { setOpen(false); return; } setError(null); startTransition(async () => { try { setPreview(await renderProtectedNameDecisionPreviewAction({ name, workflow, decision, reason, nameStatus, didTransition, submittedReason })); setOpen(true); } catch (previewError) { setError(previewError instanceof Error ? previewError.message : "Could not render email preview."); } }); }
  return <div className="mt-2"><button type="button" disabled={pending || !reason.trim()} onClick={toggle} className="text-xs text-amber-300 hover:text-amber-200 disabled:opacity-50">{pending ? "Rendering preview..." : open ? "Hide email preview" : "Preview email"}</button>{error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}{open && preview ? <div className="mt-2 overflow-hidden rounded border border-zinc-700 bg-white"><div className="border-b border-zinc-200 bg-zinc-100 px-3 py-2 text-xs text-zinc-700"><strong>Subject:</strong> {preview.subject}</div><iframe title="Protected name decision email preview" srcDoc={preview.html} sandbox="" className="h-[620px] w-full bg-white" /></div> : null}</div>;
}
