"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import { usePurchaseFlow } from "@/components/hooks/usePurchaseFlow";
import { clearResume } from "@/lib/purchases/resume";
import PasscodeBoxes from "@/components/purchases/PasscodeBoxes";
import { QrBlock } from "@/components/ui/QrBlock";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { ACTION_LABELS } from "@/lib/types";
import type { Action, Network, ResolveName } from "@/lib/types";
import { explorerNameHref, actionToSlug } from "@/lib/purchases/nameActionHref";

// Term choices per action, in display order. Labels double as memo terms —
// claim terms are "forever" or "<N>y"; update terms add "none" (carry the
// current expiration forward).
const CLAIM_TERMS = ["1y", "2y", "5y", "10y", "forever"] as const;
const UPDATE_TERMS = ["none", "1y", "2y", "5y", "forever"] as const;

function termChoices(action: Action): ReadonlyArray<string> {
  return action === "CLAIM" ? CLAIM_TERMS : UPDATE_TERMS;
}

function termLabel(term: string): string {
  if (term === "forever") return "Forever";
  if (term === "none") return "No change";
  return term.replace("y", " yr");
}

function termDescription(action: Action, term: string): string {
  if (term === "forever") return "Registration without fixed expiration (3× annual price).";
  if (term === "none") return "Keep the current expiration; confirms liveness.";
  const years = Number(term.slice(0, -1));
  return `Extend expiration by ${years} year${years === 1 ? "" : "s"}.`;
}

function successShareCopy(action: Action, name: string): { title: string; text: string } {
  switch (action) {
    case "CLAIM":
      return {
        title: `${name} is yours`,
        text: `I just claimed "${name}" on Zcash Names.`,
      };
    case "UPDATE":
      return {
        title: `${name} updated`,
        text: `"${name}" now points at a fresh Zcash address.`,
      };
    case "RELEASE":
      return {
        title: `${name} released`,
        text: `"${name}" has been released back to the namespace.`,
      };
  }
}

// ---- Component -------------------------------------------------------------

export interface NameActionFormProps {
  action: Action;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  returnHref?: string;
  onSuccessChange?: (success: boolean) => void;
}

export default function NameActionForm({
  action,
  name,
  network,
  resolveResult,
  returnHref,
  onSuccessChange,
}: NameActionFormProps) {
  const router = useAppRouter();
  const flow = usePurchaseFlow({
    action,
    name,
    network,
    resolveResult,
    // Do not router.refresh() on success — revalidating resolve status can
    // flip the server page to "Action unavailable" and unmount this form
    // before the user sees Share / step / Done confirmation.
  });

  const {
    state: s,
    phases,
    phase,
    set,
    advance,
    goto,
    needsAddress,
    handleInputContinue,
    handleConfirmSent,
    handleOtpBack,
    handleVerifyOtp,
    handleRespondSent,
  } = flow;

  const doneHref = returnHref ?? explorerNameHref(name, network);
  const isSuccess = phase === "scanning" && s.scanState === "mined";

  useEffect(() => {
    onSuccessChange?.(isSuccess);
  }, [isSuccess, onSuccessChange]);

  const successShare = useMemo(() => {
    const copy = successShareCopy(action, name);
    const path = explorerNameHref(name, network);
    return { ...copy, shareUrl: path };
  }, [action, name, network]);

  function handleDone() {
    clearResume();
    router.push(doneHref);
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: successShare.title,
          text: successShare.text,
          url: successShare.shareUrl,
        });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${successShare.text} ${successShare.shareUrl}`);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  const stepIndex = phases.indexOf(phase);

  return (
    <div className="w-full rounded-b-2xl border border-t-0 px-6 py-8 sm:px-8 sm:py-9" style={{ borderColor: "var(--faq-border)" }}>
      {/* Progress rail */}
      <div className="mb-7 flex items-center justify-center gap-1.5" aria-hidden="true">
        {phases.map((step, i) => {
          const fill = i < stepIndex || isSuccess ? 1 : i === stepIndex ? 0.5 : 0;
          return (
            <button
              key={step}
              type="button"
              aria-label={i < stepIndex ? `Back to ${step}` : step}
              disabled={i >= stepIndex}
              onClick={() => goto(i)}
              className="relative h-2 w-10 overflow-hidden rounded-full border p-0"
              style={{
                borderColor: fill > 0 ? "var(--fg-heading)" : "var(--border-muted)",
                cursor: i < stepIndex ? "pointer" : "default",
              }}
            >
              <span
                className="absolute inset-y-0 left-0 block"
                style={{ width: `${fill * 100}%`, background: "var(--fg-heading)" }}
              />
            </button>
          );
        })}
      </div>

      {/* ── INPUT ── */}
      {phase === "input" ? (
        <div className="grid gap-5">
          {needsAddress ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
                {action === "CLAIM" ? "Your unified address" : "New unified address"}
              </span>
              <input
                type="text"
                value={s.addressInput}
                onChange={(e) => set({ addressInput: e.target.value })}
                placeholder={network === "testnet" ? "utest1…" : "u1…"}
                autoComplete="off"
                spellCheck={false}
                className="h-11 w-full rounded-xl border px-4 text-sm"
                style={{ borderColor: "var(--faq-border)", background: "var(--color-raised)" }}
              />
            </label>
          ) : null}

          <div className="grid gap-2">
            <span className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>
              {action === "CLAIM" ? "Registration term" : action === "UPDATE" ? "Term" : "Term"}
            </span>
            <div className="flex flex-wrap gap-2">
              {termChoices(action).map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => set({ termInput: term })}
                  aria-pressed={s.termInput === term}
                  className="h-9 rounded-full border px-4 text-sm font-semibold transition-colors"
                  style={{
                    borderColor:
                      s.termInput === term ? "var(--fg-heading)" : "var(--border-muted)",
                    background: s.termInput === term ? "var(--fg-heading)" : "transparent",
                    color: s.termInput === term ? "var(--color-bg, #fff)" : "var(--fg-heading)",
                  }}
                >
                  {termLabel(term)}
                </button>
              ))}
            </div>
            <span className="text-xs" style={{ color: "var(--fg-body)" }}>
              {termDescription(action, s.termInput || (action === "CLAIM" ? "1y" : "none"))}
            </span>
          </div>

          {s.inputError ? (
            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>{s.inputError}</p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleInputContinue()}
            className="mt-1 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            Continue
          </button>
        </div>
      ) : null}

      {/* ── CONFIRM (Request payment) ── */}
      {phase === "confirm" ? (
        <div className="grid gap-5">
          <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
            {action === "CLAIM"
              ? `Send the name price to the mint treasury with your claim request. Final price is set by the mint.`
              : `Send the $1 request fee to the mint treasury with your ${ACTION_LABELS[action].toLowerCase()} request.`}
          </p>
          {s.uri ? (
            <QrBlock
              address={s.paymentAddress}
              amount={s.amountZec}
              memo={s.memo}
              downloadFilename={`zns-${actionToSlug(action)}-request.png`}
            />
          ) : (
            <AnimatedLoadingLabel label="Building request" active />
          )}
          {s.inputError ? (
            <p className="text-sm font-medium" style={{ color: "#ef4444" }}>{s.inputError}</p>
          ) : null}
          <button
            type="button"
            disabled={!s.uri}
            onClick={handleConfirmSent}
            className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold disabled:opacity-50"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            {action === "CLAIM" ? "I've sent the payment" : "I've sent the request fee"}
          </button>
        </div>
      ) : null}

      {/* ── OTP ── */}
      {phase === "otp" ? (
        <div className="grid gap-5">
          <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
            The mint sent a 6-digit passcode to the address currently bound to{" "}
            <strong style={{ color: "var(--fg-heading)" }}>{name}</strong>. Find it in your
            wallet&apos;s memo, then enter it below.
          </p>
          <div className="flex justify-center">
            <PasscodeBoxes
              value={s.otpCode}
              onChange={(digits) => set({ otpCode: digits, otpError: "" })}
              onSubmit={() => void handleVerifyOtp()}
              error={!!s.otpError}
              success={s.otpVerified}
              autoFocus
            />
          </div>
          {s.otpError ? (
            <p className="text-center text-sm font-medium" style={{ color: "#ef4444" }}>{s.otpError}</p>
          ) : null}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOtpBack}
              className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold"
              style={{ borderColor: "var(--border-muted)", color: "var(--fg-heading)" }}
            >
              Back
            </button>
            <button
              type="button"
              disabled={s.otpLoading || s.otpCode.length !== 6}
              onClick={() => void handleVerifyOtp()}
              className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-bold disabled:opacity-50"
              style={{
                background: "var(--home-result-primary-bg)",
                color: "var(--home-result-primary-fg)",
                boxShadow: "var(--home-result-primary-shadow)",
              }}
            >
              {s.otpLoading ? <AnimatedLoadingLabel label="Preparing" active /> : "Continue"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── RESPOND (OTP + name payment) ── */}
      {phase === "respond" ? (
        <div className="grid gap-5">
          <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
            {action === "UPDATE"
              ? "Send the update payment with your passcode memo to execute the update."
              : "Send the release memo to execute the release. No name payment is due."}
          </p>
          <QrBlock
            address={s.paymentAddress}
            amount={s.respondAmountZec}
            memo={s.respondMemo}
            downloadFilename={`zns-${actionToSlug(action)}-respond.png`}
          />
          <button
            type="button"
            onClick={handleRespondSent}
            className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-bold"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            I've sent it
          </button>
        </div>
      ) : null}

      {/* ── SCANNING ── */}
      {phase === "scanning" ? (
        <div className="grid gap-5">
          {s.scanState === "mined" ? (
            <div className="grid gap-4 text-center">
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--fg-heading)" }}>
                {successShare.title}
              </h2>
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {action === "CLAIM"
                  ? `${name} is registered on-chain. View it any time on the explorer.`
                  : action === "UPDATE"
                    ? `${name} now points at its new address.`
                    : `${name} has been released.`}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-semibold"
                  style={{ borderColor: "var(--border-muted)", color: "var(--fg-heading)" }}
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={handleDone}
                  className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-bold"
                  style={{
                    background: "var(--home-result-primary-bg)",
                    color: "var(--home-result-primary-fg)",
                    boxShadow: "var(--home-result-primary-shadow)",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="grid justify-items-center gap-3 py-4">
              <AnimatedLoadingLabel label="Scanning the chain" active />
              <p className="max-w-md text-center text-sm" style={{ color: "var(--fg-body)" }}>
                Waiting for your {ACTION_LABELS[action].toLowerCase()} to be recorded on Zcash.
                This usually takes a few minutes.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
