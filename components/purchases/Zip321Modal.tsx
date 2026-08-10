"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACTION_LABELS, getNetworkConstants } from "@/lib/types";
import type { Action as ZnsAction, Network, ResolveName } from "@/lib/types";
import { clearResume } from "@/lib/purchases/resume";
import { usePurchaseFlow } from "@/components/hooks/usePurchaseFlow";
import { validateAddress } from "@/lib/zns/utils";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { QrBlock } from "@/components/ui/QrBlock";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";
import {
  AddressBadge,
  NameBadge,
  inputDescription,
  minedMessage,
  modalDescription,
  phaseHeader,
  progressFillForPhase,
  scanningStatusMessage,
  settlingStatusMessage,
} from "@/components/purchases/modalCopy";
import PasscodeBoxes from "@/components/purchases/PasscodeBoxes";

// ---- Component -------------------------------------------------------------

interface Zip321ModalProps {
  action: ZnsAction;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

export default function Zip321Modal({
  action,
  name,
  network,
  resolveResult,
  onClose,
  onSuccess,
}: Zip321ModalProps) {
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const [modalContentHeight, setModalContentHeight] = useState<number | null>(null);

  const flow = usePurchaseFlow({
    action,
    name,
    network,
    resolveResult,
    onSuccess,
  });

  const {
    state: s,
    phases,
    phase,
    set,
    advance,
    goto,
    needsAddress,
    needsPrice,
    needsPayTaddr,
    isOwnerAction,
    handleUnlock,
    handleInputContinue,
    handleOtpBack,
    handleVerifyOtp,
  } = flow;

  useEffect(() => {
    const node = modalContentRef.current;
    if (!node) return;

    const measure = () => setModalContentHeight(node.scrollHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // -- Progress segments --
  function progressClipPath(i: number, n: number): string {
    if (n <= 1) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
    if (i === 0) return "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 0 100%)";
    if (i === n - 1) return "polygon(0 0, 100% 0, 100% 100%, 6px 100%)";
    return "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 6px 100%)";
  }
  const progressSegments = (
    <div className="flex w-full justify-center">
      <div className="flex max-w-full items-center gap-[3px]">
        {phases.map((step, i) => {
          const after = i > s.step;
          const current = i === s.step;
          const clickable = i < s.step && step !== "unlock";
          const fill = progressFillForPhase(step, i, s.step, s.scanState);
          const borderColor = fill > 0 || current ? "var(--fg-heading)" : "var(--border-muted)";
          return (
            <button
              key={`${step}-${i}`}
              type="button"
              aria-label={clickable ? `Back to ${step}` : step}
              aria-current={current ? "step" : undefined}
              disabled={!clickable}
              onClick={clickable ? () => goto(i) : undefined}
              className={`relative block h-2 w-8 sm:w-[34px] overflow-hidden p-0 ${clickable ? "cursor-pointer" : "cursor-default"}`}
              style={{
                clipPath: progressClipPath(i, phases.length),
                background: "transparent",
                border: `1px solid ${borderColor}`,
                transition: "border-color 450ms ease, background-color 450ms ease",
              }}
            >
              <span
                className="absolute inset-y-0 left-0 block"
                style={{
                  width: `${fill * 100}%`,
                  background: "var(--fg-heading)",
                  transition: "width 450ms ease, background-color 450ms ease",
                }}
              />
              <span className="sr-only">{after ? "Pending" : current ? "Current" : "Complete"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl w-full max-w-md overflow-visible"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          color: "var(--fg-body)",
          height: modalContentHeight == null ? "auto" : `min(${modalContentHeight}px, calc(100vh - 2rem))`,
          transition: "height 380ms ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase !== "unlock" && (() => {
          const isMined =
            (phase === "scanning" && s.scanState === "mined") ||
            (phase === "settling" && s.settleState === "mined");
          const isWaiting =
            (phase === "scanning" && s.scanState !== "mined") || phase === "settling";
          return (
            <span
              className="absolute left-1/2 top-0 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                background: isMined ? "var(--color-accent-green-light)" : "var(--color-raised)",
                color: isMined ? "var(--color-accent-green)" : "var(--fg-heading)",
                border: "1px solid var(--border-muted)",
              }}
              aria-hidden="true"
            >
              {isWaiting && !isMined ? (
                <span
                  className="inline-block h-6 w-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: "var(--border-muted)", borderTopColor: "var(--fg-heading)" }}
                />
              ) : isMined ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : phase === "input" ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-7 h-7"
                >
                  <path d="M8 6h8" />
                  <path d="M8 10h5" />
                  <path d="M8 14h4" />
                  <path d="M16 3h1a2 2 0 0 1 2 2v6" />
                  <path d="M7 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
                  <path d="M9 3h6" />
                  <path d="M15 18l4-4 2 2-4 4h-2v-2z" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-7 h-7"
                >
                  <path d="M7 3H5a2 2 0 0 0-2 2v2" />
                  <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                  <path d="M8 8h8v8H8z" />
                  <path d="M11 11h2v2h-2z" />
                </svg>
              )}
            </span>
          );
        })()}
        <div
          className="h-full max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain rounded-2xl"
          onWheel={(e) => e.stopPropagation()}
        >
          <div
            ref={modalContentRef}
            className="p-8"
            style={{ paddingTop: phase === "unlock" ? undefined : "3rem" }}
          >
            {progressSegments && <div className="mb-5">{progressSegments}</div>}
            {phase === "unlock" && (
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                  Protected Name
                </h2>
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  {modalDescription(action, "unlock", name, s)}
                </p>
                <input
                  type="text"
                  value={s.unlockCode}
                  autoFocus
                  onChange={(e) => {
                    const raw = e.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, 12);
                    const formatted = [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12)]
                      .filter(Boolean)
                      .join("-");
                    set({ unlockCode: formatted, unlockError: "" });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleUnlock();
                  }}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono tracking-[0.15em] outline-none text-center"
                  style={{
                    background: "var(--color-raised)",
                    border: `1.5px solid ${s.unlockError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`,
                    color: "var(--fg-heading)",
                  }}
                />
                {s.unlockError && (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--accent-red, #e05252)" }}
                  >
                    {s.unlockError}
                  </p>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--border-muted)",
                      color: "var(--fg-body)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUnlock()}
                    disabled={s.unlockLoading}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                    style={{
                      background: "var(--home-result-primary-bg)",
                      color: "var(--home-result-primary-fg)",
                      boxShadow: "var(--home-result-primary-shadow)",
                    }}
                  >
                    {s.unlockLoading ? <AnimatedLoadingLabel label="Verifying" active /> : "Unlock"}
                  </button>
                </div>
              </div>
            )}
            {phase === "input" &&
              (() => {
                const pendingBuy =
                  action === "BUY" && resolveResult.status === "listed"
                    ? resolveResult.pendingBuy
                    : undefined;
                const isResume = !!pendingBuy;
                const listingPriceZec =
                  action === "BUY" && resolveResult.status === "listed"
                    ? resolveResult.listingPrice.zec
                    : undefined;
                return (
                  <div className="flex flex-col gap-4">
                    <div className="text-center">
                      <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                        {isResume ? (
                          <>
                            Resume purchase of <NameBadge name={name} />
                          </>
                        ) : (
                          <>
                            {ACTION_LABELS[action]} <NameBadge name={name} />
                          </>
                        )}
                      </h2>
                      <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                        {isResume
                          ? modalDescription(action, "input", name, s, { isResume: true })
                          : inputDescription(
                              action,
                              name,
                              listingPriceZec ? `${listingPriceZec} ZEC` : undefined,
                            )}
                      </p>
                    </div>
                    {needsAddress &&
                      (() => {
                        const trimmed = s.addressInput.trim();
                        const v = trimmed
                          ? validateAddress(trimmed)
                          : { status: "invalid" as const, warning: "" };
                        const isMatchedBuyer = !!pendingBuy && trimmed === pendingBuy.buyer;
                        const isMismatchedBuyer =
                          !!pendingBuy &&
                          !!trimmed &&
                          trimmed !== pendingBuy.buyer &&
                          v.status === "unified";
                        const borderColor = !trimmed
                          ? "var(--faq-border)"
                          : isMatchedBuyer
                            ? "#22c55e"
                            : isMismatchedBuyer
                              ? "var(--accent-red, #e05252)"
                              : v.status === "viewkey" ||
                                  v.status === "tex" ||
                                  v.status === "invalid"
                                ? "var(--accent-red, #e05252)"
                                : v.status === "unified"
                                  ? "#22c55e"
                                  : "#ca8a04";
                        const showWarning =
                          trimmed &&
                          v.warning &&
                          v.status !== "viewkey" &&
                          v.status !== "tex" &&
                          v.status !== "invalid" &&
                          !isMatchedBuyer;
                        return (
                          <div className="flex flex-col gap-1.5">
                            <label
                              className="text-xs font-semibold"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              {action === "UPDATE" ? "New Zcash Address" : "Your Zcash Address"}
                            </label>
                            <input
                              type="text"
                              value={s.addressInput}
                              autoFocus
                              onChange={(e) =>
                                set({ addressInput: e.target.value, inputError: "" })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void handleInputContinue();
                              }}
                              placeholder="u1…"
                              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                              style={{
                                background: "var(--color-raised)",
                                border: `1.5px solid ${borderColor}`,
                                color: "var(--fg-heading)",
                              }}
                            />
                            {isMatchedBuyer && (
                              <p className="text-xs" style={{ color: "#22c55e" }}>
                                ✓ This address matches the locked purchase. Continue to send the
                                seller payment.
                              </p>
                            )}
                            {isMismatchedBuyer && (
                              <p
                                className="text-xs"
                                style={{ color: "var(--accent-red, #e05252)" }}
                              >
                                This name is locked to a different buyer&rsquo;s address.
                              </p>
                            )}
                            {showWarning && (
                              <p className="text-xs" style={{ color: "#ca8a04" }}>
                                {v.warning}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                    {needsPrice && (
                      <div className="flex flex-col gap-1.5">
                        <label
                          className="text-xs font-semibold"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          Price (ZEC)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={s.priceInput}
                          onChange={(e) => set({ priceInput: e.target.value, inputError: "" })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleInputContinue();
                          }}
                          placeholder="0.00"
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={{
                            background: "var(--color-raised)",
                            border: "1.5px solid var(--faq-border)",
                            color: "var(--fg-heading)",
                          }}
                        />
                      </div>
                    )}
                    {needsPayTaddr && (
                      <div className="flex flex-col gap-1.5">
                        <label
                          className="text-xs font-semibold"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          Payout Address (t-address)
                        </label>
                        <input
                          type="text"
                          value={s.payTaddrInput}
                          onChange={(e) => set({ payTaddrInput: e.target.value, inputError: "" })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") void handleInputContinue();
                          }}
                          placeholder={network === "testnet" ? "tm…" : "t1…"}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={{
                            background: "var(--color-raised)",
                            border: `1.5px solid ${
                              s.inputError &&
                              /payout|transparent|checksum|t-address|tm or tn|t1 or t3/i.test(
                                s.inputError,
                              )
                                ? "var(--accent-red, #e05252)"
                                : "var(--faq-border)"
                            }`,
                            color: "var(--fg-heading)",
                          }}
                          spellCheck={false}
                        />
                      </div>
                    )}
                    {isOwnerAction && (
                      <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
                        Changes to this name are authorized by{" "}
                        <strong style={{ color: "var(--fg-heading)" }}>passcodes</strong>
                      </p>
                    )}
                    {s.inputError && (
                      <p
                        className="text-sm font-semibold"
                        style={{ color: "var(--accent-red, #e05252)" }}
                      >
                        {s.inputError}
                      </p>
                    )}
                    <div className="flex gap-3 justify-center">
                      {s.step > 0 && (
                        <button
                          type="button"
                          onClick={() => goto(s.step - 1)}
                          className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                          style={{
                            background: "transparent",
                            border: "1.5px solid var(--border-muted)",
                            color: "var(--fg-body)",
                          }}
                        >
                          Back
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full text-sm font-semibold"
                        style={{
                          background: "transparent",
                          border: "1.5px solid var(--border-muted)",
                          color: "var(--fg-body)",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleInputContinue()}
                        className="px-5 py-2.5 rounded-full text-sm font-semibold"
                        style={{
                          background: "var(--home-result-primary-bg)",
                          color: "var(--home-result-primary-fg)",
                          boxShadow: "var(--home-result-primary-shadow)",
                        }}
                      >
                        {isResume ? "Continue to Payment" : "Continue"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            {phase === "otp" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                  Verify Ownership
                </h2>
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  Send exact amount and memo to address below to request verification code.
                </p>
                {s.otpMemo ? (
                  <div className={`flex w-full flex-col items-center ${s.otpSent ? "gap-6" : ""}`}>
                    <QrBlock
                      address={getNetworkConstants(network).OTP_SIGNIN_ADDR}
                      amount={getNetworkConstants(network).OTP_AMOUNT}
                      memo={s.otpMemo}
                      size={180}
                    />
                    {s.otpSent ? (
                      <p className="m-0 text-center text-sm" style={{ color: "var(--fg-body)" }}>
                        The owner of <NameBadge name={name} /> will receive a passcode in their
                        wallet.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {s.otpSent && (
                  <div className="flex w-full max-w-sm flex-col items-center gap-3">
                    <PasscodeBoxes
                      id="zip321-passcode"
                      value={s.otpCode}
                      disabled={s.otpVerified}
                      error={!!s.otpError}
                      success={
                        s.otpCode.length === 6 && !s.otpError && s.otpVerified
                      }
                      autoFocus={!s.otpVerified}
                      className="w-full"
                      onChange={(digits) =>
                        set({
                          otpCode: digits,
                          otpError: "",
                          otpVerified: false,
                        })
                      }
                      onSubmit={() => void handleVerifyOtp()}
                    />
                    {(s.otpError || s.otpAttempts > 0) && (
                      <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                        {s.otpError && (
                          <span
                            className="text-sm font-semibold"
                            style={{ color: "var(--accent-red, #e05252)" }}
                          >
                            {s.otpError}
                          </span>
                        )}
                        {s.otpAttempts > 0 && (
                          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                            Attempt {s.otpAttempts} of{" "}
                            {getNetworkConstants(network).OTP_MAX_ATTEMPTS}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-3 w-full justify-between pt-1">
                  {s.step > 0 ? (
                    <button
                      type="button"
                      onClick={handleOtpBack}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: "transparent",
                        border: "1.5px solid var(--border-muted)",
                        color: "var(--fg-body)",
                      }}
                    >
                      Back
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => set({ otpSent: true, otpError: "", otpVerified: false })}
                    disabled={s.otpSent}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--border-muted)",
                      color: "var(--fg-body)",
                    }}
                  >
                    I Sent It!
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleVerifyOtp()}
                    disabled={
                      !s.otpSent ||
                      !s.otpCode.trim() ||
                      s.otpLoading ||
                      s.otpVerified ||
                      s.otpAttempts >= getNetworkConstants(network).OTP_MAX_ATTEMPTS
                    }
                    className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={
                      s.otpVerified
                        ? {
                            background: "var(--color-accent-green-light)",
                            color: "var(--color-accent-green)",
                            border: "1.5px solid var(--color-accent-green)",
                          }
                        : {
                            background: "var(--home-result-primary-bg)",
                            color: "var(--home-result-primary-fg)",
                            boxShadow: "var(--home-result-primary-shadow)",
                          }
                    }
                  >
                    {s.otpVerified ? (
                      "Verified!"
                    ) : s.otpLoading ? (
                      <AnimatedLoadingLabel label="Verifying" active />
                    ) : (
                      "Verify Code"
                    )}
                  </button>
                </div>
              </div>
            )}
            {phase === "confirm" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                  {phaseHeader(action, "confirm")}
                </h2>
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  {modalDescription(action, "confirm", name, s)}
                </p>
                {s.uri && s.paymentAddress && (
                  <QrBlock
                    address={s.paymentAddress}
                    amount={s.amountZec}
                    memo={s.memo}
                    size={200}
                  />
                )}
                <div className="flex gap-3">
                  {s.step > 0 && (
                    <button
                      type="button"
                      onClick={() => goto(s.step - 1)}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: "transparent",
                        border: "1.5px solid var(--border-muted)",
                        color: "var(--fg-body)",
                      }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => advance()}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "var(--home-result-primary-bg)",
                      color: "var(--home-result-primary-fg)",
                      boxShadow: "var(--home-result-primary-shadow)",
                    }}
                  >
                    I Sent It!
                  </button>
                </div>
              </div>
            )}
            {phase === "fund" &&
              (() => {
                const listed = resolveResult.status === "listed" ? resolveResult : null;
                if (!listed) {
                  return (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                        Listing withdrawn
                      </h2>
                      <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                        This name is no longer for sale. Don&rsquo;t send the seller payment.
                      </p>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-full text-sm font-semibold"
                        style={{
                          background: "transparent",
                          border: "1.5px solid var(--border-muted)",
                          color: "var(--fg-body)",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                      Pay the seller
                    </h2>
                    <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                      {modalDescription(action, "fund", name, s, {
                        listingPriceZec: listed.listingPrice.zec,
                      })}
                    </p>
                    {listed.pendingBuy && (
                      <p className="text-xs break-all" style={{ color: "#22c55e" }}>
                        Locked to <AddressBadge address={listed.pendingBuy.buyer} />
                      </p>
                    )}
                    <QrBlock
                      address={listed.payTaddr}
                      amount={String(listed.listingPrice.zec)}
                      memo=""
                      size={200}
                    />
                    <button
                      type="button"
                      onClick={() => advance()}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold"
                      style={{
                        background: "var(--home-result-primary-bg)",
                        color: "var(--home-result-primary-fg)",
                        boxShadow: "var(--home-result-primary-shadow)",
                      }}
                    >
                      I Sent It
                    </button>
                  </div>
                );
              })()}
            {phase === "scanning" && s.scanState !== "mined" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                  Scanning
                </h2>
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  {modalDescription(action, "scanning", name, s)}
                </p>
                <div
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-xl p-5 text-center"
                  style={{
                    background: "var(--color-raised)",
                    border: `1.5px solid ${s.scanState === "in_mempool" || s.scanState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
                  }}
                >
                  <p className="w-full text-center text-sm" style={{ color: "var(--fg-body)" }}>
                    {scanningStatusMessage(action, s.scanState)}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3">
                  <span
                    className="inline-flex overflow-hidden transition-[max-width,opacity,margin] duration-[450ms] ease-out"
                    style={{
                      maxWidth: s.scanState === "not_detected" && s.step > 0 ? "7rem" : "0rem",
                      opacity: s.scanState === "not_detected" && s.step > 0 ? 1 : 0,
                      pointerEvents:
                        s.scanState === "not_detected" && s.step > 0 ? "auto" : "none",
                    }}
                    aria-hidden={
                      s.scanState === "not_detected" && s.step > 0 ? undefined : "true"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => goto(s.step - 1)}
                      tabIndex={s.scanState === "not_detected" && s.step > 0 ? 0 : -1}
                      className="whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: "transparent",
                        border: "1.5px solid var(--border-muted)",
                        color: "var(--fg-body)",
                      }}
                    >
                      Back
                    </button>
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-full text-sm font-semibold"
                    style={{
                      background: "transparent",
                      border: "1.5px solid var(--border-muted)",
                      color: "var(--fg-body)",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
            {phase === "scanning" && s.scanState === "mined" && action !== "BUY" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <ZcashNamesLogoMark size={64} />
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  {minedMessage(action, name, s.address)}
                </p>
                <div className="flex gap-3">
                  <a
                    href={
                      network === "testnet"
                        ? `/explorer?env=testnet&name=${encodeURIComponent(name)}`
                        : `/explorer?name=${encodeURIComponent(name)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
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
                    onClick={() => {
                      clearResume();
                      onClose();
                    }}
                    className="px-6 py-3 rounded-full text-sm font-semibold"
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
            )}
            {phase === "settling" && s.settleState !== "mined" && (
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                  Finalising your purchase
                </h2>
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  {modalDescription(action, "settling", name, s)}
                </p>
                <div
                  className="flex w-full flex-col items-center gap-3 rounded-xl p-5 text-center"
                  style={{
                    background: "var(--color-raised)",
                    border: `1.5px solid ${s.settleState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
                  }}
                >
                  <p className="w-full text-center text-sm" style={{ color: "var(--fg-body)" }}>
                    {settlingStatusMessage(action, s.settleState)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{
                    background: "transparent",
                    border: "1.5px solid var(--border-muted)",
                    color: "var(--fg-body)",
                  }}
                >
                  Close
                </button>
              </div>
            )}
            {phase === "settling" && s.settleState === "mined" && (
              <div className="flex flex-col items-center gap-5 text-center">
                <ZcashNamesLogoMark size={64} />
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  {minedMessage("BUY", name, s.address)}
                </p>
                <div className="flex gap-3">
                  <a
                    href={
                      network === "testnet"
                        ? `/explorer?env=testnet&name=${encodeURIComponent(name)}`
                        : `/explorer?name=${encodeURIComponent(name)}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
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
                    onClick={() => {
                      clearResume();
                      onClose();
                    }}
                    className="px-6 py-3 rounded-full text-sm font-semibold"
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
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
