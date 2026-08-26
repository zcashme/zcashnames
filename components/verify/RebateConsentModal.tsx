"use client";

import { useEffect, useId, useState } from "react";
import AnimatedLoadingLabel from "@/components/ui/AnimatedLoadingLabel";
import { buildVerifyTextFieldStyle } from "@/components/ui/formFieldStyles";
import { formatNoirWalletError, getNoirShieldedAddress } from "@/lib/wallets/noir";
import { rebateUnifiedAddressError } from "@/lib/waitlist/rebate-address";

type RebateConsentModalProps = {
  name: string;
  paymentAddress: string;
  initialAddress?: string;
  submitting: boolean;
  errorMessage: string;
  onCancel: () => void;
  onConsent: (unifiedAddress: string) => void | Promise<void>;
};

export default function RebateConsentModal({
  name,
  paymentAddress,
  initialAddress = "",
  submitting,
  errorMessage,
  onCancel,
  onConsent,
}: RebateConsentModalProps) {
  const titleId = useId();
  const inputId = useId();
  const [unifiedAddress, setUnifiedAddress] = useState(initialAddress);
  const [pastedNoirAddress, setPastedNoirAddress] = useState("");
  const [fillingFromNoir, setFillingFromNoir] = useState(false);
  const [noirFillError, setNoirFillError] = useState("");
  const trimmedAddress = unifiedAddress.trim();
  const addressError = trimmedAddress
    ? rebateUnifiedAddressError(trimmedAddress, paymentAddress)
    : null;
  const busy = submitting || fillingFromNoir;
  const pastedFromNoir =
    Boolean(pastedNoirAddress) && trimmedAddress === pastedNoirAddress.trim();
  const canConsent = Boolean(trimmedAddress) && !addressError && !busy;
  const [fieldActive, setFieldActive] = useState(false);
  const fieldStyle = {
    ...buildVerifyTextFieldStyle(Boolean(addressError)),
    ...(fieldActive && !addressError
      ? {
          borderColor: "var(--color-accent-interactive)",
          boxShadow: "0 0 0 1px var(--color-accent-interactive)",
        }
      : {}),
  };

  async function handleUseNoirAddress() {
    if (pastedFromNoir) return;
    setNoirFillError("");
    setFillingFromNoir(true);
    try {
      const shielded = await getNoirShieldedAddress();
      setUnifiedAddress(shielded);
      setPastedNoirAddress(shielded);
    } catch (error) {
      setNoirFillError(formatNoirWalletError(error));
    } finally {
      setFillingFromNoir(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, busy]);

  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="relative w-full max-w-[34rem] rounded-[2rem] border px-5 py-6 shadow-[0_28px_90px_rgba(22,35,66,0.22)] sm:px-7 sm:py-7"
        style={{
          borderColor: "var(--faq-border)",
          background: "var(--color-card)",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="zns-modal-close absolute right-5 top-5 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed"
          aria-label="Cancel rebate"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>

        <div className="mx-auto max-w-md text-center">
          <p
            className="text-sm font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--color-accent-interactive)" }}
          >
            Noir Rebate Available
          </p>
          <h3
            id={titleId}
            className="mt-2 text-balance text-3xl font-black tracking-[-0.05em] sm:text-4xl"
            style={{ color: "var(--fg-heading)" }}
          >
            {name.trim() || "This name"}
          </h3>
          <p className="mt-4 text-sm leading-7 sm:text-base" style={{ color: "var(--fg-body)" }}>
            Enter a shielded Unified Address to receive the rebate. This address and your
            reservation details will be shared with the Noir Wallet team to process the rebate.
          </p>
        </div>

        <label htmlFor={inputId} className="mt-6 block text-left text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
          Unified Address
        </label>
        <div
          className="mt-2 flex items-center gap-1.5 rounded-xl py-1.5 pl-3 pr-1.5"
          style={fieldStyle}
          onFocus={() => setFieldActive(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setFieldActive(false);
            }
          }}
        >
          <input
            id={inputId}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={unifiedAddress}
            onChange={(event) => setUnifiedAddress(event.target.value)}
            placeholder="u1…"
            className="min-w-0 flex-1 appearance-none overflow-hidden border-0 bg-transparent py-1.5 font-mono text-sm outline-none text-ellipsis whitespace-nowrap shadow-none focus:!border-0 focus:!shadow-none focus-visible:!border-0 focus-visible:!shadow-none"
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => void handleUseNoirAddress()}
            disabled={busy || pastedFromNoir}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-fg-body transition-colors duration-200 hover:text-[var(--color-accent-interactive)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "var(--color-raised, var(--color-card))",
              border: "1.5px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
            }}
          >
            {fillingFromNoir ? (
              <AnimatedLoadingLabel label="Pasting" active />
            ) : (
              <>
                <img
                  src="/wallets/noir/app-icon.png"
                  alt=""
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 rounded-sm"
                />
                {pastedFromNoir ? "Pasted from Noir" : "Paste from Noir"}
              </>
            )}
          </button>
        </div>
        {addressError ? (
          <p className="mt-2 text-left text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
            {addressError}
          </p>
        ) : null}

        {noirFillError ? (
          <p className="mt-2 text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
            {noirFillError}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-3 text-sm" style={{ color: "var(--accent-red, #e05252)" }}>
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-[46px] w-full cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold text-fg-body transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)] disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              background: "transparent",
              border: "1.5px solid color-mix(in srgb, var(--faq-border) 84%, transparent)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canConsent) return;
              void onConsent(trimmedAddress);
            }}
            disabled={!canConsent}
            className="inline-flex h-[46px] w-full cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100"
            style={{
              background: "var(--home-result-primary-bg)",
              color: "var(--home-result-primary-fg)",
              boxShadow: "var(--home-result-primary-shadow)",
            }}
          >
            {submitting ? <AnimatedLoadingLabel label="Saving" active /> : "Consent"}
          </button>
        </div>
      </div>
    </div>
  );
}
