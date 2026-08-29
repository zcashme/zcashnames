"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideProtectedNameDisputeAction } from "@/app/admin/protected-names/actions";
import { ActionFeedback } from "@/components/admin/protected-names/ActionFeedback";
import DecisionEmailPreview from "@/components/admin/protected-names/DecisionEmailPreview";

type Props = { disputeId: string; protectedName: string; reviewStatus: string; isParent: boolean; variantCount: number; canTransitionLikely: boolean; currentNameStatus: string; submittedNameStatus: string; submittedReason: string };

export default function DisputeActions(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applyToVariants, setApplyToVariants] = useState(false);
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);
  const [reason, setReason] = useState("");

  if (props.reviewStatus !== "under_review") return <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4"><h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Dispute actions</h2><p className="mt-2 text-sm text-zinc-500">This dispute is already {props.reviewStatus}.</p></section>;

  function submit() {
    if (!decision) return;
    setError(null); setSuccess(null);
    startTransition(async () => {
      const result = await decideProtectedNameDisputeAction(props.disputeId, props.protectedName, decision, reason, applyToVariants);
      if (!result.ok) { setError(result.message); return; }
      setSuccess(`Dispute ${decision === "approved" ? "accepted" : "dismissed"}.${result.data.notificationStatus === "failed" ? " Decision saved, but email failed; retry is required." : ""}`);
      setDecision(null); setReason(""); router.refresh();
    });
  }

  const nextStatus = decision === "approved" && props.canTransitionLikely ? (props.submittedNameStatus === "protected" ? "rejected" : "protected") : props.currentNameStatus;
  return <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4"><h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Dispute actions</h2>{props.isParent && props.canTransitionLikely && props.variantCount > 0 ? <label className="mt-3 flex items-start gap-2 text-sm text-zinc-300"><input type="checkbox" checked={applyToVariants} onChange={(event) => setApplyToVariants(event.target.checked)} className="mt-1" /><span>Apply status change to all variants ({props.variantCount} direct child{props.variantCount === 1 ? "" : "ren"}; recursive descendants included). Redeemed variants are skipped.</span></label> : null}<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={pending} onClick={() => setDecision("approved")} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50">Accept dispute</button><button type="button" disabled={pending} onClick={() => setDecision("denied")} className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-50">Dismiss dispute</button></div>{decision ? <div className="mt-3 space-y-2 rounded border border-zinc-700 bg-zinc-900/60 p-3"><label className="block text-xs text-zinc-400">{decision === "approved" ? "Acceptance reason" : "Dismissal reason"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="This exact reason will be emailed to the requester." className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100" /></label><DecisionEmailPreview name={props.protectedName} workflow="dispute" decision={decision} reason={reason} nameStatus={nextStatus} didTransition={decision === "approved" ? props.canTransitionLikely : false} submittedReason={props.submittedReason} /><div className="flex gap-2"><button type="button" disabled={pending || !reason.trim()} onClick={submit} className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Confirm {decision}</button><button type="button" disabled={pending} onClick={() => setDecision(null)} className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300">Cancel</button></div></div> : null}<div className="mt-3"><ActionFeedback error={error} success={success} /></div></section>;
}
