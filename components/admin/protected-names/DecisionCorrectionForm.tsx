"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendProtectedNameDecisionCorrectionAction } from "@/app/admin/protected-names/actions";
import DecisionEmailPreview from "@/components/admin/protected-names/DecisionEmailPreview";
import type { ProtectedNameDecision } from "@/lib/protected-names/types";

type Outcome = "approved" | "denied";

function asOutcome(value: string): Outcome {
  return value === "approved" ? "approved" : "denied";
}

export default function DecisionCorrectionForm({ decision }: { decision: ProtectedNameDecision }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(decision.effective_reason);
  const [outcome, setOutcome] = useState<Outcome>(asOutcome(decision.effective_decision));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canCorrectStatus = decision.workflow === "access_request";
  const isStatusCorrection = outcome !== decision.effective_decision;

  if (!decision.recipient_email) return null;

  function submit() {
    startTransition(async () => {
      setError(null);
      setSuccess(null);
      const result = await sendProtectedNameDecisionCorrectionAction(
        decision.id,
        reason,
        canCorrectStatus ? outcome : undefined,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      setSuccess(result.data.notificationStatus === "failed" ? "Correction saved, but email failed. Retry it from the email history." : "Correction saved and emailed.");
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <button type="button" onClick={() => setOpen((value) => !value)} className="text-xs text-amber-300 hover:text-amber-200">
        {open ? "Cancel correction" : "Send correction"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2 rounded border border-zinc-700 bg-zinc-900/60 p-3">
          <p className="text-xs text-zinc-400">This preserves the original decision, records a correction, and emails {decision.recipient_email}.</p>
          {canCorrectStatus ? (
            <label className="block text-xs text-zinc-400">
              Corrected outcome
              <select value={outcome} onChange={(event) => setOutcome(event.target.value as Outcome)} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100">
                <option value="approved">Approved</option>
                <option value="denied">Denied</option>
              </select>
            </label>
          ) : null}
          {isStatusCorrection ? <p className="text-xs text-amber-300">This will also update the access request from {decision.effective_decision} to {outcome}.</p> : null}
          <label className="block text-xs text-zinc-400">
            Corrected reason
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100" />
          </label>
          <DecisionEmailPreview
            name={decision.protected_name}
            workflow={decision.workflow}
            decision={outcome}
            reason={reason}
            nameStatus={decision.name_status}
            didTransition={decision.name_did_transition ?? undefined}
            submittedReason={decision.submitted_reason}
            isCorrection
            isDecisionCorrection={isStatusCorrection}
          />
          <button type="button" disabled={pending || !reason.trim()} onClick={submit} className="rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-zinc-950 disabled:opacity-50">
            {pending ? "Sending correction..." : isStatusCorrection ? "Correct outcome and send email" : "Save correction and send email"}
          </button>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
      ) : null}
      {success ? <p className="mt-2 text-xs text-emerald-300">{success}</p> : null}
    </div>
  );
}
