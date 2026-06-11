"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  estimateCampaignRecipientsAction,
  renderCampaignPreviewAction,
  saveCampaignAction,
  sendCampaignAction,
} from "@/app/admin/campaigns/actions";
import { flattenToPlainText } from "@/lib/campaigns/content";
import type {
  CampaignAudienceScope,
  CampaignDedupeMode,
  CampaignPersonalizationMode,
  CampaignSourceKind,
} from "@/lib/campaigns/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface CampaignEditorProps {
  campaignId: string;
  initialTitle: string;
  initialSourceKind: CampaignSourceKind;
  initialAudienceScope: CampaignAudienceScope;
  initialDedupeMode: CampaignDedupeMode;
  initialPersonalizationMode: CampaignPersonalizationMode;
  initialSubject: string;
  initialBodyText: string;
  initialPreviewHtml: string;
  initialRecipientCount: number;
  initialRecipientSample: Array<{ email: string; name: string; names: string[] }>;
  initialScheduledAt: string;
  draftsListHref: string;
}

const AUTOSAVE_MS = 800;
const PREVIEW_MS = 350;

export default function CampaignEditor(props: CampaignEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(props.initialTitle);
  const [sourceKind, setSourceKind] = useState<CampaignSourceKind>(props.initialSourceKind);
  const [audienceScope, setAudienceScope] = useState<CampaignAudienceScope>(props.initialAudienceScope);
  const [dedupeMode, setDedupeMode] = useState<CampaignDedupeMode>(props.initialDedupeMode);
  const [personalizationMode, setPersonalizationMode] =
    useState<CampaignPersonalizationMode>(props.initialPersonalizationMode);
  const [subject, setSubject] = useState(props.initialSubject);
  const [bodyText, setBodyText] = useState(props.initialBodyText);
  const [previewHtml, setPreviewHtml] = useState(props.initialPreviewHtml);
  const [recipientCount, setRecipientCount] = useState(props.initialRecipientCount);
  const [recipientSample, setRecipientSample] = useState(props.initialRecipientSample);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState(props.initialScheduledAt);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirtyRef = useRef(false);
  const latestRef = useRef({
    title,
    sourceKind,
    audienceScope,
    dedupeMode,
    personalizationMode,
    subject,
    bodyText,
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestRef.current = {
      title,
      sourceKind,
      audienceScope,
      dedupeMode,
      personalizationMode,
      subject,
      bodyText,
    };
  }, [title, sourceKind, audienceScope, dedupeMode, personalizationMode, subject, bodyText]);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (!dirtyRef.current) return true;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaveStatus("saving");
    const result = await saveCampaignAction(props.campaignId, latestRef.current);
    if (result.ok) {
      dirtyRef.current = false;
      setSaveStatus("saved");
      setSaveError(null);
      return true;
    }
    setSaveStatus("error");
    setSaveError(result.error);
    return false;
  }, [props.campaignId]);

  const refreshPreview = useCallback(async () => {
    const html = await renderCampaignPreviewAction(props.campaignId, {
      subject: latestRef.current.subject,
      bodyText: latestRef.current.bodyText,
    });
    setPreviewHtml(html);
  }, [props.campaignId]);

  const queueAutosave = () => {
    dirtyRef.current = true;
    setSaveStatus("idle");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void flushSave();
    }, AUTOSAVE_MS);
  };

  const queuePreview = () => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void refreshPreview();
    }, PREVIEW_MS);
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const refreshEstimate = async () => {
    setEstimateError(null);
    const saved = await flushSave();
    if (!saved) return;
    const result = await estimateCampaignRecipientsAction(props.campaignId);
    if (!result.ok) {
      setEstimateError(result.error);
      return;
    }
    setRecipientCount(result.count);
    setRecipientSample(result.sample);
    await refreshPreview();
  };

  const onSend = async () => {
    setSendError(null);
    const saved = await flushSave();
    if (!saved) return;
    const iso = schedule && scheduledAtInput ? new Date(scheduledAtInput).toISOString() : null;
    const result = await sendCampaignAction(
      props.campaignId,
      schedule ? { scheduledAt: iso } : undefined,
    );
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    startTransition(() => {
      router.push(schedule ? props.draftsListHref : `/admin/campaigns/sent/${props.campaignId}`);
    });
  };

  const onCopy = async () => {
    const saved = await flushSave();
    if (!saved) return;
    try {
      await navigator.clipboard.writeText(
        `Subject: ${latestRef.current.subject}\n\n${flattenToPlainText(latestRef.current.bodyText)}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setSendError("Clipboard not available in this browser.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Campaign title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                queueAutosave();
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Source</span>
              <select
                value={sourceKind}
                onChange={(event) => {
                  setSourceKind(event.target.value as CampaignSourceKind);
                  queueAutosave();
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              >
                <option value="zn_waitlist">zn_waitlist</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Audience</span>
              <select
                value={audienceScope}
                onChange={(event) => {
                  setAudienceScope(event.target.value as CampaignAudienceScope);
                  queueAutosave();
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              >
                <option value="verified_only">verified_only</option>
                <option value="all_rows">all_rows</option>
                <option value="contactable_only">contactable_only</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Dedupe</span>
              <select
                value={dedupeMode}
                onChange={(event) => {
                  setDedupeMode(event.target.value as CampaignDedupeMode);
                  queueAutosave();
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              >
                <option value="one_per_email">one_per_email</option>
                <option value="one_per_row">one_per_row</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Personalization</span>
            <select
              value={personalizationMode}
              onChange={(event) => {
                setPersonalizationMode(event.target.value as CampaignPersonalizationMode);
                queueAutosave();
                queuePreview();
              }}
              className="max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
            >
              <option value="light">light</option>
              <option value="static">static</option>
            </select>
          </label>
          <div className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
            <div className="font-semibold uppercase tracking-wide text-zinc-500">Tokens</div>
            <div>{`{{name}} {{referral_code}} {{referral_url}} {{dashboard_url}}`}</div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                queueAutosave();
                queuePreview();
              }}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Body - blank lines split paragraphs - inline links use <code className="rounded bg-zinc-800 px-1 text-zinc-300">[text](url)</code>
            </span>
            <textarea
              value={bodyText}
              onChange={(event) => {
                setBodyText(event.target.value);
                queueAutosave();
                queuePreview();
              }}
              rows={22}
              className="min-h-[420px] resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-[13px] leading-relaxed text-zinc-100 outline-none focus:border-amber-500"
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
            <span>
              {saveStatus === "saving" && "Saving..."}
              {saveStatus === "saved" && "Saved"}
              {saveStatus === "error" && <span className="text-red-400">Save failed: {saveError}</span>}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={refreshEstimate}
                disabled={isPending}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh recipients
              </button>
              <button
                type="button"
                onClick={onCopy}
                disabled={isPending}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy plain text"}
              </button>
            </div>
          </div>
          {estimateError && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Recipient estimate failed: {estimateError}
            </p>
          )}
          {sendError && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Send failed: {sendError}
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Recipients</div>
                <div className="text-2xl font-semibold text-zinc-100">{recipientCount}</div>
              </div>
              <a href={props.draftsListHref} className="text-sm text-amber-400 hover:text-amber-300">
                Back to drafts
              </a>
            </div>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              {recipientSample.length === 0 ? (
                <p className="text-zinc-500">No recipients resolved yet.</p>
              ) : (
                recipientSample.map((sample) => (
                  <div key={`${sample.email}-${sample.name}`} className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    <div className="font-medium text-zinc-100">{sample.name}</div>
                    <div className="text-xs text-zinc-400">{sample.email}</div>
                    {sample.names.length > 1 && (
                      <div className="mt-1 text-xs text-zinc-500">{sample.names.join(", ")}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={schedule}
                onChange={(event) => setSchedule(event.target.checked)}
                className="accent-amber-500"
              />
              Schedule instead of send now
            </label>
            {schedule && (
              <label className="mt-3 flex flex-col gap-1 text-sm text-zinc-300">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Schedule time</span>
                <input
                  type="datetime-local"
                  value={scheduledAtInput}
                  onChange={(event) => setScheduledAtInput(event.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                />
              </label>
            )}
            <button
              type="button"
              onClick={onSend}
              disabled={isPending || recipientCount === 0}
              className="mt-4 w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {schedule ? "Queue scheduled send" : "Send campaign"}
            </button>
          </section>

          <section className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/40">
            <div className="border-b border-zinc-800 px-4 py-3 text-xs uppercase tracking-wide text-zinc-500">
              Preview
            </div>
            <iframe
              title="campaign email preview"
              srcDoc={previewHtml}
              className="h-[520px] w-full bg-white"
              style={{ border: 0 }}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
