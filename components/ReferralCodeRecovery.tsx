"use client";

import { useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import type { ShareKitRecoveryPublicStatus } from "@/lib/sharekit-recovery";
import { recoverShareKitReferralByEmail } from "@/app/(site)/sharekit/actions";
import { getEmailAddressValidationMessage, normalizeEmailAddress } from "@/lib/email-address";

export default function ReferralCodeRecovery({
  variant = "leaders",
  controlsId,
  className,
  triggerClassName,
  formClassName,
}: {
  variant?: "leaders" | "sharekit";
  controlsId?: string;
  className?: string;
  triggerClassName?: string;
  formClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [status, setStatus] = useState<ShareKitRecoveryPublicStatus | null>(null);
  const [message, setMessage] = useState("");
  const { resolvedTheme } = useTheme();
  const validationMessage = getEmailAddressValidationMessage(input);
  const emailIsValid = !validationMessage && normalizeEmailAddress(input).length > 0;

  const isSharekit = variant === "sharekit";
  const isLightSharekit = isSharekit && resolvedTheme === "light";
  const panelId = controlsId ?? `${variant}-forgot-code`;
  const buttonClassNameBase = isLightSharekit
    ? "rounded-md border border-border-muted bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
    : isSharekit
    ? "cursor-pointer rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading disabled:cursor-not-allowed disabled:opacity-60"
    : "cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-muted disabled:cursor-not-allowed disabled:opacity-60";
  const inputClassName = isSharekit
    ? "min-w-0 rounded-lg border border-border-muted px-3 py-2 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted"
    : "min-w-0 rounded-lg border bg-transparent px-3 py-2 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted";

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailIsValid || recovering || captchaOpen) return;
    setStatus(null);
    setMessage("");
    setCaptchaOpen(true);
  }

  function closeCaptchaModal() {
    if (recovering) return;
    setCaptchaOpen(false);
  }

  async function completeSubmitAfterCaptcha(solution: CaptchaSolution) {
    if (!emailIsValid || recovering) return;

    setRecovering(true);
    setStatus(null);
    setMessage("");

    try {
      const result = await recoverShareKitReferralByEmail({
        email: input,
        captcha_token: solution.captcha_token,
        captcha_answer: solution.captcha_answer,
      });

      const captchaFailed =
        ("code" in result && result.code === "captcha_failed") ||
        result.message.toLowerCase().includes("human check");

      if (captchaFailed) {
        throw new Error(result.message);
      }

      setStatus(result.status);
      setMessage(result.message);
      setCaptchaOpen(false);
    } catch (error) {
      const nextMessage =
        error instanceof Error
          ? error.message
          : "Could not process referral recovery right now. Please try again.";

      if (nextMessage.toLowerCase().includes("human check")) {
        throw error instanceof Error ? error : new Error(nextMessage);
      }

      setStatus("error");
      setMessage(nextMessage);
      setCaptchaOpen(false);
    } finally {
      setRecovering(false);
    }
  }

  return (
    <div className={className}>
      <CaptchaChallengeModal
        isOpen={captchaOpen}
        title="Confirm you're human"
        description="Complete this quick check to recover your referral codes."
        confirmLabel="Recover codes"
        submitting={recovering}
        onCancel={closeCaptchaModal}
        onConfirm={completeSubmitAfterCaptcha}
      />
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setStatus(null);
          setMessage("");
        }}
        className={triggerClassName ?? buttonClassNameBase}
        style={isSharekit ? undefined : { borderColor: "var(--leaders-card-border)" }}
        aria-expanded={open}
        aria-controls={panelId}
      >
        Forgot code?
      </button>
      {open && (
        <form
          id={panelId}
          onSubmit={onSubmit}
          className={formClassName ?? (isSharekit ? "mt-4 flex flex-col gap-3 border-t border-border-muted pt-4" : "mt-4 flex flex-col gap-3 border-t pt-4")}
          style={isSharekit ? undefined : { borderColor: "var(--leaders-card-border)" }}
        >
          <label htmlFor={`${panelId}-input`} className="text-sm font-semibold text-fg-heading">
            Enter the email address you used to join the waitlist. We&rsquo;ll email every verified name and referral
            code tied to that inbox.
          </label>
          <input
            id={`${panelId}-input`}
            type="email"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setStatus(null);
              setMessage("");
            }}
            placeholder="you@example.com"
            className={`${inputClassName} ${isSharekit ? "bg-[var(--input-fill)]" : ""}`}
            style={isSharekit ? undefined : { borderColor: "var(--leaders-card-border)" }}
          />
          {validationMessage ? (
            <p className="text-xs" style={{ color: "var(--accent-red, #e05252)" }}>
              {validationMessage}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!emailIsValid || recovering || captchaOpen}
              className={buttonClassNameBase}
              style={isSharekit ? undefined : { borderColor: "var(--leaders-card-border)" }}
            >
              {recovering ? (
                <AnimatedLoadingLabel label="Checking" active />
              ) : captchaOpen ? (
                "Complete check…"
              ) : (
                "Recover codes"
              )}
            </button>
          </div>
          {message ? (
            <p
              className={`text-sm ${
                status === "accepted" ? "text-fg-heading" : status === "error" ? "text-fg-muted" : "text-fg-body"
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
