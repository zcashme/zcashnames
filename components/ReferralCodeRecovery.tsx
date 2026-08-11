"use client";

import { useState, type FormEvent, type HTMLAttributes } from "react";
import { useTheme } from "next-themes";
import CaptchaChallengeModal, {
  type CaptchaSolution,
} from "@/components/captcha/CaptchaChallengeModal";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import type { ShareKitRecoveryPublicStatus } from "@/lib/sharekit-recovery";
import { recoverShareKitReferralByEmail } from "@/app/(site)/sharekit/actions";
import { getEmailAddressValidationMessage, normalizeEmailAddress } from "@/lib/email-address";

const ACTION_INSET_PX = 4;

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
  const submitReady = emailIsValid && !recovering && !captchaOpen;

  const isSharekit = variant === "sharekit";
  const isLightSharekit = isSharekit && resolvedTheme === "light";
  const panelId = controlsId ?? `${variant}-forgot-code`;
  // Text-only trigger (no border/fill); accent on hover. Sharekit centers it; leaders left-aligns.
  const buttonClassNameBase =
    "cursor-pointer bg-transparent p-0 text-sm font-semibold text-fg-body transition-colors hover:text-[var(--color-accent-interactive)] disabled:cursor-not-allowed disabled:opacity-60";
  const inputClassName = isSharekit
    ? `w-full min-w-0 rounded-2xl border border-border-muted py-3 pl-4 pr-[6.5rem] text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted ${
        isLightSharekit ? "bg-[var(--color-card)]" : "bg-[var(--input-fill)]"
      }`
    : `w-full min-w-0 rounded-2xl border border-border-muted py-3 pl-4 pr-[6.5rem] text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted ${
        resolvedTheme === "light" ? "bg-[var(--color-card)]" : "bg-[var(--input-fill)]"
      }`;
  // Default: sharekit centered, leaders left. Callers may pass className to override.
  const rootClassName =
    className ?? (isSharekit ? "text-center" : "text-left");

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
    <div className={rootClassName}>
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
        aria-expanded={open}
        aria-controls={panelId}
      >
        Forgot code?
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            id={panelId}
            onSubmit={onSubmit}
            className={
              formClassName ?? "mt-4 flex flex-col gap-3 border-t border-border-muted pt-4 text-left"
            }
            {...(!open ? ({ inert: true } as HTMLAttributes<HTMLFormElement>) : {})}
          >
            <label htmlFor={`${panelId}-input`} className="text-sm font-semibold text-fg-heading">
              Enter the email address you used to join the waitlist. We&rsquo;ll email you every verified name and
              referral code tied to that inbox.
            </label>
            <div className="relative flex items-center">
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
                autoComplete="email"
                tabIndex={open ? 0 : -1}
                className={inputClassName}
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
                  disabled={!submitReady || !open}
                  tabIndex={open ? 0 : -1}
                  className="inline-flex h-[calc(100%-2px)] shrink-0 items-center justify-center rounded-[13px] px-4 text-sm font-semibold leading-none transition"
                  style={{
                    background: submitReady
                      ? "var(--home-result-primary-bg)"
                      : "color-mix(in srgb, var(--leaders-card-border, var(--border-muted)) 22%, transparent)",
                    color: submitReady
                      ? "var(--home-result-primary-fg)"
                      : "var(--fg-muted)",
                    boxShadow: submitReady ? "var(--home-result-primary-shadow)" : "none",
                    cursor: recovering ? "progress" : submitReady ? "pointer" : "not-allowed",
                    opacity: recovering || captchaOpen ? 0.7 : 1,
                  }}
                >
                  {recovering ? (
                    <AnimatedLoadingLabel label="Checking" active />
                  ) : captchaOpen ? (
                    "…"
                  ) : (
                    "Recover"
                  )}
                </button>
              </span>
            </div>
            {validationMessage ? (
              <p className="text-xs" style={{ color: "var(--accent-red, #e05252)" }}>
                {validationMessage}
              </p>
            ) : null}
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
        </div>
      </div>
    </div>
  );
}
