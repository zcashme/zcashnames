"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import {
  getEmailAddressValidationMessage,
  normalizeEmailAddress,
} from "@/lib/email-address";

type ResendReservationResponse =
  | { ok: true; status: "accepted"; message: string }
  | {
      ok: false;
      status: "invalid_email" | "error";
      message: string;
      code?: string;
    };

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M14 3h7v7" />
      <path d="M10 14 21 3" />
      <path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" />
    </svg>
  );
}

export default function WaitlistReservationResendForm({
  showFooter = true,
}: {
  showFooter?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"accepted" | "invalid_email" | "error" | null>(null);

  const validationMessage = useMemo(
    () => getEmailAddressValidationMessage(email),
    [email],
  );
  const emailIsValid = !validationMessage && normalizeEmailAddress(email).length > 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailIsValid || submitting || captchaOpen) return;

    setMessage("");
    setStatus(null);
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (submitting) return;
    setCaptchaOpen(false);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (!emailIsValid || submitting) return;

    setSubmitting(true);
    setMessage("");
    setStatus(null);

    try {
      const response = await fetch("/api/waitlist/resend-reservation-link", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
          captcha_token: solution.captcha_token,
          captcha_answer: solution.captcha_answer,
        }),
      });
      const result = (await response.json()) as ResendReservationResponse;

      if (!response.ok || !result.ok) {
        const failMessage =
          result.message ||
          "Could not process reservation link request right now. Please try again.";
        const captchaFailed =
          ("code" in result && result.code === "captcha_failed") ||
          failMessage.toLowerCase().includes("human check");
        if (captchaFailed) {
          throw new Error(failMessage);
        }
        setStatus(result.ok ? "error" : result.status);
        setMessage(failMessage);
        setCaptchaOpen(false);
        return;
      }

      setStatus(result.status);
      setMessage(result.message);
      setCaptchaOpen(false);
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Could not process reservation link request right now. Please try again.";

      if (nextMessage.toLowerCase().includes("human check")) {
        throw error instanceof Error
          ? error
          : new Error(nextMessage);
      }

      setStatus("error");
      setMessage(nextMessage);
      setCaptchaOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to resend your reservation link."
        confirmLabel="Send reservation link"
        submitting={submitting}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <form onSubmit={onSubmit} className="mx-auto flex max-w-[920px] flex-col gap-4">
        <label
          htmlFor="verify-resend-email"
          className="text-lg font-bold"
          style={{ color: "var(--fg-heading)" }}
        >
          Email address
        </label>
        <div className="relative">
          <span
            className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2"
            style={{ color: "var(--fg-muted)" }}
          >
            <MailIcon />
          </span>
          <input
            id="verify-resend-email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setMessage("");
              setStatus(null);
            }}
            placeholder="you@example.com"
            className="min-w-0 w-full rounded-2xl border bg-transparent py-3 pl-14 pr-4 text-base outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted"
            style={{ borderColor: "var(--faq-border)", color: "var(--fg-heading)" }}
          />
        </div>
        {validationMessage ? (
          <p className="text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
            {validationMessage}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!emailIsValid || submitting || captchaOpen}
          className="inline-flex h-[42px] w-full cursor-pointer items-center justify-center gap-3 rounded-full px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          <SendIcon />
          <span>
            {submitting
              ? "Sending..."
              : captchaOpen
                ? "Complete check…"
                : "Send reservation link"}
          </span>
        </button>
        {message ? (
          <p
            className="text-base text-center"
            style={{
              color:
                status === "accepted"
                  ? "var(--fg-body)"
                  : status === "invalid_email"
                    ? "var(--accent-red, #e05252)"
                    : "var(--fg-muted)",
            }}
          >
            {message}
          </p>
        ) : null}

        {showFooter ? (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm">
            <span
              className="inline-flex items-center gap-3"
              style={{ color: "var(--fg-muted)" }}
            >
              <LockIcon />
              <span>We only use your email to send your reservation link.</span>
            </span>
            <Link
              href="/docs/learn/privacy"
              className="inline-flex items-center gap-2 font-semibold transition hover:opacity-80"
              style={{ color: "var(--color-accent-interactive)" }}
            >
              <span>Privacy policy</span>
              <ExternalLinkIcon />
            </Link>
          </div>
        ) : null}
      </form>
    </>
  );
}
