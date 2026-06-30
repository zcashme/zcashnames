"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelCampaignAction,
  getCampaignDeliveryDiagnosticsAction,
  estimateCampaignRecipientsAction,
  getCampaignDeliveryStateAction,
  pauseCampaignAction,
  queueCampaignAction,
  renderCampaignPreviewAction,
  resumeCampaignAction,
  saveCampaignAction,
  sendCampaignAction,
} from "@/app/admin/campaigns/actions";
import { flattenToPlainText } from "@/lib/campaigns/content";
import {
  easternDateTimeInputToIso,
  formatEasternDateTime,
  getEasternTimeZoneLabel,
} from "@/lib/campaigns/schedule";
import type {
  CampaignAudienceScope,
  CampaignBlockedReason,
  CampaignDedupeMode,
  CampaignPersonalizationMode,
  CampaignTargetSeries,
  CampaignSourceKind,
} from "@/lib/campaigns/types";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type DeliveryBatchStatus = "pending" | "sending" | "sent" | "failed" | "canceled";
type DeliveryNoticeTone = "info" | "success" | "warning" | "error";
type CampaignDeliveryActionSuccess = Extract<
  Awaited<ReturnType<typeof sendCampaignAction>>,
  { ok: true }
>;

interface DeliveryNotice {
  tone: DeliveryNoticeTone;
  title: string;
  detail: string;
  nextEligibleAt?: string | null;
  firstError?: string | null;
  sentDetailHref?: string | null;
}

interface DeliveryBatchView {
  id: string;
  batchNumber: number;
  status: DeliveryBatchStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  nextEligibleAt: string | null;
}

interface DeliveryStateView {
  batches: DeliveryBatchView[];
  deliveryPausedAt: string | null;
  deliveryCanceledAt: string | null;
  deliveryWarning: string | null;
  providerScheduledAt: string | null;
  providerScheduledCount: number;
  providerFailedCount: number;
  providerManaged: boolean;
}

interface CampaignWorkerResponse {
  ok: boolean;
  processed?: boolean;
  processedCount?: number;
  campaignId?: string;
  batchId?: string;
  status?: DeliveryBatchStatus;
  lastStatus?: DeliveryBatchStatus;
  error?: string;
}

interface DeliveryAttemptView {
  id: string;
  email: string;
  status: string;
  error: string | null;
  attemptedAt: string;
  scheduledFor: string | null;
}

interface CampaignEditorProps {
  campaignId: string;
  initialTitle: string;
  initialSourceKind: CampaignSourceKind;
  initialSeries: CampaignTargetSeries;
  initialIncludeUnsubscribe: boolean;
  initialAudienceScope: CampaignAudienceScope;
  initialDedupeMode: CampaignDedupeMode;
  initialPersonalizationMode: CampaignPersonalizationMode;
  initialSeriesOptions: string[];
  initialCustomEmailsText: string;
  initialSubject: string;
  initialBodyText: string;
  initialPreviewHtml: string;
  initialRecipientCount: number;
  initialRecipientSample: Array<{ email: string; name: string; names: string[] }>;
  initialBlockedRecipients: Array<{ email: string; reason: CampaignBlockedReason }>;
  initialEstimateError: string | null;
  initialRecipientEstimateDirty: boolean;
  initialDeliveryBatches: Array<{
    id: string;
    batchNumber: number;
    status: DeliveryBatchStatus;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    nextEligibleAt: string | null;
  }>;
  initialDeliveryPausedAt: string | null;
  initialDeliveryCanceledAt: string | null;
  initialDeliveryWarning: string | null;
  initialProviderScheduledAt: string | null;
  initialProviderScheduledCount: number;
  initialProviderFailedCount: number;
  initialProviderManaged: boolean;
  initialScheduledAt: string;
  draftsListHref: string;
}

const AUTOSAVE_MS = 800;
const PREVIEW_MS = 350;
const LARGE_AUDIENCE_THRESHOLD = 500;
const PACED_BATCH_SIZE = 100;
const WORKER_LOOP_SLEEP_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function fallbackNameFromEmail(email: string): string {
  const localPart = normalizeEmail(email).split("@")[0] ?? "there";
  const cleaned = localPart.replace(/[._+-]+/g, " ").trim();
  if (!cleaned) return "there";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseCustomEmailsForEditor(text: string): {
  validEmails: string[];
  invalidEmails: string[];
  sample: Array<{ email: string; name: string; names: string[] }>;
} {
  const tokens = text
    .split(/[\s,;]+/g)
    .map((value) => value.trim())
    .filter(Boolean);

  const validEmails: string[] = [];
  const invalidEmails: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeEmail(token);
    if (!isValidEmail(normalized)) {
      invalidEmails.push(token);
      continue;
    }
    if (!validEmails.includes(normalized)) validEmails.push(normalized);
  }

  return {
    validEmails,
    invalidEmails,
    sample: validEmails.slice(0, 5).map((email) => ({
      email,
      name: fallbackNameFromEmail(email),
      names: [fallbackNameFromEmail(email)],
    })),
  };
}

function noticeClasses(tone: DeliveryNoticeTone): string {
  if (tone === "success") {
    return "border-emerald-900/60 bg-emerald-950/30 text-emerald-200";
  }
  if (tone === "warning") {
    return "border-amber-900/60 bg-amber-950/30 text-amber-200";
  }
  if (tone === "error") {
    return "border-red-900/60 bg-red-950/40 text-red-200";
  }
  return "border-sky-900/60 bg-sky-950/30 text-sky-200";
}

function buildDeliveryNotice(result: CampaignDeliveryActionSuccess): DeliveryNotice {
  const title =
    result.mode === "scheduled"
      ? "Scheduled send queued."
      : result.mode === "paced"
        ? "Paced send queued."
        : result.outcome === "failed"
          ? "Send finished with failures."
          : result.outcome === "partial"
            ? "Send finished with partial delivery."
            : result.outcome === "processing"
              ? "Send is still processing."
              : "Send finished.";
  const tone: DeliveryNoticeTone =
    result.outcome === "failed"
      ? "error"
      : result.outcome === "partial"
        ? "warning"
        : result.outcome === "processing" || result.outcome === "queued"
          ? "info"
          : "success";

  return {
    tone,
    title,
    detail: result.message,
    nextEligibleAt: result.nextEligibleAt,
    firstError: result.firstError,
    sentDetailHref: result.sentDetailHref,
  };
}

export default function CampaignEditor(props: CampaignEditorProps) {
  const [title, setTitle] = useState(props.initialTitle);
  const [sourceKind, setSourceKind] = useState<CampaignSourceKind>(props.initialSourceKind);
  const [series, setSeries] = useState<CampaignTargetSeries>(props.initialSeries);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(props.initialIncludeUnsubscribe);
  const [audienceScope, setAudienceScope] = useState<CampaignAudienceScope>(props.initialAudienceScope);
  const [dedupeMode, setDedupeMode] = useState<CampaignDedupeMode>(props.initialDedupeMode);
  const [personalizationMode, setPersonalizationMode] =
    useState<CampaignPersonalizationMode>(props.initialPersonalizationMode);
  const [customEmailsText, setCustomEmailsText] = useState(props.initialCustomEmailsText);
  const [subject, setSubject] = useState(props.initialSubject);
  const [bodyText, setBodyText] = useState(props.initialBodyText);
  const [previewHtml, setPreviewHtml] = useState(props.initialPreviewHtml);
  const [recipientCount, setRecipientCount] = useState(props.initialRecipientCount);
  const [recipientSample, setRecipientSample] = useState(props.initialRecipientSample);
  const [blockedRecipients, setBlockedRecipients] = useState(props.initialBlockedRecipients);
  const [recipientEstimateDirty, setRecipientEstimateDirty] = useState(
    props.initialRecipientEstimateDirty,
  );
  const [schedule, setSchedule] = useState(false);
  const [scheduledAtInput, setScheduledAtInput] = useState(props.initialScheduledAt);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [deliveryNotice, setDeliveryNotice] = useState<DeliveryNotice | null>(null);
  const [deliveryActionBusy, setDeliveryActionBusy] = useState<null | "send" | "queue" | "worker">(null);
  const [estimateError, setEstimateError] = useState<string | null>(props.initialEstimateError);
  const [deliveryAttempts, setDeliveryAttempts] = useState<DeliveryAttemptView[]>([]);
  const [workerResult, setWorkerResult] = useState<string | null>(null);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [deliveryState, setDeliveryState] = useState<DeliveryStateView>({
    batches: props.initialDeliveryBatches,
    deliveryPausedAt: props.initialDeliveryPausedAt,
    deliveryCanceledAt: props.initialDeliveryCanceledAt,
    deliveryWarning: props.initialDeliveryWarning,
    providerScheduledAt: props.initialProviderScheduledAt,
    providerScheduledCount: props.initialProviderScheduledCount,
    providerFailedCount: props.initialProviderFailedCount,
    providerManaged: props.initialProviderManaged,
  });

  const dirtyRef = useRef(false);
  const mountedRef = useRef(true);
  const latestRef = useRef({
    title,
    sourceKind,
    series,
    includeUnsubscribe,
    audienceScope,
    dedupeMode,
    personalizationMode,
    customEmailsText,
    subject,
    bodyText,
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    latestRef.current = {
      title,
      sourceKind,
      series,
      includeUnsubscribe,
      audienceScope,
      dedupeMode,
      personalizationMode,
      customEmailsText,
      subject,
      bodyText,
    };
  }, [
    title,
    sourceKind,
    series,
    includeUnsubscribe,
    audienceScope,
    dedupeMode,
    personalizationMode,
    customEmailsText,
    subject,
    bodyText,
  ]);

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

  const refreshPreview = useCallback(async (options?: { hydrateLiveStats?: boolean }) => {
    const html = await renderCampaignPreviewAction(props.campaignId, {
      subject: latestRef.current.subject,
      bodyText: latestRef.current.bodyText,
    }, options);
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

  const onRefreshPreview = async () => {
    setPreviewError(null);
    setPreviewRefreshing(true);
    try {
      const saved = await flushSave();
      if (!saved) {
        setPreviewError("Draft save failed. Fix the save error above and refresh preview again.");
        return;
      }
      await refreshPreview({ hydrateLiveStats: true });
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : String(error));
    } finally {
      setPreviewRefreshing(false);
    }
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
      setRecipientCount(0);
      setRecipientSample([]);
      setBlockedRecipients([]);
      setEstimateError(result.error);
      return;
    }
    setRecipientCount(result.count);
    setRecipientSample(result.sample);
    setBlockedRecipients(result.blocked);
    setRecipientEstimateDirty(false);
    await refreshPreview({ hydrateLiveStats: true });
  };

  const markRecipientsStale = () => {
    setRecipientEstimateDirty(true);
    setRecipientCount(0);
    setRecipientSample([]);
    setBlockedRecipients([]);
  };

  const hasSeriesSelection = Boolean(series.trim());
  const instantCustomRecipients = sourceKind === "custom_emails" && !hasSeriesSelection;
  const localCustomEstimate = parseCustomEmailsForEditor(customEmailsText);
  const showWaitlistControls = sourceKind === "zn_waitlist";
  const showSeriesControls =
    sourceKind === "email_subscribers" || sourceKind === "custom_emails";
  const showCustomEmailControls = sourceKind === "custom_emails";
  const showSelectedWaitlistEmailControls =
    sourceKind === "zn_waitlist" && audienceScope === "selected_emails";
  const showDedupeControls = sourceKind === "zn_waitlist";
  const unsubscribeAvailable =
    sourceKind !== "custom_emails" || hasSeriesSelection;
  const sourceDescription =
    sourceKind === "zn_waitlist"
      ? audienceScope === "selected_emails"
        ? "Send only to the entered waitlist emails. Waitlist personalization and tokens still apply."
        : "Start from waitlist rows. Audience and dedupe apply exactly as selected."
      : sourceKind === "email_subscribers"
        ? "Send to all active subscribers in the selected series."
        : hasSeriesSelection
          ? "Send to the exact entered emails and associate them with this email series."
          : "Send to the exact entered emails as a one-off message.";

  const blockedReasonLabel: Record<CampaignBlockedReason, string> = {
    invalid_email: "invalid email",
    not_subscribed: "not subscribed",
    unsubscribed: "unsubscribed",
    unconfirmed: "unconfirmed",
    not_on_waitlist: "not on waitlist",
  };
  const effectiveRecipientCount = instantCustomRecipients
    ? localCustomEstimate.validEmails.length
    : recipientCount;
  const effectiveRecipientSample = instantCustomRecipients
    ? localCustomEstimate.sample
    : recipientSample;
  const effectiveRecipientEstimateDirty = instantCustomRecipients ? false : recipientEstimateDirty;
  const hasLocalInvalidCustomEmails =
    instantCustomRecipients && localCustomEstimate.invalidEmails.length > 0;
  const canAttemptSend =
    sourceKind !== "custom_emails" || localCustomEstimate.validEmails.length > 0;
  const isLargeAudience =
    !effectiveRecipientEstimateDirty && effectiveRecipientCount >= LARGE_AUDIENCE_THRESHOLD;
  const estimatedBatchCount =
    !effectiveRecipientEstimateDirty && effectiveRecipientCount > 0
      ? Math.ceil(effectiveRecipientCount / PACED_BATCH_SIZE)
      : null;
  const currentBatch =
    deliveryState.batches.find((batch) => batch.status === "sending") ??
    deliveryState.batches.find((batch) => batch.status === "pending") ??
    null;
  const totalBatchSent = deliveryState.batches.reduce(
    (sum, batch) => sum + batch.sentCount,
    0,
  );
  const totalBatchFailed = deliveryState.batches.reduce(
    (sum, batch) => sum + batch.failedCount,
    0,
  );
  const deliveryPaused = Boolean(deliveryState.deliveryPausedAt);
  const deliveryCanceled = Boolean(deliveryState.deliveryCanceledAt);
  const hasDeliveryBatches = deliveryState.batches.length > 0;
  const hasProviderManagedSchedule = deliveryState.providerManaged;
  const deliveryAvailable = !deliveryState.deliveryWarning;
  const easternZoneLabel = getEasternTimeZoneLabel();
  const deliveryActionPending = deliveryActionBusy !== null;
  const deliveryMutationPending =
    deliveryActionBusy === "send" || deliveryActionBusy === "queue";
  const workerRunning = deliveryActionBusy === "worker";
  const previewPending = previewRefreshing || deliveryMutationPending;
  const singleBatchAudience =
    !effectiveRecipientEstimateDirty && effectiveRecipientCount > 0 && effectiveRecipientCount <= PACED_BATCH_SIZE;

  const applyDeliveryState = (next: DeliveryStateView) => {
    setDeliveryState(next);
  };

  const refreshDeliveryState = useCallback(async () => {
    const result = await getCampaignDeliveryStateAction(props.campaignId);
    if (result.ok && mountedRef.current) applyDeliveryState(result.delivery);
  }, [props.campaignId]);

  const refreshDeliveryDiagnostics = useCallback(async () => {
    const result = await getCampaignDeliveryDiagnosticsAction(props.campaignId);
    if (!mountedRef.current) return;
    if (result.ok) {
      applyDeliveryState(result.delivery);
      setDeliveryAttempts(result.attempts);
      setWorkerError(result.latestError);
    }
  }, [props.campaignId]);

  const scheduleRefreshes = useCallback(() => {
    window.setTimeout(() => {
      void refreshDeliveryDiagnostics();
    }, 1500);
    window.setTimeout(() => {
      void refreshDeliveryDiagnostics();
    }, 5000);
  }, [refreshDeliveryDiagnostics]);

  useEffect(() => {
    void refreshDeliveryDiagnostics();
  }, [refreshDeliveryDiagnostics]);

  const runWorkerUntilIdle = useCallback(
    async (options?: { queued?: boolean }) => {
      setSendError(null);
      setWorkerError(null);
      setWorkerResult(null);
      setDeliveryActionBusy("worker");
      setDeliveryNotice({
        tone: "info",
        title: options?.queued ? "Running paced delivery..." : "Running delivery worker...",
        detail: options?.queued
          ? "Processing eligible queued batches from this browser until the worker goes idle."
          : "Processing eligible batches from this browser until the worker goes idle.",
      });

      try {
        while (mountedRef.current) {
          let result: CampaignWorkerResponse;

          try {
            const response = await fetch("/api/campaign-worker", {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({ campaignId: props.campaignId }),
            });
            result = (await response.json()) as CampaignWorkerResponse;
            if (!response.ok) {
              throw new Error(result.error || `Worker request failed with status ${response.status}.`);
            }
          } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            if (mountedRef.current) {
              setWorkerResult("Worker request failed before a batch could be processed.");
              setWorkerError(detail);
              setDeliveryNotice({
                tone: "error",
                title: "Worker run failed.",
                detail,
              });
            }
            await refreshDeliveryDiagnostics();
            return;
          }

          await refreshDeliveryDiagnostics();

          if (!result.ok) {
            if (mountedRef.current) {
              setWorkerResult("Worker returned ok=false.");
              setWorkerError(result.error || "The worker returned ok=false.");
              setDeliveryNotice({
                tone: "error",
                title: "Worker run failed.",
                detail: result.error || "The worker returned ok=false.",
              });
            }
            return;
          }

          if (!result.processed) {
            if (mountedRef.current) {
              setWorkerResult(
                "Worker is idle. No eligible batches remained for this campaign.",
              );
              setDeliveryNotice((current) => ({
                tone: "success",
                title: "Worker is idle.",
                detail: "No more eligible batches were available for this campaign.",
                nextEligibleAt: current?.nextEligibleAt ?? currentBatch?.nextEligibleAt ?? null,
                firstError: current?.firstError ?? null,
                sentDetailHref: current?.sentDetailHref ?? `/admin/campaigns/sent/${props.campaignId}`,
              }));
            }
            return;
          }

          if (result.status === "failed") {
            if (mountedRef.current) {
              setWorkerResult(
                `Worker processed a batch but it failed${result.batchId ? ` (${result.batchId})` : ""}.`,
              );
              setDeliveryNotice({
                tone: "error",
                title: "A batch failed during worker processing.",
                detail: "Worker processing stopped after a failed batch. Review send attempts for details.",
                sentDetailHref: `/admin/campaigns/sent/${props.campaignId}`,
              });
            }
            return;
          }

          if (mountedRef.current) {
            const processedCount = result.processedCount ?? 1;
            const finalStatus = result.lastStatus ?? result.status ?? "sent";
            setWorkerResult(
              `Worker processed ${processedCount} batch${processedCount === 1 ? "" : "es"}; latest status ${finalStatus}.`,
            );
            setDeliveryNotice({
              tone: "info",
              title: "Worker processed a batch.",
              detail: "Checking for more eligible batches...",
              sentDetailHref: `/admin/campaigns/sent/${props.campaignId}`,
            });
          }

          await sleep(WORKER_LOOP_SLEEP_MS);
        }
      } finally {
        if (mountedRef.current) setDeliveryActionBusy(null);
      }
    },
    [currentBatch?.nextEligibleAt, props.campaignId, refreshDeliveryState],
  );

  const onSend = async () => {
    setSendError(null);
    setWorkerResult(null);
    setWorkerError(null);
    setDeliveryActionBusy("send");
    setDeliveryNotice({
      tone: "info",
      title: schedule ? "Queueing scheduled send..." : "Sending now...",
      detail: schedule
        ? `Scheduling per-recipient delivery with Resend in America/New_York (${easternZoneLabel}).`
        : "Creating delivery batches and attempting delivery right now.",
    });
    try {
      const saved = await flushSave();
      if (!saved) {
        setDeliveryNotice({
          tone: "error",
          title: "Draft save failed.",
          detail: "Fix the save error above and try the send again.",
        });
        return;
      }
      const iso = schedule && scheduledAtInput
        ? easternDateTimeInputToIso(scheduledAtInput)
        : null;
      if (schedule && scheduledAtInput && !iso) {
        setDeliveryNotice({
          tone: "error",
          title: "Invalid scheduled time.",
          detail: `Enter a valid ${easternZoneLabel} date and time.`,
        });
        return;
      }
      const result = await sendCampaignAction(
        props.campaignId,
        schedule ? { scheduledAt: iso } : undefined,
      );
      if (!result.ok) {
        setDeliveryNotice({
          tone: "error",
          title: schedule ? "Scheduled send was not queued." : "Send failed.",
          detail: result.error,
        });
        return;
      }
      setDeliveryNotice(buildDeliveryNotice(result));
      applyDeliveryState(result.delivery);
      await refreshDeliveryDiagnostics();
      if (!schedule && result.mode === "immediate") {
        await runWorkerUntilIdle();
      } else {
        scheduleRefreshes();
      }
    } finally {
      if (mountedRef.current) setDeliveryActionBusy(null);
    }
  };

  const onQueue = async () => {
    setSendError(null);
    setWorkerResult(null);
    setWorkerError(null);
    setDeliveryActionBusy("queue");
    setDeliveryNotice({
      tone: "info",
      title: "Queueing paced send...",
      detail: "Creating paced delivery batches. Use the worker control to advance batches while keeping pause and cancel available.",
    });
    try {
      const saved = await flushSave();
      if (!saved) {
        setDeliveryNotice({
          tone: "error",
          title: "Draft save failed.",
          detail: "Fix the save error above and try queueing again.",
        });
        return;
      }
      const iso = schedule && scheduledAtInput
        ? easternDateTimeInputToIso(scheduledAtInput)
        : null;
      if (schedule && scheduledAtInput && !iso) {
        setDeliveryNotice({
          tone: "error",
          title: "Invalid scheduled time.",
          detail: `Enter a valid ${easternZoneLabel} date and time.`,
        });
        return;
      }
      const result = await queueCampaignAction(
        props.campaignId,
        schedule ? { scheduledAt: iso } : undefined,
      );
      if (!result.ok) {
        setDeliveryNotice({
          tone: "error",
          title: "Paced send was not queued.",
          detail: result.error,
        });
        return;
      }
      setDeliveryNotice(buildDeliveryNotice(result));
      applyDeliveryState(result.delivery);
      await refreshDeliveryDiagnostics();
      scheduleRefreshes();
    } finally {
      if (mountedRef.current) setDeliveryActionBusy(null);
    }
  };

  const onPause = async () => {
    const result = await pauseCampaignAction(props.campaignId);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    applyDeliveryState(result.delivery);
  };

  const onResume = async () => {
    const result = await resumeCampaignAction(props.campaignId);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    applyDeliveryState(result.delivery);
  };

  const onCancel = async () => {
    const result = await cancelCampaignAction(props.campaignId);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    applyDeliveryState(result.delivery);
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
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-zinc-300">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Source</span>
              <select
                value={sourceKind}
                onChange={(event) => {
                  const nextSourceKind = event.target.value as CampaignSourceKind;
                  setSourceKind(nextSourceKind);
                  if (nextSourceKind === "zn_waitlist") {
                    setIncludeUnsubscribe(false);
                  } else if (nextSourceKind === "custom_emails") {
                    setPersonalizationMode("static");
                  } else {
                    setIncludeUnsubscribe(true);
                  }
                  markRecipientsStale();
                  queueAutosave();
                }}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
              >
                <option value="zn_waitlist">zn_waitlist</option>
                <option value="email_subscribers">email_subscribers</option>
                <option value="custom_emails">custom_emails</option>
              </select>
            </label>
            {showSeriesControls ? (
              <label className="flex flex-col gap-1 text-sm text-zinc-300">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Series</span>
                <select
                  value={series}
                  onChange={(event) => {
                    setSeries(event.target.value);
                    markRecipientsStale();
                    queueAutosave();
                  }}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                >
                  {showCustomEmailControls ? <option value="">No series</option> : null}
                  {props.initialSeriesOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {showWaitlistControls ? (
              <label className="flex flex-col gap-1 text-sm text-zinc-300">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Audience</span>
                <select
                  value={audienceScope}
                  onChange={(event) => {
                    setAudienceScope(event.target.value as CampaignAudienceScope);
                    markRecipientsStale();
                    queueAutosave();
                  }}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                >
                  <option value="verified_only">verified_only</option>
                  <option value="all_rows">all_rows</option>
                  <option value="verified_newsletter">verified_newsletter</option>
                  <option value="selected_emails">selected_emails</option>
                </select>
              </label>
            ) : null}
            {showDedupeControls ? (
              <label className="flex flex-col gap-1 text-sm text-zinc-300">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Dedupe</span>
                <select
                  value={dedupeMode}
                  onChange={(event) => {
                    setDedupeMode(event.target.value as CampaignDedupeMode);
                    markRecipientsStale();
                    queueAutosave();
                  }}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500"
                >
                  <option value="one_per_email">one_per_email</option>
                  <option value="one_per_row">one_per_row</option>
                </select>
              </label>
            ) : null}
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-500">{sourceDescription}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
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
          <div
            className={`self-end rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm ${
              unsubscribeAvailable ? "text-zinc-300" : "cursor-not-allowed opacity-60 text-zinc-500"
            }`}
          >
            <label
              className={`flex items-center gap-2 ${
                unsubscribeAvailable ? "" : "cursor-not-allowed text-zinc-500"
              }`}
            >
              <input
                type="checkbox"
                checked={unsubscribeAvailable ? includeUnsubscribe : false}
                disabled={!unsubscribeAvailable}
                onChange={(event) => {
                  setIncludeUnsubscribe(event.target.checked);
                  queueAutosave();
                  queuePreview();
                }}
                className="accent-amber-500 disabled:cursor-not-allowed"
              />
              Include unsubscribe footer
              {!unsubscribeAvailable ? (
                <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                  Disabled
                </span>
              ) : null}
            </label>
            {!unsubscribeAvailable ? (
              <div className="mt-2 text-xs text-zinc-500">
                Unavailable for one-off custom sends. Unsubscribe links require a
                series-backed subscriber context.
              </div>
            ) : null}
            {unsubscribeAvailable ? (
              <a
                href="/internal/unsubscribe-preview"
                target="_blank"
                rel="noreferrer"
                className="mt-2 block text-xs text-amber-400 hover:text-amber-300"
              >
                Preview email preferences page
              </a>
            ) : null}
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
            <div className="font-semibold uppercase tracking-wide text-zinc-500">Tokens</div>
            <div>{`{{name}} {{referral_code}} {{referral_url}} {{dashboard_url}} {{human_referral_code}} {{human_referral_url}} {{human_dashboard_url}} {{direct_referrals}} {{indirect_referrals}} {{attributed_referrals}} {{referrals_24h_count}} {{referrals_24h_growth_pct}} {{referrals_7d_count}} {{referrals_7d_growth_pct}} {{referrals_30d_count}} {{referrals_30d_growth_pct}} {{depth_1_referrals}} {{depth_2_referrals}} {{depth_3_referrals}} {{leaderboard_rank}} {{waitlist_position}} {{waitlist_total}} {{max_referral_depth}} {{potential_rewards}} {{root_badge}} {{commission_unlocked}} {{referrals_unlocked}}`}</div>
            <div className="mt-2 text-[11px] text-zinc-500">
              Referral, dashboard, and stat tokens are meaningful only for <code>zn_waitlist</code>. Scheduled sends refresh stat values at actual send time.
            </div>
          </div>
        </div>
        {showCustomEmailControls ? (
          <label className="mt-3 flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Custom emails
            </span>
            <textarea
              value={customEmailsText}
              onChange={(event) => {
                setCustomEmailsText(event.target.value);
                markRecipientsStale();
                queueAutosave();
              }}
              rows={5}
              placeholder={"zcashug@gmail.com\nteam@example.org"}
              className="resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
            <span className="text-xs text-zinc-500">
              {hasSeriesSelection
                ? "One or many emails. Missing subscriber rows for this series will be created automatically, but already unsubscribed rows will be blocked."
                : "One or many emails. This one-off send goes only to the entered addresses."}
            </span>
          </label>
        ) : null}
        {showSelectedWaitlistEmailControls ? (
          <label className="mt-3 flex flex-col gap-1 text-sm text-zinc-300">
            <span className="text-xs uppercase tracking-wide text-zinc-500">
              Waitlist emails
            </span>
            <textarea
              value={customEmailsText}
              onChange={(event) => {
                setCustomEmailsText(event.target.value);
                markRecipientsStale();
                queueAutosave();
              }}
              rows={5}
              placeholder={"zcashug@gmail.com\nteam@example.org"}
              className="resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-amber-500"
            />
            <span className="text-xs text-zinc-500">
              One or many waitlist emails. Only matching waitlist rows will be targeted.
            </span>
          </label>
        ) : null}
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
                disabled={deliveryActionPending}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh recipients
              </button>
              <button
                type="button"
                onClick={onRefreshPreview}
                disabled={previewPending}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {previewRefreshing ? "Refreshing preview..." : "Refresh preview"}
              </button>
              <button
                type="button"
                onClick={onCopy}
                disabled={deliveryActionPending}
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
          {previewError && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Preview refresh failed: {previewError}
            </p>
          )}
          {hasLocalInvalidCustomEmails && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Invalid custom emails: {localCustomEstimate.invalidEmails.join(", ")}
            </p>
          )}
          {sendError && (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Action failed: {sendError}
            </p>
          )}
          {deliveryState.deliveryWarning ? (
            <p className="rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              {deliveryState.deliveryWarning}
            </p>
          ) : null}
          {isLargeAudience && estimatedBatchCount ? (
            <p className="rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
              Large audience: {effectiveRecipientCount} recipients across about {estimatedBatchCount} paced batches.
              Immediate send is allowed, but queued delivery is recommended.
            </p>
          ) : null}
          {singleBatchAudience && !schedule ? (
            <p className="rounded-md border border-sky-900/60 bg-sky-950/30 px-3 py-2 text-sm text-sky-200">
              Single-batch audience: use <strong>Send now</strong>. Paced send adds queue/worker overhead without providing control benefits here.
            </p>
          ) : null}
          {workerResult ? (
            <p className="rounded-md border border-sky-900/60 bg-sky-950/30 px-3 py-2 text-sm text-sky-200">
              Worker result: {workerResult}
            </p>
          ) : null}
          {workerError ? (
            <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              Last worker error: {workerError}
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-zinc-500">Recipients</div>
                <div className="text-2xl font-semibold text-zinc-100">
                  {effectiveRecipientEstimateDirty ? "?" : effectiveRecipientCount}
                </div>
              </div>
              <a href={props.draftsListHref} className="text-sm text-amber-400 hover:text-amber-300">
                Back to drafts
              </a>
            </div>
            <div className="mt-3 space-y-2 text-sm text-zinc-300">
              {effectiveRecipientEstimateDirty ? (
                <p className="text-zinc-500">Refresh recipients to resolve the current audience.</p>
              ) : null}
              {!effectiveRecipientEstimateDirty && effectiveRecipientSample.length === 0 ? (
                <p className="text-zinc-500">No recipients resolved yet.</p>
              ) : (
                effectiveRecipientSample.map((sample) => (
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
            {(showCustomEmailControls && hasSeriesSelection) || showSelectedWaitlistEmailControls ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Blocked</div>
                <div className="mt-2 space-y-2 text-sm text-zinc-300">
                  {blockedRecipients.length === 0 ? (
                    <p className="text-zinc-500">
                      {showSelectedWaitlistEmailControls
                        ? "All entered waitlist emails matched."
                        : "No blocked custom emails."}
                    </p>
                  ) : (
                    blockedRecipients.map((recipient) => (
                      <div
                        key={`${recipient.email}-${recipient.reason}`}
                        className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2"
                      >
                        <div className="text-xs text-zinc-300">{recipient.email}</div>
                        <div className="text-xs text-red-300">{blockedReasonLabel[recipient.reason]}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </section>

          {hasDeliveryBatches ? (
            <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Delivery progress</div>
              <div className="mt-3 grid gap-3 text-sm text-zinc-300">
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Batches</div>
                  <div className="text-zinc-100">
                    {currentBatch ? `${currentBatch.batchNumber} / ${deliveryState.batches.length}` : deliveryState.batches.length}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Sent</div>
                  <div className="text-zinc-100">{totalBatchSent}</div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Failed</div>
                  <div className="text-zinc-100">{totalBatchFailed}</div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Next eligible</div>
                  <div className="text-zinc-100">
                    {currentBatch?.nextEligibleAt
                      ? formatEasternDateTime(currentBatch.nextEligibleAt)
                      : "-"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deliveryCanceled ? (
                    <span className="rounded border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs text-red-300">
                      Delivery canceled
                    </span>
                  ) : deliveryPaused ? (
                    <button
                      type="button"
                      onClick={onResume}
                      disabled={deliveryMutationPending}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
                    >
                      Resume delivery
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onPause}
                      disabled={deliveryMutationPending}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
                    >
                      Pause delivery
                    </button>
                  )}
                  {!deliveryCanceled ? (
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={deliveryMutationPending}
                      className="rounded-md border border-red-900/60 px-3 py-1.5 text-sm text-red-300 disabled:opacity-50"
                    >
                      Cancel remaining batches
                    </button>
                  ) : null}
                    <button
                      type="button"
                      onClick={() => void runWorkerUntilIdle()}
                    disabled={
                      deliveryMutationPending ||
                      workerRunning ||
                      deliveryPaused ||
                      deliveryCanceled ||
                      hasProviderManagedSchedule
                    }
                    className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 disabled:opacity-50"
                  >
                    {deliveryActionBusy === "worker" ? "Running worker..." : "Run worker until idle"}
                  </button>
                </div>
                {deliveryAttempts.length > 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                    <div className="text-xs text-zinc-500">Recent attempts</div>
                    <div className="mt-2 space-y-2 text-xs text-zinc-300">
                      {deliveryAttempts.slice(0, 5).map((attempt) => (
                        <div key={attempt.id} className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-zinc-200">{attempt.email}</div>
                            <div className="text-zinc-500">
                              {attempt.scheduledFor
                                ? formatEasternDateTime(attempt.scheduledFor)
                                : formatEasternDateTime(attempt.attemptedAt)}
                            </div>
                          </div>
                          <div className={attempt.error ? "text-red-300 text-right" : "text-zinc-400 text-right"}>
                            <div>{attempt.status}</div>
                            {attempt.error ? <div>{attempt.error}</div> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!hasDeliveryBatches && hasProviderManagedSchedule ? (
            <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="text-xs uppercase tracking-wide text-zinc-500">Scheduled delivery</div>
              <div className="mt-3 grid gap-3 text-sm text-zinc-300">
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Scheduled for</div>
                  <div className="text-zinc-100">
                    {deliveryState.providerScheduledAt
                      ? formatEasternDateTime(deliveryState.providerScheduledAt)
                      : "-"}
                  </div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Accepted</div>
                  <div className="text-zinc-100">{deliveryState.providerScheduledCount}</div>
                </div>
                <div className="rounded border border-zinc-800 bg-zinc-950/50 px-3 py-2">
                  <div className="text-xs text-zinc-500">Failed before scheduling</div>
                  <div className="text-zinc-100">{deliveryState.providerFailedCount}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {deliveryCanceled ? (
                    <span className="rounded border border-red-900/60 bg-red-950/40 px-3 py-1 text-xs text-red-300">
                      Delivery canceled
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={deliveryMutationPending}
                      className="rounded-md border border-red-900/60 px-3 py-1.5 text-sm text-red-300 disabled:opacity-50"
                    >
                      Cancel scheduled delivery
                    </button>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={schedule}
                disabled={!deliveryAvailable}
                onChange={(event) => setSchedule(event.target.checked)}
                className="accent-amber-500"
              />
              Schedule instead of send now
            </label>
            <p className="mt-2 text-xs text-zinc-500">
              All scheduled times use America/New_York ({easternZoneLabel}).
            </p>
            {schedule && (
              <label className="mt-3 flex flex-col gap-1 text-sm text-zinc-300">
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  Schedule time ({easternZoneLabel})
                </span>
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
              disabled={
                deliveryActionPending ||
                !deliveryAvailable ||
                !canAttemptSend ||
                hasLocalInvalidCustomEmails
              }
              className="mt-4 w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deliveryActionBusy === "send"
                ? schedule
                  ? "Queueing scheduled send..."
                  : "Sending..."
                : schedule
                  ? "Queue scheduled send"
                  : "Send now"}
            </button>
            {!schedule ? (
              singleBatchAudience ? null : (
                <button
                  type="button"
                  onClick={onQueue}
                  disabled={
                    deliveryActionPending ||
                    !deliveryAvailable ||
                    !canAttemptSend ||
                    hasLocalInvalidCustomEmails
                  }
                  className="mt-2 w-full rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deliveryActionBusy === "queue" ? "Queueing paced send..." : "Queue paced send"}
                </button>
              )
            ) : null}
            {deliveryNotice ? (
              <div className={`mt-3 rounded-md border px-3 py-3 text-sm ${noticeClasses(deliveryNotice.tone)}`}>
                <div className="font-medium">{deliveryNotice.title}</div>
                <p className="mt-1 text-sm/6">{deliveryNotice.detail}</p>
                {deliveryNotice.nextEligibleAt ? (
                  <p className="mt-1 text-xs">
                    {schedule || hasProviderManagedSchedule ? "Scheduled for" : "Next eligible batch"}:{" "}
                    {formatEasternDateTime(deliveryNotice.nextEligibleAt)}
                  </p>
                ) : null}
                {deliveryNotice.firstError ? (
                  <p className="mt-1 text-xs">First error: {deliveryNotice.firstError}</p>
                ) : null}
                {deliveryNotice.sentDetailHref ? (
                  <a
                    href={deliveryNotice.sentDetailHref}
                    className="mt-2 inline-block text-xs font-medium text-amber-300 hover:text-amber-200"
                  >
                    Open send attempts
                  </a>
                ) : null}
              </div>
            ) : null}
            <p className="mt-3 text-xs text-zinc-500">
              Immediate sends run the worker from this browser. Paced queues create batches and leave pause, cancel, and manual worker control available. Scheduled sends are handed off to Resend immediately and delivered at the selected time.
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Scheduled times are always America/New_York ({easternZoneLabel}). Worker controls apply only to immediate and paced batch delivery.
            </p>
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
