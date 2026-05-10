"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACTION_PHASES, getNetworkConstants } from "@/lib/types";
import type { Action, Network, Phase, ResolveName, ScanState } from "@/lib/types";
import {
  checkUnlockCode,
  verifyOtp,
  claimAction,
  buyAction,
  updateAction,
  listAction,
  delistAction,
  releaseAction,
} from "@/lib/zns/actions";
import { validateAddress } from "@/lib/zns/utils";
import { generateSessionId, buildZvsMemo } from "@/lib/purchases/memo";
import { zip321Uri } from "@/lib/purchases/zip321";
import { checkMempool } from "@/lib/zns/mempool";
import { generatePayload } from "@/lib/zns/payload";
import { QrBlock } from "@/components/ui/QrBlock";

// Central purchase/action UX. Renders a portaled modal that walks the user
// through a sequence of phases defined in ACTION_PHASES (types.ts).
//
// Phase pipeline (order varies by action):
//   unlock → input → otp|sign → confirm → fund → scanning
//
// Two auth paths diverge at the auth phase:
//   - OTP:  send a verification tx, receive a 6-digit code, verify server-side.
//   - Sign: sign a payload with an Ed25519 private key (sovereign auth for
//           names that have a registered pubkey).
//
// Each phase that calls a server action (claimAction, buyAction, etc.) receives
// a ZIP-321 payment URI, which is shown as a copyable code block in the
// confirm/fund phases. The final scanning phase polls checkMempool() every 2s
// until the transaction is mined or rejected, then fires onSuccess.
//
// Portaled to document.body via createPortal to avoid z-index stacking issues.

interface Zip321ModalProps {
  action: Action;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  onClose: () => void;
  onSuccess?: (name: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers — pure utility functions used across phases
// ---------------------------------------------------------------------------

function parsePrice(raw: string): number | null {
  const n = raw.replace(/,/g, "").trim();
  if (!n) return null;
  const num = Number(n);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

// Decodes a URL-safe base64 string to raw bytes (used for Ed25519 key/sig).
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

// Converts Uint8Array to a standalone ArrayBuffer for WebCrypto (Ed25519 verify).
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

// Builds the human-readable description shown in the input phase header.
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
  // Derive the phase sequence. Start from ACTION_PHASES[action], then:
  //   - Prepend "unlock" if claiming a reserved name (requires unlock code).
  //   - Swap OTP→sign if the name has a registered Ed25519 pubkey (sovereign auth).
  const phases: Phase[] = (() => {
    const base = [...ACTION_PHASES[action]];
    if (action === "CLAIM" && resolveResult.status === "reserved") {
      base.unshift("unlock");
    }
    if ("registration" in resolveResult && resolveResult.registration.pubkey) {
      const idx = base.indexOf("otp" as Phase);
      if (idx !== -1) base[idx] = "sign";
    }
    return base;
  })();
  const [step, setStep] = useState(0);
  const phase = phases[step] ?? phases[phases.length - 1];

  const [address, setAddress] = useState<string>();
  const [price, setPrice] = useState<string>();
  const [proof, setProof] = useState<string>();
  const [uri, setUri] = useState<string>();
  const [memo, setMemo] = useState<string>();

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

      // Call server action to build the signed memo
      const actionResult = await claimAction(name, address ?? "", network, result.proof);
      if (!actionResult.ok) { setUnlockError(actionResult.error); return; }
      advance({ uri: actionResult.uri, memo: actionResult.memo });
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

    // Call server action for actions that need it (non-reserved CLAIM, BUY, LIST after input)
    if (action === "CLAIM") {
      // Non-reserved CLAIM path — no unlockProof
      claimAction(name, addressInput.trim(), network, undefined).then((result) => {
        if (!result.ok) { setInputError(result.error); return; }
        advance({ address: addressInput.trim(), uri: result.uri, memo: result.memo });
      });
    } else if (action === "BUY") {
      buyAction(name, addressInput.trim(), network, undefined).then((result) => {
        if (!result.ok) { setInputError(result.error); return; }
        advance({ address: addressInput.trim(), uri: result.uri, memo: result.memo });
      });
    } else if (action === "LIST") {
      const zec = parsePrice(priceInput) ?? 0;
      const priceZats = Math.round(zec * 1e8);
      listAction(name, priceZats, payTaddrInput.trim(), network, undefined).then((result) => {
        if (!result.ok) { setInputError(result.error); return; }
        advance({ address: addressInput.trim(), price: priceInput.trim(), uri: result.uri, memo: result.memo });
      });
    } else {
      advance({
        address: needsAddress ? addressInput.trim() : undefined,
        price: needsPrice ? priceInput.trim() : undefined,
      });
    }
  }

  function advance(result?: Record<string, string | undefined>) {
    if (result) {
      if (result.address !== undefined) setAddress(result.address);
      if (result.price !== undefined) setPrice(result.price);
      if (result.proof !== undefined) setProof(result.proof);
      if (result.uri !== undefined) setUri(result.uri);
      if (result.memo !== undefined) setMemo(result.memo);
    }
    setStep((s) => Math.min(s + 1, phases.length - 1));
  }

  // OTP phase — generates a session-id–based memo and ZIP-321 URI on entry.
  // User sends the tx, clicks "I Sent It!", then enters the 6-digit code
  // received from the wallet. The code is verified via verifyOtp() server-side.
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
    setOtpUri(zip321Uri(OTP_SIGNIN_ADDR, OTP_AMOUNT, memo).uri);
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

      // Call server action to build the signed memo
      let actionResult: { ok: true; uri: string; memo: string } | { ok: false; error: string };
      if (action === "UPDATE") {
        actionResult = await updateAction(name, address ?? "", network, result.proof);
      } else if (action === "LIST") {
        actionResult = await listAction(name, Math.round((parsePrice(price ?? "") ?? 0) * 1e8), payTaddrInput ?? "", network, result.proof);
      } else if (action === "DELIST") {
        actionResult = await delistAction(name, network, result.proof);
      } else if (action === "RELEASE") {
        actionResult = await releaseAction(name, network, result.proof);
      } else {
        actionResult = { ok: false, error: "Unknown action." };
      }

      if (!actionResult.ok) { setOtpError(actionResult.error); setOtpLoading(false); return; }
      advance({ uri: actionResult.uri, memo: actionResult.memo });
    } catch {
      setOtpError("Something went wrong. Try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  // Sign phase — sovereign auth path (Ed25519). User signs a deterministic
  // payload with their private key, pastes the base64 pubkey+signature.
  // Verification runs client-side via WebCrypto, then the server action
  // is called with the sig+pubkey to build the final ZIP-321 URI.
  const [signPubkey, setSignPubkey] = useState("");
  const [signSignature, setSignSignature] = useState("");
  const [signError, setSignError] = useState("");
  const [signLoading, setSignLoading] = useState(false);

  // Build the canonical payload the user must sign. Memoized because it's
  // derived from form state and the nonce from the resolution result.
  const sovereignPayload = useMemo(() => {
    const reg = "registration" in resolveResult ? resolveResult.registration : null;
    return generatePayload(action, name, network, {
      address: address ?? "",
      priceZats: price ? Math.round((parsePrice(price) ?? 0) * 1e8) : 0,
      payTaddr: payTaddrInput || (resolveResult.status === "listed" ? resolveResult.payTaddr : ""),
      nonce: (reg?.nonce ?? 0) + 1,
    });
  }, [action, name, network, address, price, payTaddrInput, resolveResult]);

  async function handleVerifySign() {
    if (signLoading || !signSignature.trim()) return;
    const pub = (signPubkey || ("registration" in resolveResult ? resolveResult.registration.pubkey ?? "" : "")).trim();
    if (!pub) { setSignError("Public key is required."); return; }
    setSignError("");
    setSignLoading(true);
    try {
      const sig = signSignature.trim();
      const pubBytes = decodeBase64ToBytes(pub);
      if (!pubBytes || pubBytes.length !== 32) { setSignError("Invalid public key (need 32 bytes base64)."); return; }
      const sigBytes = decodeBase64ToBytes(sig);
      if (!sigBytes || sigBytes.length !== 64) { setSignError("Invalid signature (need 64 bytes base64)."); return; }

      const importedKey = await window.crypto.subtle.importKey(
        "raw", toArrayBuffer(pubBytes), { name: "Ed25519" }, false, ["verify"],
      );
      const payloadBytes = new TextEncoder().encode(sovereignPayload);
      const verified = await window.crypto.subtle.verify(
        "Ed25519", importedKey, toArrayBuffer(sigBytes), payloadBytes,
      );
      if (!verified) { setSignError("Signature does not match the payload."); return; }

      // Call server action with sovereign sig+pubkey to get URI
      let actionResult: { ok: true; uri: string; memo: string } | { ok: false; error: string };
      if (action === "CLAIM") {
        actionResult = await claimAction(name, address ?? "", network, undefined, sig, pub);
      } else if (action === "UPDATE") {
        actionResult = await updateAction(name, address ?? "", network, undefined, sig, pub);
      } else if (action === "LIST") {
        actionResult = await listAction(name, parsePrice(price ?? "") ?? 0, payTaddrInput ?? "", network, undefined, sig, pub);
      } else if (action === "DELIST") {
        actionResult = await delistAction(name, network, undefined, sig, pub);
      } else if (action === "RELEASE") {
        actionResult = await releaseAction(name, network, undefined, sig, pub);
      } else {
        actionResult = { ok: false, error: "Unknown action." };
      }

      if (!actionResult.ok) { setSignError(actionResult.error); return; }
      advance({ uri: actionResult.uri, memo: actionResult.memo });
    } catch {
      setSignError("Signature verification failed.");
    } finally {
      setSignLoading(false);
    }
  }

  // Scanning phase — polls the mempool/resolver every 2s for the transaction.
  // State machine: not_detected → in_mempool → confirming → mined|rejected.
  // Uses a ref to avoid stale closures in the interval; fires onSuccess exactly
  // once when the tx reaches "mined" status.
  const [scanState, setScanState] = useState<ScanState>("not_detected");
  const scanStateRef = useRef<ScanState>("not_detected");
  const firedSuccessRef = useRef(false);

  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  useEffect(() => {
    if (phase !== "scanning") return;
    let cancelled = false;

    async function poll() {
      const result = await checkMempool(name, network);
      if (cancelled) return;

      if (!result.found || !result.response) {
        setScanState("not_detected");
      } else {
        const { state } = result.response;
        switch (state.status) {
          case "pending":
            setScanState("in_mempool");
            break;
          case "resolving":
            setScanState("confirming");
            break;
          case "confirmed":
            setScanState("mined");
            if (!firedSuccessRef.current) {
              firedSuccessRef.current = true;
              onSuccess?.(name);
            }
            break;
          case "rejected":
            setScanState("rejected");
            break;
        }
      }
    }

    firedSuccessRef.current = false;
    setScanState("not_detected");
    poll();
    const id = setInterval(() => {
      if (scanStateRef.current === "mined" || scanStateRef.current === "rejected") {
        clearInterval(id);
        return;
      }
      poll();
    }, 2000);

    return () => { cancelled = true; clearInterval(id); };
  }, [phase, name, network, onSuccess]);

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
        {phase === "sign" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Sovereign Signature</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Sign this payload with your Ed25519 private key to authorize this transaction.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Payload to Sign</label>
              <code className="w-full break-all rounded-lg px-3 py-2 text-xs font-mono"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}>
                {sovereignPayload}
              </code>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Public Key (base64)</label>
              <input type="text" value={signPubkey}
                onChange={(e) => { setSignPubkey(e.target.value.trim()); setSignError(""); }}
                placeholder="Paste your Ed25519 public key"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono"
                style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Signature (base64)</label>
              <textarea value={signSignature}
                onChange={(e) => { setSignSignature(e.target.value.trim()); setSignError(""); }}
                rows={3} placeholder="Paste signed payload"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono resize-none"
                style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
            </div>
            {signError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{signError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => advance()}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {signLoading ? "Verifying…" : "Use Signature"}
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
            {otpMemo && (
              <QrBlock
                address={getNetworkConstants(network).OTP_SIGNIN_ADDR}
                amount={getNetworkConstants(network).OTP_AMOUNT}
                memo={otpMemo}
                size={180}
              />
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
            {uri && address && (
              <QrBlock
                address={address}
                amount={price ?? "0"}
                memo={memo ?? ""}
                size={200}
              />
            )}
            <button type="button" onClick={() => advance()}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
              I Sent It!
            </button>
          </div>
        )}
        {phase === "fund" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Fund the Purchase</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Send the listing price to the seller&rsquo;s transparent address to complete your purchase of <strong>{name}.zcash</strong>.
            </p>
            <div className="w-full rounded-xl p-5 flex flex-col items-center gap-3"
              style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)" }}>
              <div className="flex flex-col gap-1.5 w-full text-left">
                <span className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Seller Address</span>
                <code className="text-xs break-all rounded-lg px-3 py-2"
                  style={{ background: "var(--color-background)", color: "var(--fg-heading)" }}>
                  {resolveResult.status === "listed" ? resolveResult.payTaddr : "(unknown)"}
                </code>
              </div>
              <div className="flex flex-col gap-1.5 w-full text-left">
                <span className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Amount</span>
                <code className="text-xs rounded-lg px-3 py-2"
                  style={{ background: "var(--color-background)", color: "var(--fg-heading)" }}>
                  {resolveResult.status === "listed" ? `${resolveResult.listingPrice.zec} ZEC` : "the listed price"}
                </code>
              </div>
            </div>
            <button type="button" onClick={() => advance()}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
              I&rsquo;ve Sent the Payment
            </button>
          </div>
        )}
        {phase === "scanning" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Scanning</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Checking the mempool and resolver for <strong>{name}.zcash</strong>.
            </p>
            <div className="w-full rounded-xl p-5 flex flex-col items-center gap-3"
              style={{
                background: "var(--color-raised)",
                border: `1.5px solid ${scanState === "mined" ? "#22c55e" : scanState === "in_mempool" || scanState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
              }}>
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {scanState === "not_detected" && "Transaction not detected yet."}
                {scanState === "in_mempool" && "Transaction is in the mempool. Waiting to be mined."}
                {scanState === "confirming" && "Confirming transaction. Hang tight."}
                {scanState === "mined" && "Transaction confirmed on-chain."}
                {scanState === "rejected" && "Transaction not found."}
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
