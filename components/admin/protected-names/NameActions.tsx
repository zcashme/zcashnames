"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionFeedback } from "@/components/admin/protected-names/ActionFeedback";
import DecisionEmailPreview from "@/components/admin/protected-names/DecisionEmailPreview";
import {
  decideProtectedNameSuggestionAction,
  protectRejectedNameAction,
  redeemProtectedNameAction,
  rejectProtectedProtectedNameAction,
  returnProtectedNameToReviewAction,
  undoRedeemProtectedNameAction,
} from "@/app/admin/protected-names/actions";

type Props = {
  name: string;
  status: string;
  redeemed: boolean;
};

export default function NameActions({ name, status, redeemed }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [decision, setDecision] = useState<"approved" | "denied" | null>(null);

  function run(
    label: string,
    action: () => Promise<{ ok: boolean; message?: string }>,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Action failed.");
        return;
      }
      setSuccess(label);
      setDecision(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        Status actions
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {status === "under_review" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDecision("approved")}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Approve protection
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDecision("denied")}
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Reject suggestion
            </button>
          </>
        ) : null}

        {status === "protected" && !redeemed ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const rejectionReason = window.prompt("Reason for removing protection?");
                if (!rejectionReason?.trim()) return;
                run("Protection removed.", () =>
                  rejectProtectedProtectedNameAction(name, rejectionReason),
                );
              }}
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              Reject protected name
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run("Returned to review.", () =>
                  returnProtectedNameToReviewAction(name),
                )
              }
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-50"
            >
              Return to review
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`Mark ${name} as redeemed?`)) return;
                run("Marked redeemed.", () => redeemProtectedNameAction(name));
              }}
              className="rounded border border-violet-700 px-3 py-1.5 text-sm text-violet-200 hover:border-violet-500 disabled:opacity-50"
            >
              Mark redeemed
            </button>
          </>
        ) : null}

        {status === "protected" && redeemed ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Undo redemption for ${name}?`)) return;
              run("Redemption undone.", () =>
                undoRedeemProtectedNameAction(name),
              );
            }}
            className="rounded border border-violet-700 px-3 py-1.5 text-sm text-violet-200 hover:border-violet-500 disabled:opacity-50"
          >
            Undo redemption
          </button>
        ) : null}

        {status === "rejected" ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run("Protected rejected name.", () =>
                  protectRejectedNameAction(name),
                )
              }
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Protect rejected name
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run("Returned to review.", () =>
                  returnProtectedNameToReviewAction(name),
                )
              }
              className="rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-50"
            >
              Return to review
            </button>
          </>
        ) : null}
      </div>

      {decision ? (
        <div className="mt-4 space-y-2 rounded border border-red-900/50 bg-red-950/20 p-3">
          <label className="block text-xs text-zinc-400">
            {decision === "approved" ? "Approval reason" : "Denial reason"}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
              placeholder="This exact reason will be emailed to the requester."
            />
          </label>
          <DecisionEmailPreview name={name} workflow="suggestion" decision={decision} reason={reason} nameStatus={decision === "approved" ? "protected" : "rejected"} />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !reason.trim()}
              onClick={() =>
                run(decision === "approved" ? "Protection approved." : "Suggestion denied.", () =>
                  decideProtectedNameSuggestionAction(name, decision, reason),
                )
              }
              className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Confirm {decision}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setDecision(null)}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <ActionFeedback error={error} success={success} />
      </div>
    </section>
  );
}
