"use client";

import { useEffect, useRef, useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";
import {
  submitBlogSubscription,
  type SubmitBlogSubscriptionResult,
} from "@/lib/blog-subscribers/subscribers";

type LandingNewsletterSignupProps = {
  buttonLabel?: string;
};

const DEFAULT_BUTTON_LABEL = "Email me";
const ACTION_INSET_PX = 4;

export default function LandingNewsletterSignup({
  buttonLabel = DEFAULT_BUTTON_LABEL,
}: LandingNewsletterSignupProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitBlogSubscriptionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

  const hasInput = email.trim().length > 0;

  useEffect(() => {
    function focusFromHash() {
      if (window.location.hash !== "#newsletter") return;

      const focusInput = () => {
        try {
          inputRef.current?.focus({ preventScroll: true });
        } catch {
          inputRef.current?.focus();
        }
      };

      window.setTimeout(focusInput, 220);
    }

    focusFromHash();
    window.addEventListener("hashchange", focusFromHash);
    return () => window.removeEventListener("hashchange", focusFromHash);
  }, []);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || captchaOpen) return;
    setStatus(null);
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (submitting) return;
    setCaptchaOpen(false);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (submitting) return;

    setSubmitting(true);
    setStatus(null);

    try {
      const result = await submitBlogSubscription({
        email,
        series: ["general"],
        captcha_token: solution.captcha_token,
        captcha_answer: solution.captcha_answer,
      });

      if (result.status === "error") {
        const captchaFailed =
          result.code === "captcha_failed" || result.error.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(result.error);
        }
        setStatus(result);
        setCaptchaOpen(false);
        return;
      }

      setStatus(result);
      setCaptchaOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      if (message.toLowerCase().includes("human check")) {
        throw error instanceof Error ? error : new Error(message);
      }
      setStatus({ status: "error", error: message });
      setCaptchaOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const message =
    status?.status === "error"
      ? status.error
      : status?.status === "submitted" || status?.status === "resent" || status?.status === "already"
        ? status.message
        : null;
  const messageColor =
    status?.status === "error"
      ? "var(--home-result-status-negative-fg)"
      : "var(--home-result-status-positive-fg)";

  const buttonText = submitting
    ? "Sending…"
    : captchaOpen
      ? "Complete check…"
      : buttonLabel;

  return (
    <section id="newsletter" className="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to join the newsletter."
        confirmLabel={buttonLabel}
        submitting={submitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <div className="mb-5 flex justify-center">
        <SectionHeaderPill title="Stay Up-to-date" />
      </div>
      <div
        className="rounded-[24px] border px-5 py-5 sm:px-6 sm:py-6"
        style={{
          borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 58%, transparent), color-mix(in srgb, var(--faq-border) 14%, transparent))",
          boxShadow: "0 18px 38px rgba(0, 0, 0, 0.08)",
        }}
      >
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl">
          <label className="block min-w-0">
            <span className="sr-only">Email</span>
            <span className="relative flex items-center">
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border py-3 pl-4 pr-[7.25rem] text-sm outline-none transition-colors"
                style={{
                  background: "var(--color-bg-elevated, transparent)",
                  borderColor: "var(--faq-border, var(--border-muted))",
                  color: "var(--fg-body)",
                  minHeight: "3rem",
                }}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
              <span
                className="absolute flex items-center"
                style={{
                  top: ACTION_INSET_PX,
                  right: ACTION_INSET_PX,
                  bottom: ACTION_INSET_PX,
                }}
              >
                <button
                  type="submit"
                  disabled={submitting || captchaOpen || !hasInput}
                  className="inline-flex h-[calc(100%-2px)] shrink-0 items-center justify-center rounded-[13px] px-4 text-sm font-semibold leading-none transition"
                  style={{
                    background: hasInput && !submitting && !captchaOpen
                      ? "var(--home-result-primary-bg)"
                      : "color-mix(in srgb, var(--leaders-card-border, var(--border-muted)) 22%, transparent)",
                    color: hasInput && !submitting && !captchaOpen
                      ? "var(--home-result-primary-fg)"
                      : "var(--fg-muted)",
                    boxShadow: hasInput && !submitting && !captchaOpen
                      ? "var(--home-result-primary-shadow)"
                      : "none",
                    cursor: submitting ? "progress" : hasInput ? "pointer" : "not-allowed",
                    opacity: submitting || captchaOpen ? 0.7 : 1,
                  }}
                >
                  {buttonText}
                </button>
              </span>
            </span>
          </label>

          {message ? (
            <p
              className="mt-3 text-center text-sm font-medium"
              style={{ color: messageColor }}
            >
              {message}
            </p>
          ) : null}

          <p
            className="mt-3 text-center text-xs"
            style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}
          >
            We will email a confirmation link before sending updates.
          </p>
        </form>
      </div>
    </section>
  );
}
