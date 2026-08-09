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

export default function LandingNewsletterSignup({
  buttonLabel = DEFAULT_BUTTON_LABEL,
}: LandingNewsletterSignupProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<SubmitBlogSubscriptionResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);

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
        <SectionHeaderPill title="Newsletter" />
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-w-0 flex-1 rounded-[18px] border px-4 py-3 text-sm outline-none transition-colors"
              style={{
                background: "transparent",
                borderColor: "var(--border-muted)",
                color: "var(--fg-body)",
              }}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <button
              type="submit"
              disabled={submitting || captchaOpen}
              className="rounded-[18px] px-5 py-3 text-sm font-semibold transition-opacity"
              style={{
                background: "var(--home-result-primary-bg)",
                color: "var(--home-result-primary-fg)",
                boxShadow: "var(--home-result-primary-shadow)",
                opacity: submitting || captchaOpen ? 0.7 : 1,
                cursor: submitting ? "progress" : "pointer",
              }}
            >
              {submitting ? "Sending..." : captchaOpen ? "Complete check…" : buttonLabel}
            </button>
          </div>

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
