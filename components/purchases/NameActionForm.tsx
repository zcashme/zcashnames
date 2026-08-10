"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { usePurchaseFlow } from "@/components/hooks/usePurchaseFlow";
import ShareDropdown from "@/components/ShareDropdown";
import { ACTION_LABELS, getNetworkConstants } from "@/lib/types";
import type { Action, Network, Phase, ResolveName } from "@/lib/types";
import { validateAddress } from "@/lib/zns/utils";
import { clearResume } from "@/lib/purchases/resume";
import { explorerNameHref } from "@/lib/purchases/nameActionHref";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { QrBlock } from "@/components/ui/QrBlock";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";
import {
  AddressBadge,
  minedMessage,
  modalDescription,
  NameBadge,
  phaseHeader,
  scanningStatusMessage,
  settlingStatusMessage,
} from "@/components/purchases/modalCopy";
import PasscodeBoxes from "@/components/purchases/PasscodeBoxes";

const SITE_ORIGIN = "https://www.zcashnames.com";

function successShareCopy(action: Action, name: string): {
  message: string;
  xMessage: string;
  emailSubject: string;
} {
  switch (action) {
    case "CLAIM":
      return {
        message: `I just claimed ${name} on Zcash Names.`,
        xMessage: `I just claimed ${name} on @ZcashNames.`,
        emailSubject: `I claimed ${name} on Zcash Names`,
      };
    case "BUY":
      return {
        message: `I just bought ${name} on Zcash Names.`,
        xMessage: `I just bought ${name} on @ZcashNames.`,
        emailSubject: `I bought ${name} on Zcash Names`,
      };
    case "UPDATE":
      return {
        message: `I just updated ${name} on Zcash Names.`,
        xMessage: `I just updated ${name} on @ZcashNames.`,
        emailSubject: `I updated ${name} on Zcash Names`,
      };
    case "LIST":
      return {
        message: `I just listed ${name} for sale on Zcash Names.`,
        xMessage: `I just listed ${name} for sale on @ZcashNames.`,
        emailSubject: `${name} is listed for sale on Zcash Names`,
      };
    case "DELIST":
      return {
        message: `I just delisted ${name} on Zcash Names.`,
        xMessage: `I just delisted ${name} on @ZcashNames.`,
        emailSubject: `${name} was delisted on Zcash Names`,
      };
    case "RELEASE":
      return {
        message: `I just released ${name} on Zcash Names - it is available to claim.`,
        xMessage: `I just released ${name} on @ZcashNames - it is available to claim.`,
        emailSubject: `${name} was released on Zcash Names`,
      };
  }
}

type NameActionFormProps = {
  action: Action;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  returnHref?: string;
  /** Fired when the form enters/leaves the success confirmation state. */
  onSuccessChange?: (success: boolean) => void;
};

function fieldStyle(hasError: boolean): CSSProperties {
  return {
    background: "var(--input-fill)",
    border: `1.5px solid ${hasError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`,
    color: "var(--fg-heading)",
  };
}

function InlineStepButton({
  onClick,
  disabled = false,
  label = "Next",
  loading = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex h-9 items-center justify-center rounded-[13px] px-4 text-sm font-semibold transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:hover:opacity-100"
      style={{
        background:
          disabled || loading
            ? "color-mix(in srgb, var(--leaders-card-border) 22%, transparent)"
            : "var(--home-result-primary-bg)",
        color: disabled || loading ? "var(--fg-muted)" : "var(--home-result-primary-fg)",
        boxShadow: disabled || loading ? "none" : "var(--home-result-primary-shadow)",
      }}
    >
      {loading ? <AnimatedLoadingLabel label={label} active /> : label}
    </button>
  );
}

function RequiredAsterisk() {
  return (
    <span aria-hidden="true" className="ml-1" style={{ color: "var(--accent-red, #e05252)" }}>
      *
    </span>
  );
}

function PhaseLabel({
  children,
  complete = false,
}: {
  children: ReactNode;
  complete?: boolean;
}) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      <label
        className="block text-[0.72rem] font-semibold uppercase tracking-[0.18em]"
        style={{ color: "var(--fg-muted)" }}
      >
        {children}
      </label>
      {complete ? (
        <span
          className="inline-flex shrink-0 items-center justify-center"
          style={{ color: "var(--color-accent-green)" }}
          aria-label="Complete"
          title="Complete"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3.2 8.2 6.4 11.2 12.8 4.5" />
          </svg>
        </span>
      ) : null}
    </div>
  );
}

function OtpBackWarningModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onCancel}
    >
      <div
        className="relative isolate w-full max-w-md overflow-visible rounded-2xl"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          maxHeight: "calc(100vh - 2rem)",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-back-warning-title"
      >
        <span
          className="absolute left-1/2 top-0 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
          style={{
            background: "color-mix(in srgb, var(--color-brand-orange, #f59e0b) 18%, var(--feature-card-bg))",
            borderColor: "var(--faq-border)",
            color: "var(--color-brand-orange, #f59e0b)",
            boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
          }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </span>
        <div className="flex flex-col items-center gap-4 px-8 pb-8 pt-12 text-center">
          <h2
            id="otp-back-warning-title"
            className="text-xl font-bold"
            style={{ color: "var(--fg-heading)" }}
          >
            New passcode required
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--fg-body)" }}>
            Going back lets you change the price and payout address, but you will need a new
            ownership passcode. Your current verification session will be discarded.
          </p>
          <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-11 items-center justify-center rounded-full border px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{
                background: "transparent",
                borderColor: "var(--border-muted)",
                color: "var(--fg-body)",
              }}
            >
              Stay here
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
              style={{
                background: "var(--home-result-primary-bg)",
                color: "var(--home-result-primary-fg)",
                boxShadow: "var(--home-result-primary-shadow)",
              }}
            >
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function NameActionForm({
  action,
  name,
  network,
  resolveResult,
  returnHref,
  onSuccessChange,
}: NameActionFormProps) {
  const router = useRouter();
  const [otpBackOpen, setOtpBackOpen] = useState(false);
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
    needsPrice,
    needsPayTaddr,
    isOwnerAction,
    handleUnlock,
    handleInputContinue,
    handleVerifyOtp,
  } = flow;

  const doneHref = returnHref ?? explorerNameHref(name, network);
  const isSuccess =
    (phase === "scanning" && s.scanState === "mined" && action !== "BUY") ||
    (phase === "settling" && s.settleState === "mined");

  useEffect(() => {
    onSuccessChange?.(isSuccess);
  }, [isSuccess, onSuccessChange]);

  const pendingBuy =
    action === "BUY" && resolveResult.status === "listed"
      ? resolveResult.pendingBuy
      : undefined;
  const isResume = !!pendingBuy && phase === "input";

  const successShare = useMemo(() => {
    const path = explorerNameHref(name, network);
    const copy = successShareCopy(action, name);
    return {
      ...copy,
      shareUrl: `${SITE_ORIGIN}${path}`,
    };
  }, [action, name, network]);

  function handleDone() {
    clearResume();
    router.push(doneHref);
  }

  function successShareButton() {
    return (
      <ShareDropdown
        label="Share"
        message={successShare.message}
        xMessage={successShare.xMessage}
        shareUrl={successShare.shareUrl}
        emailSubject={successShare.emailSubject}
        menuAlign="left"
        menuDirection="up"
        rootClassName="relative inline-flex w-fit flex-col items-start"
        // Match footer step buttons: h-9, opacity hover (same as View on Explorer / Continue)
        buttonClassName="box-border inline-flex h-9 min-h-9 items-center justify-center gap-2 rounded-[13px] border border-border-muted bg-transparent px-4 text-sm font-semibold leading-none text-fg-body transition-opacity hover:opacity-85"
      />
    );
  }

  function confirmOtpBack() {
    setOtpBackOpen(false);
    // Skip the native confirm; modal is the warning.
    goto(s.step - 1);
  }

  // Progressive reveal: show all phases up to and including current step.
  const visiblePhases = phases.slice(0, s.step + 1);

  const showOtpBack = phase === "otp" && s.step > 0 && !isSuccess;
  const showGenericBack =
    s.step > 0 &&
    phase !== "otp" &&
    !isSuccess &&
    phase !== "scanning" &&
    phase !== "settling";

  function footerPrimary() {
    if (isSuccess) {
      return <InlineStepButton label="View on Explorer" onClick={handleDone} />;
    }

    switch (phase) {
      case "unlock":
        return (
          <InlineStepButton
            label="Unlock"
            loading={s.unlockLoading}
            onClick={() => void handleUnlock()}
          />
        );
      case "input":
        return (
          <InlineStepButton
            label={isResume ? "Continue to payment" : "Continue"}
            onClick={() => void handleInputContinue()}
          />
        );
      case "otp":
        if (!s.otpSent) {
          return (
            <InlineStepButton
              label="I Sent It"
              onClick={() => set({ otpSent: true, otpError: "", otpVerified: false })}
            />
          );
        }
        return (
          <InlineStepButton
            label={s.otpVerified ? "Verified" : "Verify code"}
            loading={s.otpLoading}
            disabled={
              s.otpCode.trim().length !== 6 ||
              s.otpVerified ||
              s.otpAttempts >= getNetworkConstants(network).OTP_MAX_ATTEMPTS
            }
            onClick={() => void handleVerifyOtp()}
          />
        );
      case "confirm":
        return <InlineStepButton label="I Sent It" onClick={() => advance()} />;
      case "fund":
        if (resolveResult.status !== "listed") {
          return <InlineStepButton label="Close" onClick={handleDone} />;
        }
        return <InlineStepButton label="I Sent It" onClick={() => advance()} />;
      case "scanning":
      case "settling":
        return (
          <button
            type="button"
            onClick={handleDone}
            className="inline-flex h-9 items-center justify-center rounded-[13px] px-4 text-sm font-semibold"
            style={{
              background: "transparent",
              border: "1.5px solid var(--border-muted)",
              color: "var(--fg-body)",
            }}
          >
            Close
          </button>
        );
      default:
        return null;
    }
  }

  function footerBack() {
    if (showOtpBack) {
      return (
        <button
          type="button"
          onClick={() => setOtpBackOpen(true)}
          className="inline-flex h-9 items-center justify-center rounded-[13px] px-4 text-sm font-semibold"
          style={{
            background: "transparent",
            border: "1.5px solid var(--border-muted)",
            color: "var(--fg-body)",
          }}
        >
          Previous
        </button>
      );
    }
    if (showGenericBack) {
      return (
        <button
          type="button"
          onClick={() => goto(s.step - 1)}
          className="inline-flex h-9 items-center justify-center rounded-[13px] px-4 text-sm font-semibold"
          style={{
            background: "transparent",
            border: "1.5px solid var(--border-muted)",
            color: "var(--fg-body)",
          }}
        >
          Previous
        </button>
      );
    }
    return <span />;
  }

  function renderPhaseBody(p: Phase, active: boolean, complete: boolean) {
    const muted = !active;

    if (p === "unlock") {
      return (
        <div className={muted ? "opacity-70" : undefined}>
          <PhaseLabel complete={complete}>
            Unlock code
            {!complete && <RequiredAsterisk />}
          </PhaseLabel>
          <p className="mb-2 text-sm" style={{ color: "var(--fg-body)" }}>
            {modalDescription(action, "unlock", name, s)}
          </p>
          <input
            type="text"
            value={s.unlockCode}
            disabled={muted}
            onChange={(e) => {
              const raw = e.target.value
                .replace(/[^A-Za-z0-9]/g, "")
                .toUpperCase()
                .slice(0, 12);
              const formatted = [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12)]
                .filter(Boolean)
                .join("-");
              set({ unlockCode: formatted, unlockError: "" });
              if (muted) goto(phases.indexOf("unlock"));
            }}
            placeholder="XXXX-XXXX-XXXX"
            className="w-full rounded-2xl px-4 py-2.5 text-center font-mono text-sm tracking-[0.15em] outline-none disabled:opacity-70"
            style={fieldStyle(!!s.unlockError && active)}
            autoComplete="off"
          />
          {active && s.unlockError ? (
            <p className="mt-2 text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
              {s.unlockError}
            </p>
          ) : null}
        </div>
      );
    }

    if (p === "input") {
      const trimmed = s.addressInput.trim();
      const v = trimmed ? validateAddress(trimmed) : { status: "invalid" as const, warning: "" };
      const isMatchedBuyer = !!pendingBuy && trimmed === pendingBuy.buyer;
      const isMismatchedBuyer =
        !!pendingBuy && !!trimmed && trimmed !== pendingBuy.buyer && v.status === "unified";

      return (
        <div className={`space-y-4 ${muted ? "opacity-70" : ""}`}>
          {isResume && active ? (
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {modalDescription(action, "input", name, s, { isResume: true })}
            </p>
          ) : null}

          {needsAddress && (
            <div>
              <PhaseLabel complete={complete}>
                {action === "UPDATE" ? "New Zcash address" : "Your Zcash address"}
                {!complete && <RequiredAsterisk />}
              </PhaseLabel>
              <input
                type="text"
                value={s.addressInput}
                disabled={muted}
                onChange={(e) => {
                  set({ addressInput: e.target.value, inputError: "" });
                  if (muted) goto(phases.indexOf("input"));
                }}
                placeholder="u1…"
                className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none disabled:opacity-70"
                style={fieldStyle(!!s.inputError && active && needsAddress)}
                autoComplete="off"
              />
              {active && isMatchedBuyer && (
                <p className="mt-2 text-xs" style={{ color: "#22c55e" }}>
                  ✓ This address matches the locked purchase. Continue to send the seller payment.
                </p>
              )}
              {active && isMismatchedBuyer && (
                <p className="mt-2 text-xs" style={{ color: "var(--accent-red, #e05252)" }}>
                  This name is locked to a different buyer&rsquo;s address.
                </p>
              )}
            </div>
          )}

          {needsPrice && (
            <div>
              <PhaseLabel complete={complete}>
                Price (ZEC)
                {!complete && <RequiredAsterisk />}
              </PhaseLabel>
              <input
                type="text"
                inputMode="decimal"
                value={s.priceInput}
                disabled={muted}
                onChange={(e) => {
                  set({ priceInput: e.target.value, inputError: "" });
                  if (muted) goto(phases.indexOf("input"));
                }}
                placeholder="0.00"
                className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none disabled:opacity-70"
                style={fieldStyle(false)}
                autoComplete="off"
              />
            </div>
          )}

          {needsPayTaddr && (
            <div>
              <PhaseLabel complete={complete}>
                Payout address (t-address)
                {!complete && <RequiredAsterisk />}
              </PhaseLabel>
              <input
                type="text"
                value={s.payTaddrInput}
                disabled={muted}
                onChange={(e) => {
                  set({ payTaddrInput: e.target.value, inputError: "" });
                  if (muted) goto(phases.indexOf("input"));
                }}
                placeholder={network === "testnet" ? "tm…" : "t1…"}
                className="w-full rounded-2xl px-4 py-2.5 text-sm outline-none disabled:opacity-70"
                style={fieldStyle(
                  !!s.inputError &&
                    active &&
                    needsPayTaddr &&
                    /payout|transparent|checksum|t-address|tm or tn|t1 or t3/i.test(s.inputError),
                )}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          )}

          {isOwnerAction && (
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Changes to this name are authorized by{" "}
              <strong style={{ color: "var(--fg-heading)" }}>sending the owner passcodes</strong>.
            </p>
          )}

          {active && s.inputError ? (
            <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
              {s.inputError}
            </p>
          ) : null}
        </div>
      );
    }

    if (p === "otp") {
      return (
        <div
          className={`transition-opacity duration-300 ease-out ${muted ? "opacity-70" : "opacity-100"}`}
        >
          <PhaseLabel complete={complete}>Verify ownership</PhaseLabel>

          {/* Payment QR + send instructions collapse when leaving this step (like Send Payment). */}
          <div
            className="grid transition-[grid-template-rows,opacity] duration-500 ease-in-out"
            style={{
              gridTemplateRows: active ? "1fr" : "0fr",
              opacity: active ? 1 : 0,
            }}
            aria-hidden={!active}
          >
            <div className="min-h-0 overflow-hidden">
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                Send exact memo and minimum amount to the address below to receive a passcode.
              </p>
              {s.otpMemo ? (
                <div className="flex justify-center pt-4">
                  <QrBlock
                    address={getNetworkConstants(network).OTP_SIGNIN_ADDR}
                    amount={getNetworkConstants(network).OTP_AMOUNT}
                    memo={s.otpMemo}
                    size={180}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Persist after passcode is requested: summary + boxes (green after verify). */}
          {s.otpSent ? (
            <div
              className={`flex w-full flex-col items-center gap-3 ${active ? "mt-6" : "mt-2"}`}
            >
              <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
                The owner of <NameBadge name={name} /> will receive a passcode in their wallet.
              </p>
              <PasscodeBoxes
                id="name-action-passcode"
                value={s.otpCode}
                disabled={muted || s.otpVerified}
                error={active && !!s.otpError}
                success={
                  s.otpCode.length === 6 &&
                  !s.otpError &&
                  (s.otpVerified || complete)
                }
                autoFocus={active && !s.otpVerified}
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
              {active && (s.otpError || s.otpAttempts > 0) ? (
                <p className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                  {s.otpError ? (
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--accent-red, #e05252)" }}
                    >
                      {s.otpError}
                    </span>
                  ) : null}
                  {s.otpAttempts > 0 ? (
                    <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                      Attempt {s.otpAttempts} of {getNetworkConstants(network).OTP_MAX_ATTEMPTS}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    }

    if (p === "confirm") {
      return (
        <div
          className={`transition-opacity duration-300 ease-out ${muted ? "opacity-70" : "opacity-100"}`}
        >
          <PhaseLabel complete={complete}>{phaseHeader(action, "confirm")}</PhaseLabel>
          <p className="text-sm" style={{ color: "var(--fg-body)" }}>
            {modalDescription(action, "confirm", name, s)}
          </p>
          {s.uri && s.paymentAddress ? (
            <div
              className="grid transition-[grid-template-rows,opacity] duration-500 ease-in-out"
              style={{
                gridTemplateRows: active ? "1fr" : "0fr",
                opacity: active ? 1 : 0,
              }}
              aria-hidden={!active}
            >
              {/* Nested under copy so collapsed height leaves no leftover space-y gap. */}
              <div className="min-h-0 overflow-hidden">
                <div className="flex justify-center pt-4">
                  <QrBlock
                    address={s.paymentAddress}
                    amount={s.amountZec}
                    memo={s.memo}
                    size={200}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    if (p === "scanning") {
      if (s.scanState === "mined" && action !== "BUY") {
        return (
          <div className="w-full space-y-4">
            {/* Label stays left; success body is centered. */}
            <PhaseLabel complete>Scanning</PhaseLabel>
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <ZcashNamesLogoMark size={56} />
              <div className="flex w-full flex-col items-center text-center text-sm" style={{ color: "var(--fg-body)" }}>
                {minedMessage(action, name, s.address)}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <PhaseLabel complete={complete}>Scanning</PhaseLabel>
          <p className="text-sm" style={{ color: "var(--fg-body)" }}>
            {modalDescription(action, "scanning", name, s)}
          </p>
          <div
            className="flex w-full flex-col items-center justify-center rounded-xl p-5 text-center"
            style={{
              background: "var(--color-raised)",
              border: `1.5px solid ${s.scanState === "in_mempool" || s.scanState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
            }}
          >
            <p className="w-full text-center text-sm" style={{ color: "var(--fg-body)" }}>
              {scanningStatusMessage(action, s.scanState)}
            </p>
          </div>
        </div>
      );
    }

    if (p === "fund") {
      const listed = resolveResult.status === "listed" ? resolveResult : null;
      if (!listed) {
        return (
          <div className="space-y-2">
            <PhaseLabel complete={complete}>Listing withdrawn</PhaseLabel>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              This name is no longer for sale. Don&rsquo;t send the seller payment.
            </p>
          </div>
        );
      }
      return (
        <div className={`space-y-4 ${muted ? "opacity-70" : ""}`}>
          <div>
            <PhaseLabel complete={complete}>Pay the seller</PhaseLabel>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {modalDescription(action, "fund", name, s, {
                listingPriceZec: listed.listingPrice.zec,
              })}
            </p>
          </div>
          {listed.pendingBuy && (
            <p className="text-xs break-all" style={{ color: "#22c55e" }}>
              Locked to <AddressBadge address={listed.pendingBuy.buyer} />
            </p>
          )}
          {active && (
            <div className="flex justify-center">
              <QrBlock
                address={listed.payTaddr}
                amount={String(listed.listingPrice.zec)}
                memo=""
                size={200}
              />
            </div>
          )}
        </div>
      );
    }

    if (p === "settling") {
      if (s.settleState === "mined") {
        return (
          <div className="w-full space-y-4">
            {/* Label stays left; success body is centered. */}
            <PhaseLabel complete>Finalising purchase</PhaseLabel>
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <ZcashNamesLogoMark size={56} />
              <div className="flex w-full flex-col items-center text-center text-sm" style={{ color: "var(--fg-body)" }}>
                {minedMessage("BUY", name, s.address)}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <PhaseLabel complete={complete}>Finalising your purchase</PhaseLabel>
          <p className="text-sm" style={{ color: "var(--fg-body)" }}>
            {modalDescription(action, "settling", name, s)}
          </p>
          <div
            className="flex w-full flex-col items-center justify-center rounded-xl p-5 text-center"
            style={{
              background: "var(--color-raised)",
              border: `1.5px solid ${s.settleState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
            }}
          >
            <p className="w-full text-center text-sm" style={{ color: "var(--fg-body)" }}>
              {settlingStatusMessage(action, s.settleState)}
            </p>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <>
      <OtpBackWarningModal
        open={otpBackOpen}
        onCancel={() => setOtpBackOpen(false)}
        onConfirm={confirmOtpBack}
      />
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        aria-label={`${ACTION_LABELS[action]} ${name}`}
        className="w-full rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        }}
      >
        <div className="space-y-6">
          {visiblePhases.map((p, index) => {
            const active = index === s.step;
            const complete = index < s.step || (active && isSuccess);
            return (
              <div
                key={`${p}-${index}`}
                className={index < s.step ? "border-b pb-5" : undefined}
                style={
                  index < s.step
                    ? {
                        borderColor: "color-mix(in srgb, var(--faq-border) 72%, transparent)",
                      }
                    : undefined
                }
              >
                {renderPhaseBody(p, active, complete)}
              </div>
            );
          })}
        </div>

        <div
          className="mt-6 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-t pt-4 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--faq-border) 72%, transparent)",
            color: "var(--fg-muted)",
          }}
        >
          <div className="flex min-w-0 justify-start">
            {isSuccess ? successShareButton() : footerBack()}
          </div>
          <div className="justify-self-center whitespace-nowrap text-center">
            Step {Math.min(s.step + 1, phases.length)} of {phases.length}
          </div>
          <div className="flex min-w-0 justify-end">{footerPrimary()}</div>
        </div>
      </form>
    </>
  );
}
