"use client";

import { useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import type { ShareKitRecoveryPublicStatus } from "@/lib/sharekit-recovery";
import { recoverShareKitReferralByEmail } from "@/app/(site)/sharekit/actions";

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
  const [status, setStatus] = useState<ShareKitRecoveryPublicStatus | null>(null);
  const [message, setMessage] = useState("");
  const { resolvedTheme } = useTheme();

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecovering(true);
    const result = await recoverShareKitReferralByEmail(input);
    setRecovering(false);
    setStatus(result.status);
    setMessage(result.message);
  }

  return (
    <div className={className}>
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
            Enter the email address you used to join the waitlist.
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
            className={`${inputClassName} ${isSharekit ? "bg-[var(--color-card)]" : ""}`}
            style={isSharekit ? undefined : { borderColor: "var(--leaders-card-border)" }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={recovering}
              className={buttonClassNameBase}
              style={isSharekit ? undefined : { borderColor: "var(--leaders-card-border)" }}
            >
              {recovering ? "Checking..." : "Recover link"}
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
