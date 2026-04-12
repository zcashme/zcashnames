"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { buildTransaction, checkUnlockCode } from "@/lib/zns/transaction";
import { checkScannerState } from "@/lib/zns/resolve";
import { checkMempool } from "@/lib/zns/mempool";
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
  isReserved?: boolean;
}

interface Zip321ModalProps {
  target: ModalTarget;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Phase = "unlock" | "input" | "otp" | "payment" | "scanning";

type ScanState = "loading" | "not_detected" | "in_mempool" | "being_mined" | "mined";

const ACTION_LABEL: Record<Action, string> = {
  claim: "Claim",
  buy: "Buy",
  update: "Update Address",
  list: "List for Sale",
  delist: "Delist",
  release: "Release Name",
};

// Used in scanner copy: "Your {noun} hasn't been detected yet."
const ACTION_NOUN: Record<Action, string> = {
  claim: "claim",
  buy: "purchase",
  update: "address update",
  list: "listing",
  delist: "delist",
  release: "release",
};

function minedMessage(action: Action, displayName: string): string {
  switch (action) {
    case "claim":
      return `${displayName} is yours. Claim confirmed on-chain.`;
    case "buy":
      return `${displayName} is now yours. Purchase confirmed on-chain.`;
    case "update":
      return `Address updated. ${displayName} now resolves to your new address.`;
    case "list":
      return `${displayName} is now listed for sale.`;
    case "delist":
      return `${displayName} has been delisted.`;
    case "release":
      return `${displayName} has been released.`;
  }
}

function parsePrice(raw: string): number | null {
  const n = raw.replace(/,/g, "").trim();
  if (!n) return null;
  const num = Number(n);
  return Number.isFinite(num) && num > 0 ? num : null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zip321Modal({ target, onClose, onSuccess }: Zip321ModalProps) {
  const { name, action, registrationAddress, network, networkPassword, isReserved } = target;
  const { ZIP321_RECIPIENT_ADDRESS, OTP_SIGNIN_ADDR, OTP_AMOUNT, OTP_MAX_ATTEMPTS } =
    getNetworkConstants(network);

  const needsAddress = action === "claim" || action === "buy" || action === "update";
  const needsPrice = action === "list";
  const needsOtp = action === "update" || action === "list" || action === "delist" || action === "release";
  const needsUnlock = isReserved && action === "claim";
  const displayName = `${name}.zcash`;
  const explorerHref =
    network === "testnet"
      ? `/explorer?env=testnet&name=${encodeURIComponent(name)}`
      : `/explorer?name=${encodeURIComponent(name)}`;

  // Phase
  const [phase, setPhase] = useState<Phase>(needsUnlock ? "unlock" : "input");

  // Unlock phase
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [verifiedUnlockCode, setVerifiedUnlockCode] = useState<string | undefined>();

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

  // Scanning phase
  const [scanState, setScanState] = useState<ScanState>("loading");
  // Sticky flag: once we've seen the tx in the mempool during this scanning
  // session, treat any subsequent "empty mempool, empty resolver" as
  // "being_mined" rather than regressing to "not_detected".
  const sawMempoolRef = useRef(false);
  // One-shot guard so onSuccess fires at most once per scanning session.
  const firedSuccessRef = useRef(false);

  // QR theming
  const containerRef = useRef<HTMLDivElement>(null);
  const [qrFg, setQrFg] = useState("#f0f0f0");
  const [qrBg, setQrBg] = useState("#1e1e1e");

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

  // Scanner polling — fires every 2s while in the scanning phase, stops on mined.
  // Checks the mempool (mainnet only) and the resolver in parallel to handle the
  // case where the tx is mined before the user clicks "I Sent It!" and never
  // appears in the mempool we observe.
  useEffect(() => {
    if (phase !== "scanning") return;

    let cancelled = false;
    const expected = {
      address: needsAddress ? addressInput.trim() : undefined,
      priceZats: needsPrice ? Math.round((parsePrice(priceInput) ?? 0) * 1e8) : undefined,
    };

    async function poll() {
      const [mempool, resolver] = await Promise.all([
        checkMempool(name, network),
        checkScannerState(name, network, action, expected),
      ]);
      if (cancelled) return;

      if (mempool.found) sawMempoolRef.current = true;

      if (resolver === "success") {
        setScanState("mined");
        if (!firedSuccessRef.current) {
          firedSuccessRef.current = true;
          onSuccess?.(name);
        }
      } else if (mempool.found) setScanState("in_mempool");
      else if (sawMempoolRef.current) setScanState("being_mined");
      else setScanState("not_detected");
    }

    sawMempoolRef.current = false;
    firedSuccessRef.current = false;
    setScanState("loading");
    poll();
    const id = setInterval(() => {
      // Stop polling once we've reached the terminal state.
      if (scanStateRef.current === "mined") {
        clearInterval(id);
        return;
      }
      poll();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // We intentionally omit addressInput/priceInput from deps — they're
    // captured once when the scanning phase begins and shouldn't restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, name, network, action]);

  // Ref mirror so the interval callback can read the latest scan state without
  // having to re-create the interval on every state change.
  const scanStateRef = useRef<ScanState>("loading");
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

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

  async function handleUnlock() {
    if (unlockLoading) return;
    const code = unlockInput.trim();
    if (!code) { setUnlockError("Enter your unlock code."); return; }

    setUnlockError("");
    setUnlockLoading(true);
    try {
      const result = await checkUnlockCode(name, code);

      if (!result.ok) { setUnlockError(result.error || "Invalid unlock code."); return; }
      setVerifiedUnlockCode(code);
      setPhase("input");
    } catch {
      setUnlockError("Something went wrong. Try again.");
    } finally {
      setUnlockLoading(false);
    }
  }

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
        unlockCode: verifiedUnlockCode,
      });

      if (!result.ok) { setInputError(result.error); return; }
      goToPayment(result.memo, result.amountZec);
    } catch {
      setInputError("Something went wrong. Try again.");
    } finally {
      setInputLoading(false);
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
        unlockCode: verifiedUnlockCode,
        memo: zvsMemo,
        otp: code,
      });
      if (!result.ok) {
        setOtpAttempts((a) => a + 1);
        setOtpError(result.error);
        setOtpInput("");
        return;
      }
      goToPayment(result.memo, result.amountZec);
    } catch {
      setOtpError("Something went wrong. Try again.");
    } finally {
      setOtpLoading(false);
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
      setTimeout(() => setUriCopied(false), 2000);
    } catch { /* clipboard API blocked - user can copy from the code block */ }
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
        {/* ── Phase 0: Unlock (reserved names only) ── */}
        {phase === "unlock" && (
            <div className="p-8 flex flex-col gap-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                  Reserved Name
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                  <strong>{displayName}</strong> is reserved. Enter your unlock code to continue.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Unlock Code
                </label>
                <input
                  type="text"
                  value={unlockInput}
                  onChange={(e) => { setUnlockInput(e.target.value.toUpperCase()); setUnlockError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
                  placeholder="XXXX-XXXX-XXXX"
                  autoFocus
                  className="w-full rounded-xl px-4 py-3 text-sm font-mono tracking-[0.15em] outline-none text-center"
                  style={inputStyle(unlockError ? "var(--accent-red, #e05252)" : undefined)}
                />
              </div>

              {unlockError && (
                <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                  {unlockError}
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
                  onClick={handleUnlock}
                  disabled={unlockLoading}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={primaryBtnStyle}
                >
                  {unlockLoading ? "Verifying…" : "Unlock"}
                </button>
              </div>
            </div>
        )}

        {/* ── Phase 1: Input ── */}
        {phase === "input" && (
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
        )}

        {/* ── Phase 2: OTP ── */}
        {phase === "otp" && (
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
                    setTimeout(() => setOtpCopied(false), 2000);
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
        )}

        {/* ── Phase 3: Payment ── */}
        {phase === "payment" && (
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
                onClick={() => setPhase("scanning")}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
              >
                I Sent It!
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 4: Scanning ── */}
        {phase === "scanning" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                Scanning
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                Checking the mempool and resolver for <strong>{displayName}</strong>.
              </p>
            </div>

            <div
              className="w-full rounded-xl p-5 flex flex-col items-center gap-3"
              style={{
                background: "var(--color-raised)",
                border: `1.5px solid ${
                  scanState === "mined"
                    ? "#22c55e"
                    : scanState === "in_mempool" || scanState === "being_mined"
                      ? "#ca8a04"
                      : "var(--faq-border)"
                }`,
              }}
            >
              {scanState === "mined" ? (
                <span
                  className="flex items-center justify-center w-12 h-12 rounded-full"
                  style={{ background: "var(--color-accent-green-light)", color: "var(--color-accent-green)" }}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
              ) : (
                <span
                  className="inline-block w-6 h-6 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "var(--border-muted)",
                    borderTopColor: "var(--fg-heading)",
                  }}
                  aria-hidden="true"
                />
              )}

              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {scanState === "loading" && "Checking…"}
                {scanState === "not_detected" && (
                  <>Your {ACTION_NOUN[action]} hasn&rsquo;t been detected yet. It may not have propagated, or wasn&rsquo;t sent correctly.</>
                )}
                {scanState === "in_mempool" && (
                  <>Your {ACTION_NOUN[action]} is in the mempool. Waiting to be mined.</>
                )}
                {scanState === "being_mined" && (
                  <>Your {ACTION_NOUN[action]} is being mined. Hang tight &mdash; this should only take a moment.</>
                )}
                {scanState === "mined" && minedMessage(action, displayName)}
              </p>
            </div>

            <div className="flex gap-3 w-full justify-between items-center pt-1">
              <button
                type="button"
                onClick={() => setPhase("payment")}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                Back
              </button>
              <a
                href={explorerHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                View on Explorer
              </a>
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
        )}
      </div>
    </div>,
    document.body,
  );
}
