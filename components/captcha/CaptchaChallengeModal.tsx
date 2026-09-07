"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { getSvgCaptchaChallenge } from "@/lib/captcha/actions";

export type CaptchaSolution = {
  captcha_token: string;
  captcha_answer: string;
};

type CaptchaChallengeModalProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  /** True while the parent is finishing the real submission after captcha. */
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: (solution: CaptchaSolution) => void | Promise<void>;
  getChallenge?: () => Promise<{ image: string; token: string }>;
  confirmDisabled?: boolean;
};

export default function CaptchaChallengeModal({
  isOpen,
  title = "Confirm you're human",
  description = "Complete this quick check to submit your form.",
  confirmLabel = "Continue",
  submitting = false,
  onCancel,
  onConfirm,
  getChallenge = getSvgCaptchaChallenge,
  confirmDisabled = false,
}: CaptchaChallengeModalProps) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  const workingRef = useRef(false);
  cancelRef.current = onCancel;

  const [challenge, setChallenge] = useState<{ image: string; token: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const busy = loading || confirming || submitting;
  workingRef.current = confirming || submitting;
  const canConfirm = Boolean(challenge?.token) && answer.trim().length > 0 && !busy && !confirmDisabled;

  const loadChallenge = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getChallenge();
      setChallenge(next);
      setAnswer("");
    } catch (error) {
      setChallenge(null);
      setError(error instanceof Error ? error.message : "Could not load the human check. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [getChallenge]);

  useEffect(() => {
    if (!isOpen) {
      setChallenge(null);
      setAnswer("");
      setError(null);
      setConfirming(false);
      return;
    }
    void loadChallenge();
  }, [isOpen, loadChallenge]);

  useEffect(() => {
    if (!isOpen || loading || !challenge) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, loading, challenge]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !workingRef.current) {
        event.preventDefault();
        event.stopPropagation();
        cancelRef.current();
      }
      if (event.key === "Tab") {
        const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)') ?? []);
        const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); dialogRef.current?.focus(); return; }
        const outside = !items.includes(document.activeElement as HTMLElement);
        if (event.shiftKey && (document.activeElement === first || outside)) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && (document.activeElement === last || outside)) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => { document.removeEventListener("keydown", onKeyDown, true); previousFocus?.focus(); };
  }, [isOpen]);

  async function handleConfirm() {
    if (!canConfirm || !challenge) return;
    setConfirming(true);
    setError(null);
    try {
      await onConfirm({
        captcha_token: challenge.token,
        captcha_answer: answer.trim(),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Human check failed. Please try again.";
      await loadChallenge();
      setError(message);
    } finally {
      setConfirming(false);
    }
  }

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={() => {
        if (!submitting && !confirming) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-4 px-6 py-6 sm:px-8 sm:py-7">
          <div className="text-center">
            <h2
              id={titleId}
              className="text-xl font-bold"
              style={{ color: "var(--fg-heading)" }}
            >
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--fg-body)" }}>
              {description}
            </p>
          </div>

          <div
            className="flex flex-col gap-3 rounded-xl px-3 py-3"
            style={{
              background: "transparent",
              border: "1px solid var(--border-muted)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor={inputId}
                className="text-xs font-semibold"
                style={{ color: "var(--fg-muted)" }}
              >
                Type the characters you see
              </label>
              <button
                type="button"
                onClick={() => void loadChallenge()}
                disabled={busy}
                className="cursor-pointer text-xs font-semibold underline disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: "var(--fg-body)" }}
              >
                Refresh
              </button>
            </div>

            <div className="flex items-center gap-3">
              {challenge ? (
                // eslint-disable-next-line @next/next/no-img-element -- captcha is an inline data URL
                <img
                  src={challenge.image}
                  alt="Captcha challenge"
                  width={150}
                  height={50}
                  className="rounded-md"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--border-muted)",
                  }}
                />
              ) : (
                <div
                  className="flex items-center justify-center rounded-md text-xs"
                  style={{
                    width: 150,
                    height: 50,
                    background: "transparent",
                    border: "1px solid var(--border-muted)",
                    color: "var(--fg-muted)",
                  }}
                >
                  {loading ? "Loading…" : "Unavailable"}
                </div>
              )}
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={answer}
                onChange={(event) => {
                  setAnswer(event.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleConfirm();
                  }
                }}
                placeholder="Answer"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={!challenge || busy}
                className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-70"
                style={{
                  background: "transparent",
                  border: "1px solid var(--border-muted)",
                  color: "var(--fg-heading)",
                }}
              />
            </div>
          </div>

          {error ? (
            <p className="text-center text-xs" style={{ color: "var(--home-result-status-negative-fg, #e05252)" }}>
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting || confirming}
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-full border border-border-muted bg-transparent px-5 py-2 text-sm font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border-muted disabled:hover:text-fg-body"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              className="inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-full px-5 py-2 text-center text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
              style={{
                background: "var(--home-result-primary-bg)",
                color: "var(--home-result-primary-fg)",
                boxShadow: "var(--home-result-primary-shadow)",
              }}
            >
              {submitting || confirming ? (
                <AnimatedLoadingLabel label={submitting ? "Submitting" : "Checking"} active />
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
