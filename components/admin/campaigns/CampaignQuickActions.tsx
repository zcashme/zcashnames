"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelCampaignAction,
  deleteCampaignDraftAction,
  duplicateCampaignAction,
  pauseCampaignAction,
  resumeCampaignAction,
  retryFailedCampaignAction,
} from "@/app/admin/campaigns/actions";

interface Props {
  campaignId: string;
  editHref?: string;
  showEdit?: boolean;
  allowPauseResume?: boolean;
  isPaused?: boolean;
  isCanceled?: boolean;
  allowCancel?: boolean;
  allowRetry?: boolean;
  allowRunWorker?: boolean;
  allowDuplicate?: boolean;
  allowDelete?: boolean;
  deleteRedirectHref?: string;
  compact?: boolean;
}

export default function CampaignQuickActions(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [workerPending, setWorkerPending] = useState(false);
  const [busyAction, setBusyAction] = useState<
    null | "duplicate" | "delete" | "resume" | "pause" | "cancel" | "retry"
  >(null);

  async function refreshAfter(task: () => Promise<void>) {
    setError(null);
    try {
      await task();
      startTransition(() => {
        router.refresh();
      });
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : String(taskError));
    }
  }

  async function flushEditorIfPresent(): Promise<void> {
    if (typeof window === "undefined") return;
    const flush = window.__campaignEditorFlushSave;
    if (!flush) return;
    const ok = await flush();
    if (!ok) {
      throw new Error("Draft save failed. Fix the save error in the editor and try again.");
    }
  }

  const buttonClass = props.compact
    ? "rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-50"
    : "rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {props.showEdit !== false && props.editHref ? (
          <Link href={props.editHref} className={buttonClass}>
            Edit
          </Link>
        ) : null}
        {props.allowDuplicate !== false ? (
          <button
            type="button"
            disabled={isPending || workerPending}
            onClick={() =>
              void refreshAfter(async () => {
                setBusyAction("duplicate");
                await flushEditorIfPresent();
                const result = await duplicateCampaignAction(props.campaignId);
                if (!result.ok) throw new Error(result.error);
                router.push(`/admin/campaigns/drafts/${result.id}`);
              }).finally(() => {
                setBusyAction(null);
              })
            }
            className={buttonClass}
          >
            {busyAction === "duplicate" ? "Duplicating..." : "Duplicate"}
          </button>
        ) : null}
        {props.allowDelete ? (
          <button
            type="button"
            disabled={isPending || workerPending}
            onClick={() =>
              void refreshAfter(async () => {
                setBusyAction("delete");
                const result = await deleteCampaignDraftAction(props.campaignId);
                if (!result.ok) throw new Error(result.error);
                if (props.deleteRedirectHref) {
                  router.push(props.deleteRedirectHref);
                }
              }).finally(() => {
                setBusyAction(null);
              })
            }
            className={`${buttonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/40`}
          >
            {busyAction === "delete" ? "Deleting..." : "Delete draft"}
          </button>
        ) : null}
        {props.allowPauseResume ? (
          props.isPaused ? (
            <button
              type="button"
              disabled={isPending || workerPending || props.isCanceled}
              onClick={() =>
                void refreshAfter(async () => {
                  setBusyAction("resume");
                  const result = await resumeCampaignAction(props.campaignId);
                  if (!result.ok) throw new Error(result.error);
                }).finally(() => {
                  setBusyAction(null);
                })
              }
              className={buttonClass}
            >
              {busyAction === "resume" ? "Resuming..." : "Resume"}
            </button>
          ) : (
            <button
              type="button"
              disabled={isPending || workerPending || props.isCanceled}
              onClick={() =>
                void refreshAfter(async () => {
                  setBusyAction("pause");
                  const result = await pauseCampaignAction(props.campaignId);
                  if (!result.ok) throw new Error(result.error);
                }).finally(() => {
                  setBusyAction(null);
                })
              }
              className={buttonClass}
            >
              {busyAction === "pause" ? "Pausing..." : "Pause"}
            </button>
          )
        ) : null}
        {props.allowCancel ? (
          <button
            type="button"
            disabled={isPending || workerPending || props.isCanceled}
            onClick={() =>
              void refreshAfter(async () => {
                setBusyAction("cancel");
                const result = await cancelCampaignAction(props.campaignId);
                if (!result.ok) throw new Error(result.error);
              }).finally(() => {
                setBusyAction(null);
              })
            }
            className={`${buttonClass} border-red-900/60 text-red-300 hover:border-red-700 hover:bg-red-950/40`}
          >
            {busyAction === "cancel" ? "Canceling..." : "Cancel"}
          </button>
        ) : null}
        {props.allowRetry ? (
          <button
            type="button"
            disabled={isPending || workerPending}
            onClick={() =>
              void refreshAfter(async () => {
                setBusyAction("retry");
                const result = await retryFailedCampaignAction(props.campaignId);
                if (!result.ok) throw new Error(result.error);
              }).finally(() => {
                setBusyAction(null);
              })
            }
            className={buttonClass}
          >
            {busyAction === "retry" ? "Retrying..." : "Retry failed"}
          </button>
        ) : null}
        {props.allowRunWorker ? (
          <button
            type="button"
            disabled={isPending || workerPending || props.isPaused || props.isCanceled}
            onClick={async () => {
              setError(null);
              setWorkerPending(true);
              try {
                const response = await fetch("/api/campaign-worker", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ campaignId: props.campaignId }),
                });
                const result = (await response.json()) as {
                  ok?: boolean;
                  error?: string;
                };
                if (!response.ok || !result.ok) {
                  throw new Error(result.error || `Worker request failed with ${response.status}.`);
                }
                startTransition(() => {
                  router.refresh();
                });
              } catch (workerError) {
                setError(
                  workerError instanceof Error ? workerError.message : String(workerError),
                );
              } finally {
                setWorkerPending(false);
              }
            }}
            className={buttonClass}
          >
            {workerPending ? "Running worker..." : "Run worker"}
          </button>
        ) : null}
      </div>
      {error ? <div className="text-xs text-red-400">{error}</div> : null}
    </div>
  );
}
