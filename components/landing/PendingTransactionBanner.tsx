"use client";

import { useState } from "react";
import type { PendingTransactionState } from "@/lib/types";

const ACTION_LABEL = {
  claim: "Claim",
  buy: "Buy",
  update: "Update",
  list: "List",
  delist: "Delist",
  release: "Release",
} as const;

function describePending(state: PendingTransactionState): string {
  if (state.phase === "payment") return "Ready to send";
  switch (state.scanState) {
    case "loading":
      return "Checking status";
    case "not_detected":
      return "Waiting for detection";
    case "in_mempool":
      return "In mempool";
    case "being_mined":
      return "Being mined";
    case "mined":
      return "Confirmed";
  }
}

function explorerHref(state: PendingTransactionState): string {
  return state.target.network === "testnet"
    ? `/explorer?env=testnet&name=${encodeURIComponent(state.target.name)}`
    : `/explorer?name=${encodeURIComponent(state.target.name)}`;
}

export default function PendingTransactionBanner({
  pendingTransaction,
  onResume,
  onDismiss,
}: {
  pendingTransaction: PendingTransactionState;
  onResume: () => void;
  onDismiss: () => void;
}) {
  const [confirmingClear, setConfirmingClear] = useState(false);
  const label = ACTION_LABEL[pendingTransaction.target.action];
  const status = describePending(pendingTransaction);
  const isComplete = pendingTransaction.scanState === "mined";
  const isPaymentPhase = pendingTransaction.phase === "payment";
  const secondaryText = isComplete ? "This transaction is confirmed on-chain." : null;
  const clearWarning = isPaymentPhase
    ? "Removes this prepared request. Sent payments cannot be undone."
    : "Stops tracking only. It does not cancel any payment.";

  function handleClearAction() {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }
    setConfirmingClear(false);
    onDismiss();
  }

  function handleResumeAction() {
    setConfirmingClear(false);
    onResume();
  }

  function handleDismissAction() {
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
            style={{
              color: isComplete
                ? "var(--home-result-status-positive-fg, #9de7cd)"
                : "var(--fg-muted)",
            }}
          >
            {status}
          </span>
          <div
            className="h-px w-full"
            style={{ background: "var(--leaders-card-border, var(--faq-border))" }}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-sm font-semibold text-fg-heading">
              {label} {pendingTransaction.target.name}.zcash
            </span>
            {secondaryText && (
              <p className="m-0 text-sm" style={{ color: "var(--fg-muted)" }}>
                {secondaryText}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isComplete && (
            <>
              <a
                href={explorerHref(pendingTransaction)}
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
                onClick={handleDismissAction}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border-muted)",
                  color: "var(--fg-body)",
                }}
              >
                Dismiss
              </button>
            </>
          )}
          {!isComplete && (
            <>
              <button
                type="button"
                onClick={handleClearAction}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: "transparent",
                  border: "1.5px solid var(--border-muted)",
                  color: "var(--fg-body)",
                }}
              >
                {isPaymentPhase ? "Abandon" : "Ignore"}
              </button>
              <button
                type="button"
                onClick={handleResumeAction}
                className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}
              >
                {isPaymentPhase ? "Resume" : "Watch"}
              </button>
            </>
          )}
        </div>

        {!isComplete && confirmingClear && (
          <>
            <div
              className="h-px w-full"
              style={{ background: "var(--leaders-card-border, var(--faq-border))" }}
            />
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
