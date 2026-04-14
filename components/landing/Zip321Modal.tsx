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
import { useCopy } from "@/lib/useCopy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModalTarget {
  name: string;
  action: Action;
  registrationAddress?: string;
  registrationNonce?: number;
  registrationPubkey?: string | null;
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

type Phase = "unlock" | "input" | "otp" | "sign" | "payment" | "scanning";

type AuthMode = "default" | "otp" | "sovereign";

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

function buildSovereignPayload(
  action: Action,
  name: string,
  _network: Network,
  params: { address?: string; priceZats?: number; nonce?: number },
): string {
  switch (action) {
    case "claim":
      return `CLAIM:${name}:${params.address ?? ""}`;
    case "buy":
      return `BUY:${name}:${params.address ?? ""}`;
    case "update":
      return `UPDATE:${name}:${params.address ?? ""}:${params.nonce ?? ""}`;
    case "list":
      return `LIST:${name}:${params.priceZats ?? ""}:${params.nonce ?? ""}`;
    case "delist":
      return `DELIST:${name}:${params.nonce ?? ""}`;
    case "release":
      return `RELEASE:${name}:${params.nonce ?? ""}`;
  }
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zip321Modal({ target, onClose, onSuccess }: Zip321ModalProps) {
  const {
    name,
    action,
    registrationAddress,
    registrationNonce,
    registrationPubkey,
    network,
    networkPassword,
    isReserved,
  } = target;
  const { ZIP321_RECIPIENT_ADDRESS, OTP_SIGNIN_ADDR, OTP_AMOUNT, OTP_MAX_ATTEMPTS } =
    getNetworkConstants(network);

  const needsAddress = action === "claim" || action === "buy" || action === "update";
  const needsPrice = action === "list";
  const ownerAction = action === "update" || action === "list" || action === "delist" || action === "release";
  const needsUnlock = isReserved && action === "claim";
  const displayName = `${name}.zcash`;
  const explorerHref =
    network === "testnet"
      ? `/explorer?env=testnet&name=${encodeURIComponent(name)}`
      : `/explorer?name=${encodeURIComponent(name)}`;

  // Phase
  const [phase, setPhase] = useState<Phase>(needsUnlock ? "unlock" : "input");

  const otpCopy = useCopy();
  const payloadCopy = useCopy();
  const uriCopy = useCopy();

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
  const [authMode, setAuthMode] = useState<AuthMode>(ownerAction ? "otp" : "default");
  const [signError, setSignError] = useState("");
  const [signLoading, setSignLoading] = useState(false);
  const [sovereignPubkeyInput, setSovereignPubkeyInput] = useState("");
  const [signatureInput, setSignatureInput] = useState("");
  const [pubkeyLiveError, setPubkeyLiveError] = useState("");
  const [signatureLiveError, setSignatureLiveError] = useState("");

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
  const [sovereignPayloadCopied, setSovereignPayloadCopied] = useState(false);

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
  const sovereignPubkeyRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLTextAreaElement>(null);
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
  const isSovereignMode = authMode === "sovereign";
  const usesOtpFlow = ownerAction && authMode === "otp";
  const requiresPubkeyInput = !ownerAction || !registrationPubkey;
  const nextOwnerNonce = ownerAction ? (registrationNonce ?? 0) + 1 : undefined;
  const parsedPrice = parsePrice(priceInput);
  const priceZats = needsPrice && parsedPrice ? Math.round(parsedPrice * 1e8) : undefined;
  const sovereignPayload = buildSovereignPayload(action, name, network, {
    address: needsAddress ? addressInput.trim() : undefined,
    priceZats,
    nonce: nextOwnerNonce,
  });

  useEffect(() => {
    if (phase !== "sign") return;
    if (requiresPubkeyInput) sovereignPubkeyRef.current?.focus();
    else signatureRef.current?.focus();
  }, [phase, requiresPubkeyInput]);

  useEffect(() => {
    let cancelled = false;
    if (phase !== "sign") {
      setPubkeyLiveError("");
      setSignatureLiveError("");
      return;
    }

    const effectivePub = (registrationPubkey ?? sovereignPubkeyInput).trim();
    const sig = signatureInput.trim();

    (async () => {
      let pubError = "";
      let signatureError = "";
      let pubKey: CryptoKey | null = null;

      if (requiresPubkeyInput && sovereignPubkeyInput.trim()) {
        const pubBytes = decodeBase64ToBytes(sovereignPubkeyInput);
        if (!pubBytes) pubError = "Public key must be valid base64.";
        else if (pubBytes.length !== 32) pubError = "Public key must decode to 32 bytes.";
        else if (!window.crypto?.subtle) pubError = "WebCrypto is unavailable in this browser.";
        else {
          try {
            pubKey = await window.crypto.subtle.importKey(
              "raw",
              toArrayBuffer(pubBytes),
              { name: "Ed25519" },
              false,
              ["verify"],
            );
          } catch {
            pubError = "Public key is not a valid Ed25519 key.";
          }
        }
      } else if (!requiresPubkeyInput && effectivePub && window.crypto?.subtle) {
        const pubBytes = decodeBase64ToBytes(effectivePub);
        if (pubBytes && pubBytes.length === 32) {
          try {
            pubKey = await window.crypto.subtle.importKey(
              "raw",
              toArrayBuffer(pubBytes),
              { name: "Ed25519" },
              false,
              ["verify"],
            );
          } catch {
            pubKey = null;
          }
        }
      }

      if (sig) {
        const sigBytes = decodeBase64ToBytes(sig);
        if (!sigBytes) signatureError = "Signature must be valid base64.";
        else if (sigBytes.length !== 64) signatureError = "Signature must decode to 64 bytes.";
        else if (!effectivePub) signatureError = "Enter a valid public key first.";
        else if (!window.crypto?.subtle) signatureError = "WebCrypto is unavailable in this browser.";
        else {
          if (!pubKey) {
            const pubBytes = decodeBase64ToBytes(effectivePub);
            if (pubBytes && pubBytes.length === 32) {
              try {
                pubKey = await window.crypto.subtle.importKey(
                  "raw",
                  toArrayBuffer(pubBytes),
                  { name: "Ed25519" },
                  false,
                  ["verify"],
                );
              } catch {
                pubKey = null;
              }
            }
          }
          if (!pubKey) signatureError = "Enter a valid public key first.";
          else {
            const payloadBytes = new TextEncoder().encode(sovereignPayload);
            const verified = await window.crypto.subtle.verify(
              "Ed25519",
              pubKey,
              toArrayBuffer(sigBytes),
              payloadBytes,
            );
            if (!verified) signatureError = "Signature does not match the payload and public key.";
          }
        }
      }

      if (cancelled) return;
      setPubkeyLiveError(pubError);
      setSignatureLiveError(signatureError);
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, requiresPubkeyInput, registrationPubkey, sovereignPubkeyInput, signatureInput, sovereignPayload]);

  const canSubmitSovereign =
    !signLoading &&
    !!signatureInput.trim() &&
    (!requiresPubkeyInput || !!sovereignPubkeyInput.trim()) &&
    !pubkeyLiveError &&
    !signatureLiveError;

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
      const zec = parsedPrice;
      if (!zec) { setInputError("Enter a valid price."); return; }
      if (zec < 0.001 || zec > MAX_LIST_FOR_SALE_AMOUNT) {
        setInputError("Price must be between 0.001 and 21,000,000 ZEC.");
        return;
      }
    }

    if (isSovereignMode) {
      if (ownerAction && !registrationNonce && registrationNonce !== 0) {
        setInputError("Registration nonce unavailable. Search the name again and retry.");
        return;
      }
      setSignError("");
      setPhase("sign");
      return;
    }

    if (usesOtpFlow) {
      if (!registrationAddress) {
        setInputError("Registration address unavailable. Search the name again and retry.");
        return;
      }
      // Generate OTP session and go to OTP phase
      const sid = generateSessionId();
      const memo = buildZvsMemo(sid, registrationAddress);
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
        priceZats,
        network,
        password: networkPassword,
        unlockCode: verifiedUnlockCode,
        authMode: "default",
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
        priceZats,
        network,
        password: networkPassword,
        unlockCode: verifiedUnlockCode,
        memo: zvsMemo,
        otp: code,
        authMode: "otp",
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

  async function handleVerifySovereign() {
    if (signLoading) return;
    const sig = signatureInput.trim();
    const pub = (registrationPubkey ?? sovereignPubkeyInput).trim();

    if (!sig) {
      setSignError("Signature is required.");
      return;
    }
    if (requiresPubkeyInput && !pub) {
      setSignError("Public key is required.");
      return;
    }

    setSignError("");
    setSignLoading(true);
    try {
      if (!window.crypto?.subtle) {
        setSignError("WebCrypto is unavailable in this browser.");
        return;
      }

      const pubBytes = decodeBase64ToBytes(pub);
      if (!pubBytes || pubBytes.length !== 32) {
        setSignError("Enter a valid base64 Ed25519 public key (32 bytes).");
        return;
      }
      const sigBytes = decodeBase64ToBytes(sig);
      if (!sigBytes || sigBytes.length !== 64) {
        setSignError("Enter a valid base64 Ed25519 signature (64 bytes).");
        return;
      }

      let importedPubkey: CryptoKey;
      try {
        importedPubkey = await window.crypto.subtle.importKey(
          "raw",
          toArrayBuffer(pubBytes),
          { name: "Ed25519" },
          false,
          ["verify"],
        );
      } catch {
        setSignError("Public key is not a valid Ed25519 key.");
        return;
      }

      const payloadBytes = new TextEncoder().encode(sovereignPayload);
      const locallyVerified = await window.crypto.subtle.verify(
        "Ed25519",
        importedPubkey,
        toArrayBuffer(sigBytes),
        payloadBytes,
      );
      if (!locallyVerified) {
        setSignError("Signature does not match the payload and public key.");
        return;
      }

      const result = await buildTransaction({
        name,
        action,
        address: needsAddress ? addressInput.trim() : undefined,
        priceZats,
        network,
        password: networkPassword,
        unlockCode: verifiedUnlockCode,
        authMode: "sovereign",
        sovereignSignature: sig,
        sovereignPubkey: pub || undefined,
        sovereignPayload,
      });
      if (!result.ok) {
        setSignError(result.error);
        return;
      }
      goToPayment(result.memo, result.amountZec);
    } catch {
      setSignError("Something went wrong. Try again.");
    } finally {
      setSignLoading(false);
    }
  }

  function handleStartOver() {
    if (!registrationAddress) {
      setOtpError("Registration address unavailable. Search the name again and retry.");
      return;
    }
    const sid = generateSessionId();
    const memo = buildZvsMemo(sid, registrationAddress);
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

  async function handleCopySovereignPayload() {
    try {
      await navigator.clipboard.writeText(sovereignPayload);
      setSovereignPayloadCopied(true);
      setTimeout(() => setSovereignPayloadCopied(false), 2000);
    } catch { /* clipboard API blocked */ }
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                Changes to this name will be authorized by
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ownerAction ? (
                  <>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("otp"); setInputError(""); setSignError(""); }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                      style={{
                        ...(authMode === "otp" ? primaryBtnStyle : secondaryBtnStyle),
                        opacity: authMode === "otp" ? 1 : 0.85,
                      }}
                    >
                      Passcodes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("sovereign"); setInputError(""); setSignError(""); }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                      style={{
                        ...(authMode === "sovereign" ? primaryBtnStyle : secondaryBtnStyle),
                        opacity: authMode === "sovereign" ? 1 : 0.85,
                      }}
                    >
                      Keypairs
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("default"); setInputError(""); setSignError(""); }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                      style={{
                        ...(authMode === "default" ? primaryBtnStyle : secondaryBtnStyle),
                        opacity: authMode === "default" ? 1 : 0.85,
                      }}
                    >
                      Passcodes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAuthMode("sovereign"); setInputError(""); setSignError(""); }}
                      className="rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                      style={{
                        ...(authMode === "sovereign" ? primaryBtnStyle : secondaryBtnStyle),
                        opacity: authMode === "sovereign" ? 1 : 0.85,
                      }}
                    >
                      Keypairs
                    </button>
                  </>
                )}
              </div>
            </div>

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
                {inputLoading
                  ? "Preparing…"
                  : isSovereignMode
                    ? "Continue to Sign"
                    : usesOtpFlow
                      ? "Continue"
                      : ACTION_LABEL[action]}
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
                onClick={() => otpCopy.copy(otpUri)}
                className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                {otpCopy.copied ? "Copied!" : "Copy URI"}
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

        {/* ── Phase 3: Sovereign Sign ── */}
        {phase === "sign" && (
          <div className="p-8 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                Sovereign Signature
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                Sign this payload with your Ed25519 private key to authorize <strong>{ACTION_LABEL[action].toLowerCase()}</strong> for <strong>{displayName}</strong>.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                Payload to Sign
              </label>
              <code
                className="w-full text-left break-all rounded-lg px-3 py-2 text-xs select-all font-mono"
                style={{ background: "var(--color-raised)", color: "var(--fg-body)", border: "1px solid var(--border-muted)" }}
              >
                {sovereignPayload}
              </code>
              <div className="self-start flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => payloadCopy.copy(sovereignPayload)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={secondaryBtnStyle}
                >
                  {payloadCopy.copied ? "Copied!" : "Copy Payload"}
                </button>
                <a
                  href={`/keypair?payload=${encodeURIComponent(sovereignPayload)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)", textDecoration: "none" }}
                >
                  Open Keypair Tool
                </a>
              </div>
            </div>

            {ownerAction && registrationPubkey && (
              <p className="text-xs break-all" style={{ color: "var(--fg-muted)" }}>
                Owner public key from resolver: <span className="font-mono">{registrationPubkey}</span>
              </p>
            )}

            {requiresPubkeyInput && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Public key (base64)
                </label>
                <input
                  ref={sovereignPubkeyRef}
                  type="text"
                  value={sovereignPubkeyInput}
                  onChange={(e) => { setSovereignPubkeyInput(e.target.value.trim()); setSignError(""); }}
                  placeholder="Paste your ed25519 public key"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono"
                  style={inputStyle(pubkeyLiveError ? "var(--accent-red, #e05252)" : undefined)}
                />
                {sovereignPubkeyInput.trim() && (
                  <p
                    className="text-xs"
                    style={{ color: pubkeyLiveError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}
                  >
                    {pubkeyLiveError || "Valid Ed25519 public key."}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                Signature (base64)
              </label>
              <textarea
                ref={signatureRef}
                value={signatureInput}
                onChange={(e) => { setSignatureInput(e.target.value.trim()); setSignError(""); }}
                rows={3}
                placeholder="Paste signed payload"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono resize-none"
                style={inputStyle(signatureLiveError ? "var(--accent-red, #e05252)" : undefined)}
              />
              {signatureInput.trim() && (
                <p
                  className="text-xs"
                  style={{ color: signatureLiveError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}
                >
                  {signatureLiveError || "Valid Ed25519 signature for this payload."}
                </p>
              )}
            </div>

            {signError && (
              <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                {signError}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                type="button"
                onClick={() => setPhase("input")}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleVerifySovereign}
                disabled={!canSubmitSovereign}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                style={primaryBtnStyle}
              >
                {signLoading ? "Verifying…" : "Use Signature"}
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 4: Payment ── */}
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
                onClick={() => uriCopy.copy(paymentUri)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                {uriCopy.copied ? "Copied!" : "Copy URI"}
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

        {/* ── Phase 5: Scanning ── */}
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
