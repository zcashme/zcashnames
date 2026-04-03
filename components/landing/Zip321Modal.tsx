"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { buildTransaction } from "@/lib/zns/transaction";
import { validateAddress } from "@/lib/zns/name";
import { buildZcashUri } from "@/lib/payment/zip321";
import { generateSessionId, buildZvsMemo } from "@/lib/payment/memo";
import { getNetworkConstants, MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import type { Action } from "@/lib/types";
import type { Network } from "@/lib/zns/name";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModalTarget {
  name: string;
  action: Action;
  registrationAddress?: string;
  network: Network;
  networkPassword: string;
  unlockCode?: string;
}

interface Zip321ModalProps {
  target: ModalTarget;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Phase = "input" | "otp" | "payment";

const PHASE_ORDER: Phase[] = ["input", "otp", "payment"];
const TRANSITION = "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)";

function phaseTransform(
  view: Phase,
  current: Phase,
): { transform: string; pointerEvents: "auto" | "none" } {
  const vi = PHASE_ORDER.indexOf(view);
  const ci = PHASE_ORDER.indexOf(current);
  if (vi === ci) return { transform: "translate(0,0)", pointerEvents: "auto" };
  if (vi < ci) return { transform: "translateY(-100%)", pointerEvents: "none" };
  return { transform: "translateY(100%)", pointerEvents: "none" };
}

const ACTION_LABEL: Record<Action, string> = {
  claim: "Claim",
  buy: "Buy",
  update: "Update Address",
  list: "List for Sale",
  delist: "Delist",
  release: "Release Name",
};

function parsePrice(raw: string): number | null {
  const n = raw.replace(/,/g, "").trim();
  if (!n) return null;
  const num = Number(n);
  return Number.isFinite(num) && num > 0 ? num : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zip321Modal({ target, onClose }: Zip321ModalProps) {
  const { name, action, registrationAddress, network, networkPassword, unlockCode } = target;
  const { ZIP321_RECIPIENT_ADDRESS, OTP_SIGNIN_ADDR, OTP_AMOUNT, OTP_MAX_ATTEMPTS } =
    getNetworkConstants(network);

  const needsAddress = action === "claim" || action === "buy" || action === "update";
  const needsPrice = action === "list";
  const needsOtp = action === "update" || action === "list" || action === "delist" || action === "release";
  const displayName = `${name}.zcash`;

  // Phase
  const [phase, setPhase] = useState<Phase>("input");

  // Input phase
  const [addressInput, setAddressInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [inputLoading, setInputLoading] = useState(false);

  // OTP phase
  const [zvsMemo, setZvsMemo] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCopied, setOtpCopied] = useState(false);

  // Payment phase
  const [paymentUri, setPaymentUri] = useState("");
  const [paymentAmountZec, setPaymentAmountZec] = useState(0);
  const [uriCopied, setUriCopied] = useState(false);

  // QR theming
  const containerRef = useRef<HTMLDivElement>(null);
  const [qrFg, setQrFg] = useState("#f0f0f0");
  const [qrBg, setQrBg] = useState("#1e1e1e");

  // Prevent state updates after unmount
  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);

  // Read CSS variable colors for QR on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const s = getComputedStyle(containerRef.current);
    setQrFg(s.getPropertyValue("--fg-heading").trim() || "#f0f0f0");
    setQrBg(s.getPropertyValue("--color-raised").trim() || "#1e1e1e");
  }, []);

  // Focus first input on mount
  const addressRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (needsAddress) addressRef.current?.focus();
    else if (needsPrice) priceRef.current?.focus();
  }, [needsAddress, needsPrice]);

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Address validation (live)
  const addrValidation = addressInput.trim()
    ? validateAddress(addressInput.trim())
    : { valid: false, warning: "", rejected: false };

  const addrBorderColor = !addressInput.trim()
    ? "var(--faq-border)"
    : addrValidation.rejected
      ? "var(--accent-red, #e05252)"
      : addrValidation.valid && addrValidation.warning
        ? "#ca8a04"
        : addrValidation.valid
          ? "#22c55e"
          : "var(--faq-border)";

  // OTP URI
  const otpUri = zvsMemo ? buildZcashUri(OTP_SIGNIN_ADDR, OTP_AMOUNT, zvsMemo) : "";

  // ---- Handlers ----

  async function handleContinue() {
    if (inputLoading) return;
    setInputError("");

    // Validate address
    if (needsAddress) {
      const addr = addressInput.trim();
      if (!addr) { setInputError("Address is required."); return; }
      const v = validateAddress(addr);
      if (v.rejected || !v.valid) { setInputError(v.warning || "Invalid address format."); return; }
    }

    // Validate price
    if (needsPrice) {
      const zec = parsePrice(priceInput);
      if (!zec) { setInputError("Enter a valid price."); return; }
      if (zec < 0.001 || zec > MAX_LIST_FOR_SALE_AMOUNT) {
        setInputError("Price must be between 0.001 and 21,000,000 ZEC.");
        return;
      }
    }

    if (needsOtp) {
      // Generate OTP session and go to OTP phase
      const sid = generateSessionId();
      const memo = buildZvsMemo(sid, registrationAddress!);
      setZvsMemo(memo);
      setOtpInput("");
      setOtpAttempts(0);
      setOtpError("");
      setPhase("otp");
      return;
    }

    // claim / buy → call buildTransaction directly
    setInputLoading(true);
    try {
      const result = await buildTransaction({
        name,
        action,
        address: addressInput.trim() || undefined,
        network,
        password: networkPassword,
        unlockCode,
      });
      if (cancelledRef.current) return;
      if (!result.ok) { setInputError(result.error); return; }
      goToPayment(result.memo, result.amountZec);
    } catch {
      if (!cancelledRef.current) setInputError("Something went wrong. Try again.");
    } finally {
      if (!cancelledRef.current) setInputLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpLoading) return;
    const code = otpInput.trim();
    if (!/^\d{6}$/.test(code)) { setOtpError("Enter the 6-digit code from your wallet."); return; }
    if (otpAttempts >= OTP_MAX_ATTEMPTS) { setOtpError("Max attempts reached. Please start over."); return; }

    setOtpError("");
    setOtpLoading(true);
    try {
      const result = await buildTransaction({
        name,
        action,
        address: needsAddress ? addressInput.trim() : undefined,
        priceZats: needsPrice ? Math.round(parsePrice(priceInput)! * 1e8) : undefined,
        network,
        password: networkPassword,
        unlockCode,
        memo: zvsMemo,
        otp: code,
      });
      if (cancelledRef.current) return;
      if (!result.ok) {
        setOtpAttempts((a) => a + 1);
        setOtpError(result.error);
        setOtpInput("");
        return;
      }
      goToPayment(result.memo, result.amountZec);
    } catch {
      if (!cancelledRef.current) setOtpError("Something went wrong. Try again.");
    } finally {
      if (!cancelledRef.current) setOtpLoading(false);
    }
  }

  function handleStartOver() {
    const sid = generateSessionId();
    const memo = buildZvsMemo(sid, registrationAddress!);
    setZvsMemo(memo);
    setOtpInput("");
    setOtpAttempts(0);
    setOtpError("");
  }

  function goToPayment(memo: string, amountZec: number) {
    const uri = buildZcashUri(ZIP321_RECIPIENT_ADDRESS, String(amountZec), memo);
    setPaymentUri(uri);
    setPaymentAmountZec(amountZec);
    setPhase("payment");
  }

  async function handleCopyUri() {
    try {
      await navigator.clipboard.writeText(paymentUri);
      setUriCopied(true);
      setTimeout(() => { if (!cancelledRef.current) setUriCopied(false); }, 2000);
    } catch { /* clipboard API blocked — user can copy from the code block */ }
  }

  // ---- Shared styles ----

  const inputStyle = (borderOverride?: string): React.CSSProperties => ({
    background: "var(--color-raised)",
    border: `1.5px solid ${borderOverride ?? "var(--faq-border)"}`,
    color: "var(--fg-heading)",
  });

  const primaryBtnStyle: React.CSSProperties = {
    background: "var(--home-result-primary-bg)",
    color: "var(--home-result-primary-fg)",
    boxShadow: "var(--home-result-primary-shadow)",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1.5px solid var(--border-muted)",
    color: "var(--fg-body)",
  };

  // ---- Render ----

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative rounded-2xl w-full max-w-md overflow-hidden"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          maxHeight: "calc(100vh - 2rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Phase 1: Input ── */}
        <div
          style={{
            ...phaseTransform("input", phase),
            transition: TRANSITION,
            position: phase === "input" ? "relative" : "absolute",
            inset: phase !== "input" ? 0 : undefined,
            overflow: "auto",
          }}
        >
          <div className="p-8 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                {ACTION_LABEL[action]}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                {action === "release"
                  ? <>Permanently release <strong>{displayName}</strong>. This cannot be undone.</>
                  : action === "delist"
                    ? <>Remove <strong>{displayName}</strong> from sale.</>
                    : action === "list"
                      ? <>Set a price for <strong>{displayName}</strong>.</>
                      : action === "update"
                        ? <>Set a new address for <strong>{displayName}</strong>.</>
                        : <><strong>{displayName}</strong></>}
              </p>
            </div>

            {needsAddress && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  {action === "update" ? "New Zcash Address" : "Your Zcash Address"}
                </label>
                <input
                  ref={addressRef}
                  type="text"
                  value={addressInput}
                  onChange={(e) => { setAddressInput(e.target.value); setInputError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
                  placeholder="u1…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={inputStyle(addrBorderColor)}
                />
                {addressInput.trim() && addrValidation.warning && !addrValidation.rejected && (
                  <p className="text-xs" style={{ color: "#ca8a04" }}>{addrValidation.warning}</p>
                )}
              </div>
            )}

            {needsPrice && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Price (ZEC)
                </label>
                <input
                  ref={priceRef}
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => { setPriceInput(e.target.value); setInputError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleContinue(); }}
                  placeholder="0.00"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={inputStyle()}
                />
              </div>
            )}

            {inputError && (
              <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                {inputError}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={inputLoading}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                style={primaryBtnStyle}
              >
                {inputLoading ? "Signing…" : needsOtp ? "Continue" : ACTION_LABEL[action]}
              </button>
            </div>
          </div>
        </div>

        {/* ── Phase 2: OTP ── */}
        <div
          style={{
            ...phaseTransform("otp", phase),
            transition: TRANSITION,
            position: phase === "otp" ? "relative" : "absolute",
            inset: phase !== "otp" ? 0 : undefined,
            overflow: "auto",
          }}
        >
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                Verify Ownership
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                Scan the QR code with your Zcash wallet and send {OTP_AMOUNT} ZEC.
                You&rsquo;ll receive a 6-digit code.
              </p>
            </div>

            {otpUri && (
              <div className="rounded-xl p-3" style={{ background: qrBg }}>
                <QRCodeSVG value={otpUri} size={180} fgColor={qrFg} bgColor={qrBg} />
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              <code
                className="w-full text-left break-all rounded-lg px-3 py-2 text-xs select-all"
                style={{ background: "var(--color-raised)", color: "var(--fg-body)", border: "1px solid var(--border-muted)" }}
              >
                {otpUri}
              </code>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(otpUri);
                    setOtpCopied(true);
                    setTimeout(() => { if (!cancelledRef.current) setOtpCopied(false); }, 2000);
                  } catch { /* clipboard blocked */ }
                }}
                className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                {otpCopied ? "Copied!" : "Copy URI"}
              </button>
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-left" style={{ color: "var(--fg-muted)" }}>
                6-Digit Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpInput(v);
                  setOtpError("");
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
                placeholder="000000"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none text-center tracking-[0.3em] font-mono"
                style={inputStyle(otpError ? "var(--accent-red, #e05252)" : undefined)}
              />
            </div>

            {otpError && (
              <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                {otpError}
              </p>
            )}

            {otpAttempts > 0 && (
              <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                Attempt {otpAttempts} of {OTP_MAX_ATTEMPTS}
              </p>
            )}

            <div className="flex gap-3 w-full justify-between pt-1">
              <button
                type="button"
                onClick={handleStartOver}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                Start Over
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpLoading || otpAttempts >= OTP_MAX_ATTEMPTS}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                style={primaryBtnStyle}
              >
                {otpLoading ? "Verifying…" : "Verify Code"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Phase 3: Payment ── */}
        <div
          style={{
            ...phaseTransform("payment", phase),
            transition: TRANSITION,
            position: phase === "payment" ? "relative" : "absolute",
            inset: phase !== "payment" ? 0 : undefined,
            overflow: "auto",
          }}
        >
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <span
              className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ background: "var(--color-accent-green-light)", color: "var(--color-accent-green)" }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>

            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                Scan to {ACTION_LABEL[action]}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                Send <strong>{paymentAmountZec} ZEC</strong> to complete the transaction for <strong>{displayName}</strong>.
              </p>
            </div>

            {paymentUri && (
              <div className="rounded-xl p-3" style={{ background: qrBg }}>
                <QRCodeSVG value={paymentUri} size={200} fgColor={qrFg} bgColor={qrBg} />
              </div>
            )}

            <code
              className="w-full text-left break-all rounded-lg px-3 py-2 text-xs select-all"
              style={{ background: "var(--color-raised)", color: "var(--fg-body)", border: "1px solid var(--border-muted)" }}
            >
              {paymentUri}
            </code>

            <div className="flex gap-3 w-full justify-center pt-1">
              <button
                type="button"
                onClick={handleCopyUri}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                {uriCopied ? "Copied!" : "Copy URI"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
