"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  resendProtectedNameDecisionEmailAttemptAction,
  retryProtectedNameDecisionEmailAttemptAction,
} from "@/app/admin/protected-names/actions";
import type { ProtectedNameDecisionEmailAttempt } from "@/lib/protected-names/types";

export default function DecisionEmailAttemptActions({ attempt }: { attempt: ProtectedNameDecisionEmailAttempt }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasContent = Boolean(attempt.subject && attempt.html);
  const isRetry = attempt.delivery_status === "failed";

  function send() {
    startTransition(async () => {
      setError(null);
      const result = isRetry
        ? await retryProtectedNameDecisionEmailAttemptAction(attempt.id)
        : await resendProtectedNameDecisionEmailAttemptAction(attempt.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      {hasContent ? <button type="button" onClick={() => setOpen((value) => !value)} className="text-amber-300 hover:text-amber-200">{open ? "Hide email" : "View email"}</button> : <span className="text-zinc-500">Email content was not retained for this legacy delivery.</span>}
      {hasContent ? <button type="button" disabled={pending} onClick={send} className="text-amber-300 hover:text-amber-200 disabled:opacity-50">{pending ? "Sending..." : isRetry ? "Retry email" : "Resend this email"}</button> : null}
      {error ? <span className="text-red-300">{error}</span> : null}
      {open && attempt.html ? <iframe title={`Protected name email ${attempt.id}`} srcDoc={attempt.html} sandbox="" className="mt-2 h-[620px] w-full rounded border border-zinc-700 bg-white" /> : null}
    </div>
  );
}
