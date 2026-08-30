"use client";

import { useEffect, useRef, useState } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import LandingActionLink from "@/components/landing/LandingActionLink";
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

function ManagePreferencesLink() {
  return (
    <LandingActionLink
      proximityId="manage-newsletter-preferences-link"
      href="/unsubscribe"
      label="Manage Preferences"
      variant="text"
      showArrow
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <path d="M5 7h14M5 17h14M9 7a2 2 0 1 0-4 0 2 2 0 0 0 4 0ZM19 17a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      }
    />
  );
}

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
    <section id="newsletter" className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6 sm:pb-28">
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to join the newsletter."
        confirmLabel={buttonLabel}
        submitting={submitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <div className="mb-6 text-center">
        <SectionHeaderPill title="Newsletter" variant="pill" />
      </div>
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
                  background: "transparent",
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

      <div className="mt-5 flex justify-center">
        <ManagePreferencesLink />
      </div>
    </section>
  );
}
