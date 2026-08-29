"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideProtectedNameAccessRequestAction } from "@/app/admin/protected-names/actions";
import { ActionFeedback } from "@/components/admin/protected-names/ActionFeedback";
import DecisionEmailPreview from "@/components/admin/protected-names/DecisionEmailPreview";

export default function AccessRequestActions({ requestId, status, name }: { requestId: string; status: string; name: string }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null); const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null); const [success, setSuccess] = useState<string | null>(null);
  if (status !== "submitted") return <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-400">This access request is already {status}.</section>;
  function submit() { if (!decision) return; setError(null); startTransition(async () => { const result = await decideProtectedNameAccessRequestAction(requestId, decision, reason); if (!result.ok) { setError(result.message); return; } setSuccess(`Access request ${decision}.${result.data.notificationStatus === "failed" ? " Decision saved, but email failed; retry is required." : ""}`); setDecision(null); setReason(""); router.refresh(); }); }
  return <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4"><h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Access request actions</h2><div className="mt-3 flex gap-2"><button type="button" disabled={pending} onClick={() => setDecision("approved")} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Approve</button><button type="button" disabled={pending} onClick={() => setDecision("denied")} className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Deny</button></div>{decision ? <div className="mt-3 space-y-2 rounded border border-zinc-700 p-3"><label className="block text-xs text-zinc-400">{decision === "approved" ? "Approval reason" : "Denial reason"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="This exact reason will be emailed to the requester." className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" /></label><DecisionEmailPreview name={name} workflow="access_request" decision={decision} reason={reason} /><div className="flex gap-2"><button type="button" disabled={pending || !reason.trim()} onClick={submit} className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">Confirm {decision}</button><button type="button" disabled={pending} onClick={() => setDecision(null)} className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300">Cancel</button></div></div> : null}<div className="mt-3"><ActionFeedback error={error} success={success} /></div></section>;
}
