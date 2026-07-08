"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  clearCampaignSuppressionAction,
  suppressCampaignEmailAction,
} from "@/app/admin/campaigns/actions";

interface SuppressionItem {
  id: string;
  email: string;
  reason: string;
  source: string;
  createdAt: string;
  notes: string | null;
}

interface Props {
  suppressions: SuppressionItem[];
}

export default function CampaignSuppressionManager(props: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<null | "suppress" | string>(null);

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">
        Suppression list
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
          />
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional note"
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
          />
          <button
            type="button"
            disabled={isPending}
            onClick={async () => {
              setError(null);
              setBusyAction("suppress");
              const result = await suppressCampaignEmailAction(email, notes || null);
              if (!result.ok) {
                setError(result.error);
                setBusyAction(null);
                return;
              }
              setEmail("");
              setNotes("");
              startTransition(() => {
                router.refresh();
              });
              setBusyAction(null);
            }}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "suppress" ? "Suppressing..." : "Suppress email"}
          </button>
        </div>
        {error ? <div className="text-xs text-red-400">{error}</div> : null}
        <div className="space-y-2">
          {props.suppressions.length === 0 ? (
            <div className="text-sm text-zinc-500">No active suppressions.</div>
          ) : (
            props.suppressions.map((suppression) => (
              <div
                key={suppression.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm text-zinc-100">{suppression.email}</div>
                  <div className="text-xs text-zinc-500">
                    {suppression.reason} via {suppression.source} on{" "}
                    {new Date(suppression.createdAt).toLocaleString()}
                  </div>
                  {suppression.notes ? (
                    <div className="text-xs text-zinc-400">{suppression.notes}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={async () => {
                    setError(null);
                    setBusyAction(suppression.id);
                    const result = await clearCampaignSuppressionAction(suppression.id);
                    if (!result.ok) {
                      setError(result.error);
                      setBusyAction(null);
                      return;
                    }
                    startTransition(() => {
                      router.refresh();
                    });
                    setBusyAction(null);
                  }}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyAction === suppression.id ? "Clearing..." : "Clear"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
