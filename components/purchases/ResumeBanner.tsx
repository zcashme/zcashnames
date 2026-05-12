"use client";

import { useState } from "react";
import { ACTION_LABELS, ACTION_NOUNS } from "@/lib/types";
import type { ResumeSnapshot } from "@/lib/purchases/resume";

function describe(snap: ResumeSnapshot): string {
  if (snap.phase === "confirm") return "Ready to send";
  if (snap.phase === "fund") return "Waiting for payment";
  switch (snap.scanState) {
    case "not_detected": return "Waiting for detection";
    case "in_mempool":   return "In mempool";
    case "confirming":   return "Confirming";
    case "mined":        return "Confirmed";
    case "rejected":     return "Not found";
  }
}

function explorerHref(snap: ResumeSnapshot): string {
  return snap.network === "testnet"
    ? `/explorer?env=testnet&name=${encodeURIComponent(snap.name)}`
    : `/explorer?name=${encodeURIComponent(snap.name)}`;
}

interface ResumeBannerProps {
  snapshot: ResumeSnapshot;
  onResume: () => void;
  onDismiss: () => void;
}

export default function ResumeBanner({ snapshot, onResume, onDismiss }: ResumeBannerProps) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const label = ACTION_LABELS[snapshot.action];
  const noun = ACTION_NOUNS[snapshot.action];
  const status = describe(snapshot);
  const isComplete = snapshot.scanState === "mined";
  const isConfirm = snapshot.phase === "confirm";
  const secondaryText = isComplete ? `Your ${noun} is confirmed on-chain.` : null;
  const clearWarning = isConfirm
    ? "Removes this prepared request. Sent payments cannot be undone."
    : "Stops tracking only. It does not cancel any payment.";

  function handleClear() {
    if (!confirmingClear) { setConfirmingClear(true); return; }
    setConfirmingClear(false);
    onDismiss();
  }

  return (
    <div
      className="fixed bottom-5 left-5 z-[9998] w-[min(calc(100vw-2.5rem),28rem)] rounded-2xl border px-4 py-3 sm:px-5 sm:py-4"
      style={{
        background: "var(--leaders-card-bg-solid, var(--leaders-card-bg, var(--feature-card-bg)))",
        borderColor: "var(--leaders-card-border, var(--faq-border))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span
            className="text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
            style={{ color: isComplete ? "var(--home-result-status-positive-fg, #9de7cd)" : "var(--fg-muted)" }}
          >
            {status}
          </span>
          <div className="h-px w-full" style={{ background: "var(--leaders-card-border, var(--faq-border))" }} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-semibold text-fg-heading">
              {label} {snapshot.name}.zcash
            </span>
            {secondaryText && (
              <p className="m-0 text-sm" style={{ color: "var(--fg-muted)" }}>{secondaryText}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isComplete ? (
            <>
              <a
                href={explorerHref(snapshot)}
                className="rounded-full px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border-muted)",
                  color: "var(--fg-body)",
                  textDecoration: "none",
                }}
              >
                View on Explorer
              </a>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
              >
                {isConfirm ? "Abandon" : "Ignore"}
              </button>
              <button
                type="button"
                onClick={onResume}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                {isConfirm ? "Resume" : "Watch"}
              </button>
            </>
          )}
        </div>

        {!isComplete && confirmingClear && (
          <>
            <div className="h-px w-full" style={{ background: "var(--leaders-card-border, var(--faq-border))" }} />
            <p
              className="m-0 text-sm font-medium leading-relaxed"
              style={{ color: "var(--home-result-status-negative-fg, #ff8a8a)" }}
            >
              {clearWarning}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
