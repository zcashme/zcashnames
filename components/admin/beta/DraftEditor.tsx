"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as betaActions from "@/app/admin/beta/actions";
import * as betaV2Actions from "@/app/admin/beta-v2/actions";
import { flattenToPlainText } from "@/lib/beta/invite-template";
import type { WalletVariantId } from "@/lib/wallets/catalog";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface DraftEditorProps {
  testerId: string;
  displayName: string;
  bestContactKind: string;
  contactValue: string;
  inviteCode: string;
  focusAreas: string[];
  why: string | null;
  experience: string | null;
  walletVariantId?: WalletVariantId | null;
  initialSubject: string;
  initialBodyText: string;
  initialPreviewHtml: string;
  prevId: string | null;
  nextId: string | null;
  draftsListHref: string;
  scheduleTargetIso: string;
  scheduleTargetLabel: string;
  variant?: "v1" | "v2";
}

const AUTOSAVE_MS = 800;
const PREVIEW_MS = 350;

function FocusBadge({ value }: { value: string }) {
  const primary = value === "sdk";
  return (
    <span
      className={
        "rounded px-1.5 py-0.5 text-xs " +
        (primary
          ? "bg-amber-500/20 text-amber-300"
          : "bg-zinc-800 text-zinc-300")
      }
    >
      {value}
    </span>
  );
}

export default function DraftEditor(props: DraftEditorProps) {
  const router = useRouter();
  const variant = props.variant ?? "v1";
  const actions = variant === "v2" ? betaV2Actions : betaActions;
  const draftsBasePath = variant === "v2" ? "/admin/beta-v2/drafts" : "/admin/beta/drafts";
  const isEmail = props.bestContactKind === "email";
  const [subject, setSubject] = useState(props.initialSubject);
  const [bodyText, setBodyText] = useState(props.initialBodyText);
  const [previewHtml, setPreviewHtml] = useState(props.initialPreviewHtml);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirtyRef = useRef(false);
  const latestRef = useRef({ subject, bodyText });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestRef.current = { subject, bodyText };
  }, [subject, bodyText]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (!dirtyRef.current) return true;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveStatus("saving");
    const result = await actions.saveDraftAction(props.testerId, latestRef.current);
    if (result.ok) {
      dirtyRef.current = false;
      setSaveStatus("saved");
      setSaveError(null);
      return true;
    }
    setSaveStatus("error");
    setSaveError(result.error);
    return false;
  }, [props.testerId]);

  const refreshPreview = useCallback(async () => {
    const html = await actions.renderPreviewAction({
      displayName: props.displayName,
      inviteCode: props.inviteCode,
      bodyText: latestRef.current.bodyText,
      walletVariantId: props.walletVariantId,
    });
    setPreviewHtml(html);
  }, [props.displayName, props.inviteCode]);

  const onSubjectChange = (v: string) => {
    setSubject(v);
    dirtyRef.current = true;
    setSaveStatus("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, AUTOSAVE_MS);
  };

  const onBodyChange = (v: string) => {
    setBodyText(v);
    dirtyRef.current = true;
    setSaveStatus("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, AUTOSAVE_MS);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void refreshPreview();
    }, PREVIEW_MS);
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const cycleTo = async (id: string | null) => {
    if (!id) return;
    const ok = await flushSave();
    if (!ok) return;
    startTransition(() => {
      router.push(`${draftsBasePath}/${encodeURIComponent(id)}`);
    });
  };

  const afterMoveOut = () => {
    if (props.nextId) {
      startTransition(() => {
        router.push(`${draftsBasePath}/${encodeURIComponent(props.nextId!)}`);
      });
    } else {
      startTransition(() => {
        router.push(props.draftsListHref);
      });
    }
  };

  const onSend = async () => {
    setSendError(null);
    const saved = await flushSave();
    if (!saved) return;
    const result = await actions.sendDraftAction(
      props.testerId,
      { subject: latestRef.current.subject, bodyText: latestRef.current.bodyText },
      schedule ? { scheduledAt: props.scheduleTargetIso } : undefined,
    );
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    afterMoveOut();
  };

  const onCopy = async () => {
    const saved = await flushSave();
    if (!saved) return;
    const plain =
      `Subject: ${latestRef.current.subject}\n\n` +
      flattenToPlainText(latestRef.current.bodyText) +
      `\n\nPasscode: ${props.inviteCode}`;
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setSendError("Clipboard not available in this browser.");
    }
  };

  const onReset = async () => {
    if (!window.confirm("Reset this draft to the default template? Your edits will be lost.")) {
      return;
    }
    const result = await actions.resetDraftAction(props.testerId, props.displayName);
    if (!result.ok) {
      setSaveStatus("error");
      setSaveError(result.error);
      return;
    }
    setSubject(result.subject);
    setBodyText(result.bodyText);
    latestRef.current = { subject: result.subject, bodyText: result.bodyText };
    dirtyRef.current = false;
    setSaveStatus("saved");
    setSaveError(null);
    const html = await actions.renderPreviewAction({
      displayName: props.displayName,
      inviteCode: props.inviteCode,
      bodyText: result.bodyText,
      walletVariantId: props.walletVariantId,
    });
    setPreviewHtml(html);
  };

  const onMarkSent = async () => {
    setSendError(null);
    const saved = await flushSave();
    if (!saved) return;
    const result = await actions.markSentAction(props.testerId, {
      subject: latestRef.current.subject,
      bodyText: latestRef.current.bodyText,
    });
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    afterMoveOut();
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-semibold text-zinc-100">
            {props.displayName}
          </h1>
          <span className="text-xs text-zinc-400">
            {props.bestContactKind}:{" "}
            <span className="text-zinc-200">{props.contactValue}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {props.focusAreas.map((f) => (
            <FocusBadge key={f} value={f} />
          ))}
          {props.focusAreas.includes("sdk") && (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
              sdk-first
            </span>
          )}
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
            Passcode:{" "}
            <span className="font-mono text-zinc-200">{props.inviteCode}</span>
          </span>
        </div>
        {props.why && (
          <div className="text-sm">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Why</div>
            <p className="whitespace-pre-wrap text-zinc-200">{props.why}</p>
          </div>
        )}
        {props.experience && (
          <div className="text-sm">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              Experience ({props.experience.length} chars)
            </div>
            <p className="whitespace-pre-wrap text-zinc-200">{props.experience}</p>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Body — paragraphs separated by blank lines · inline links use{" "}
              <code className="rounded bg-zinc-800 px-1 text-zinc-300">
                [text](url)
              </code>
            </span>
            <textarea
              value={bodyText}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={22}
              className="min-h-[400px] resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>

          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "Saved ✓"}
              {saveStatus === "error" && (
                <span className="text-red-400">Save failed: {saveError}</span>
              )}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onReset}
                disabled={isPending}
                className="text-zinc-400 underline decoration-dotted underline-offset-2 hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset to default
              </button>
              <span className="text-zinc-600">Auto-saves as you type</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cycleTo(props.prevId)}
                  disabled={!props.prevId || isPending}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => cycleTo(props.nextId)}
                  disabled={!props.nextId || isPending}
                  className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>

              {isEmail ? (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      checked={schedule}
                      onChange={(e) => setSchedule(e.target.checked)}
                      className="accent-amber-500"
                    />
                    Schedule {props.scheduleTargetLabel}
                  </label>
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={isPending}
                    className="rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {schedule ? "Schedule invite" : "Send invite"}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCopy}
                    disabled={isPending}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                  <div
                    role="radiogroup"
                    aria-label="Draft or sent"
                    className="flex overflow-hidden rounded-md border border-zinc-700"
                  >
                    <button
                      type="button"
                      role="radio"
                      aria-checked={true}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-semibold bg-amber-500/20 text-amber-300"
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={false}
                      onClick={onMarkSent}
                      disabled={isPending}
                      className="border-l border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Sent
                    </button>
                  </div>
                </div>
              )}
            </div>
            {sendError && (
              <p className="text-sm text-red-400">{sendError}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Preview
            </span>
            <span className="truncate text-xs text-zinc-600">
              Subject: {subject}
            </span>
          </div>
          <iframe
            title="email preview"
            srcDoc={previewHtml}
            className="h-[640px] w-full rounded-md border border-zinc-700 bg-white"
          />
        </div>
      </div>
    </div>
  );
}
