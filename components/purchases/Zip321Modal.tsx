"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACTION_PHASES, getNetworkConstants } from "@/lib/types";
import type { Action, Network, Phase, ResolveName } from "@/lib/types";
import { checkUnlockCode, verifyOtp } from "@/lib/zns/actions";
import { validateAddress } from "@/lib/zns/utils";
import { generateSessionId, buildZvsMemo } from "@/lib/purchases/memo";
import { buildZcashUri } from "@/lib/purchases/zip321";

interface Zip321ModalProps {
  action: Action;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsePrice(raw: string): number | null {
  const n = raw.replace(/,/g, "").trim();
  if (!n) return null;
  const num = Number(n);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function decodeBase64ToBytes(value: string): Uint8Array | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!normalized) return null;
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  try {
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  // Ensure we pass a real ArrayBuffer (not a view over SharedArrayBuffer) to WebCrypto.
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function prepareDescription(action: Action, name: string, amount: string): React.ReactNode {
  switch (action) {
    case "BUY":
      return <>Purchase for <strong>{amount}</strong>.</>;
    case "DELIST":
      return <>Remove from sale.</>;
    case "RELEASE":
      return <>Allowing others to claim it.</>;
    case "UPDATE":
      return <>Set a new address.</>;
    case "LIST":
      return <>Set a price for <strong>{name}</strong>.</>;
    case "CLAIM":
      return <><strong>{name}</strong></>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zip321Modal({
  action,
  name,
  network,
  resolveResult,
  onClose,
  onSuccess,
}: Zip321ModalProps) {
  const phases: Phase[] = (() => {
    const base = [...ACTION_PHASES[action]];
    if (action === "CLAIM" && resolveResult.status === "reserved") {
      base.unshift("unlock");
    }
    return base;
  })();
  const [step, setStep] = useState(0);
  const phase = phases[step] ?? phases[phases.length - 1];

  const [address, setAddress] = useState<string>();
  const [price, setPrice] = useState<string>();
  const [proof, setProof] = useState<string>();
  const [uri, setUri] = useState<string>();

  // unlock phase
  const [unlockCode, setUnlockCode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);

  async function handleUnlock() {
    if (unlockLoading) return;
    const code = unlockCode.trim();
    if (!code) { setUnlockError("Enter your unlock code."); return; }
    setUnlockError("");
    setUnlockLoading(true);
    try {
      const result = await checkUnlockCode(name, code);
      if (!result.ok) { setUnlockError(result.error || "Invalid unlock code."); return; }
      advance({ proof: result.proof });
    } catch {
      setUnlockError("Something went wrong. Try again.");
    } finally {
      setUnlockLoading(false);
    }
  }

  // input phase
  const [addressInput, setAddressInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [payTaddrInput, setPayTaddrInput] = useState("");
  const [inputError, setInputError] = useState("");

  const needsAddress = action === "CLAIM" || action === "BUY" || action === "UPDATE";
  const needsPrice = action === "LIST";
  const needsPayTaddr = action === "LIST";

  function handleInputContinue() {
    setInputError("");
    if (needsAddress) {
      const addr = addressInput.trim();
      if (!addr) { setInputError("Address is required."); return; }
      const v = validateAddress(addr);
      if (v.status === "viewkey" || v.status === "tex" || v.status === "invalid") {
        setInputError(v.warning || "Invalid address format."); return;
      }
    }
    if (needsPrice) {
      const zec = parsePrice(priceInput);
      if (zec === null) { setInputError("Enter a valid price."); return; }
      if (zec < 0 || zec > 21_000_000) { setInputError("Price must be between 0 and 21,000,000 ZEC."); return; }
    }
    if (needsPayTaddr) {
      if (!payTaddrInput.trim()) { setInputError("Payout address is required."); return; }
    }
    advance({
      address: needsAddress ? addressInput.trim() : undefined,
      price: needsPrice ? priceInput.trim() : undefined,
    });
  }

  function advance(result?: Record<string, string>) {
    if (result) {
      if (result.address !== undefined) setAddress(result.address);
      if (result.price !== undefined) setPrice(result.price);
      if (result.proof !== undefined) setProof(result.proof);
      if (result.uri !== undefined) setUri(result.uri);
    }
    setStep((s) => Math.min(s + 1, phases.length - 1));
  }

  // OTP phase
  const [otpMemo, setOtpMemo] = useState("");
  const [otpUri, setOtpUri] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // Initialize OTP on entering the phase
  useEffect(() => {
    if (phase !== "otp") return;
    const regAddr = "registration" in resolveResult ? resolveResult.registration.address : "";
    const sid = generateSessionId();
    const memo = buildZvsMemo(sid, regAddr);
    const { OTP_SIGNIN_ADDR, OTP_AMOUNT } = getNetworkConstants(network);
    setOtpMemo(memo);
    setOtpUri(buildZcashUri(OTP_SIGNIN_ADDR, OTP_AMOUNT, memo));
    setOtpCode("");
    setOtpError("");
    setOtpSent(false);
    setOtpAttempts(0);
  }, [phase, resolveResult, network]);

  async function handleVerifyOtp() {
    if (otpLoading) return;
    if (!otpSent) { setOtpError("Send the verification transaction first."); return; }
    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) { setOtpError("Enter the 6-digit code from your wallet."); return; }
    const { OTP_MAX_ATTEMPTS } = getNetworkConstants(network);
    if (otpAttempts >= OTP_MAX_ATTEMPTS) { setOtpError("Max attempts reached."); return; }
    setOtpError("");
    setOtpLoading(true);
    try {
      const regAddr = "registration" in resolveResult ? resolveResult.registration.address : "";
      const result = await verifyOtp(otpMemo, code, regAddr);
      if (!result.ok) {
        setOtpAttempts((a) => a + 1);
        setOtpError(result.error);
        setOtpCode("");
        return;
      }
      advance({ proof: result.proof });
    } catch {
      setOtpError("Something went wrong. Try again.");
    } finally {
      setOtpLoading(false);
    }
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
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
        className="relative rounded-2xl w-full max-w-md overflow-visible p-8"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          color: "var(--fg-body)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "unlock" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Reserved Name</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              <strong>{name}.zcash</strong> is reserved. Enter your unlock code to continue.
            </p>
            <input type="text" value={unlockCode} autoFocus
              onChange={(e) => { setUnlockCode(e.target.value.toUpperCase()); setUnlockError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full rounded-xl px-4 py-3 text-sm font-mono tracking-[0.15em] outline-none text-center"
              style={{ background: "var(--color-raised)", border: `1.5px solid ${unlockError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
            {unlockError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{unlockError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>Cancel</button>
              <button type="button" onClick={handleUnlock} disabled={unlockLoading}
                className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {unlockLoading ? "Verifying…" : "Unlock"}
              </button>
            </div>
          </div>
        )}
        {phase === "input" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {prepareDescription(action, name, "")}
            </p>
            {needsAddress && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  {action === "UPDATE" ? "New Zcash Address" : "Your Zcash Address"}
                </label>
                <input type="text" value={addressInput} autoFocus
                  onChange={(e) => { setAddressInput(e.target.value); setInputError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                  placeholder="u1…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            {needsPrice && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Price (ZEC)</label>
                <input type="text" inputMode="decimal" value={priceInput}
                  onChange={(e) => { setPriceInput(e.target.value); setInputError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                  placeholder="0.00"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            {needsPayTaddr && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Payout Address (t-address)</label>
                <input type="text" value={payTaddrInput}
                  onChange={(e) => { setPayTaddrInput(e.target.value); setInputError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                  placeholder="t1…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            {inputError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{inputError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>Cancel</button>
              <button type="button" onClick={handleInputContinue}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                Continue
              </button>
            </div>
          </div>
        )}
        {phase === "otp" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Verify Ownership</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Send exact amount and memo to the address below to request a verification code.
            </p>
            {otpUri && (
              <code className="w-full break-all rounded-lg px-3 py-2 text-xs text-left"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}>
                {otpUri}
              </code>
            )}
            {!otpSent ? (
              <button type="button" onClick={() => { setOtpSent(true); setOtpError(""); }}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                I Sent It!
              </button>
            ) : (
              <>
                <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
                  onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
                  placeholder="000000" autoFocus
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none text-center tracking-[0.3em] font-mono"
                  style={{ background: "var(--color-raised)", border: `1.5px solid ${otpError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
                <button type="button" onClick={handleVerifyOtp} disabled={!otpCode.trim() || otpLoading}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                  {otpLoading ? "Verifying…" : "Verify Code"}
                </button>
              </>
            )}
            {otpError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{otpError}</p>}
            {otpAttempts > 0 && (
              <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                Attempt {otpAttempts} of {getNetworkConstants(network).OTP_MAX_ATTEMPTS}
              </p>
            )}
          </div>
        )}
        {phase === "confirm" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Send Payment</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Send exact amount and memo to complete the transaction.
            </p>
            {uri && (
              <code className="w-full break-all rounded-lg px-3 py-2 text-xs text-left"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}>
                {uri}
              </code>
            )}
            <button type="button" onClick={() => advance()}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
              I Sent It!
            </button>
          </div>
        )}
        {phase !== "unlock" && phase !== "input" && phase !== "otp" && phase !== "confirm" && (
          <>
            <p className="text-sm">Phase: {phase} ({step + 1}/{phases.length})</p>
            {address && <p className="text-xs mt-1">Address: {address}</p>}
            {price && <p className="text-xs mt-1">Price: {price}</p>}
            {proof && <p className="text-xs mt-1">Proof: {proof.slice(0, 16)}…</p>}
            {uri && <p className="text-xs mt-1 break-all">URI: {uri}</p>}
            {step < phases.length - 1 && (
              <button type="button" onClick={() => advance()}
                className="mt-4 px-4 py-2 rounded-full text-xs font-semibold"
                style={{
                  background: "var(--home-result-primary-bg)",
                  color: "var(--home-result-primary-fg)",
                  boxShadow: "var(--home-result-primary-shadow)",
                }}>
                Next → {phases[step + 1]}
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
