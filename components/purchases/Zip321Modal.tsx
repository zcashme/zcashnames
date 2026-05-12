"use client";

import type React from "react";
import { useMemo, useReducer, useRef, useEffect } from "react";
import { usePoll } from "@/components/hooks/usePoll";
import { createPortal } from "react-dom";
import { ACTION_CAPS, getNetworkConstants, phasesFor } from "@/lib/types";
import type { Action as ZnsAction, Network, Phase, ResolveName, ScanState } from "@/lib/types";
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";

// Resume: the modal writes its full reducer state to localStorage on every
// dispatch, keyed by {action,name,network}. Reopening the modal for the same
// target rehydrates the reducer so the user picks up where they left off.
// Cleared when the user clicks Done after a successful tx.
const RESUME_KEY = "zns-modal-resume-v1";
type StoredResume = { action: ZnsAction; name: string; network: Network; state: S };
import {
  checkUnlockCode, verifyOtp, claimAction, buyAction,
  updateAction, listAction, delistAction, releaseAction,
} from "@/lib/zns/actions";
import { validateAddress } from "@/lib/zns/utils";
import { generateSessionId, buildZvsMemo } from "@/lib/purchases/memo";
import { zip321Uri } from "@/lib/purchases/zip321";
import { checkMempool, checkUtxo } from "@/lib/zns/mempool";
import { generatePayload } from "@/lib/zns/payload";
import { QrBlock } from "@/components/ui/QrBlock";

// ---- Helpers ---------------------------------------------------------------

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
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function prepareDescription(action: ZnsAction, name: string, amount: string): React.ReactNode {
  switch (action) {
    case "BUY": return <>Purchase for <strong>{amount}</strong>.</>;
    case "DELIST": return <>Remove from sale.</>;
    case "RELEASE": return <>Allowing others to claim it.</>;
    case "UPDATE": return <>Set a new address.</>;
    case "LIST": return <>Set a price for <strong>{name}</strong>.</>;
    case "CLAIM": return <><strong>{name}</strong></>;
  }
}

// ---- Auth dispatch ---------------------------------------------------------
//
// The six server actions share a structure: name + network + a per-action data
// shape + an "I'm authorized to do this" proof. Collapsing the call sites
// behind one helper kills the parameter-position bugs (e.g. the LIST units
// divergence between the OTP and sovereign paths) and shrinks the modal.

type AuthInput =
  | { kind: "none" }
  | { kind: "unlock"; token: string }
  | { kind: "otp"; token: string }
  | { kind: "sign"; signature: string; pubkey: string };

interface ActionData {
  address: string;     // CLAIM/BUY/UPDATE
  priceZats: number;   // LIST
  payTaddr: string;    // LIST
}

type ServerReply =
  | { ok: true; uri: string; memo: string; paymentAddress: string; amountZec: string }
  | { ok: false; error: string };

async function dispatchAction(
  action: ZnsAction,
  name: string,
  network: Network,
  data: ActionData,
  auth: AuthInput,
): Promise<ServerReply> {
  const sig = auth.kind === "sign" ? auth.signature : undefined;
  const pub = auth.kind === "sign" ? auth.pubkey : undefined;
  const unlock = auth.kind === "unlock" ? auth.token : undefined;
  const otp = auth.kind === "otp" ? auth.token : undefined;
  switch (action) {
    case "CLAIM":   return claimAction(name, data.address, network, unlock, sig, pub);
    case "BUY":     return buyAction(name, data.address, network, undefined, sig, pub);
    case "UPDATE":  return updateAction(name, data.address, network, otp, sig, pub);
    case "LIST":    return listAction(name, data.priceZats, data.payTaddr, network, otp, sig, pub);
    case "DELIST":  return delistAction(name, network, otp, sig, pub);
    case "RELEASE": return releaseAction(name, network, otp, sig, pub);
  }
}

// ---- Reducer ---------------------------------------------------------------

type S = {
  step: number;
  // accumulated across phases
  address: string;
  price: string;
  payTaddrInput: string;
  uri: string;
  memo: string;
  paymentAddress: string;
  amountZec: string;
  // unlock phase
  unlockCode: string;
  unlockError: string;
  unlockLoading: boolean;
  // input phase
  addressInput: string;
  priceInput: string;
  inputError: string;
  // otp phase
  otpMemo: string;
  otpUri: string;
  otpCode: string;
  otpError: string;
  otpLoading: boolean;
  otpSent: boolean;
  otpAttempts: number;
  // sign phase
  signPubkey: string;
  signSignature: string;
  signError: string;
  signLoading: boolean;
  // sovereign opt-in for CLAIM/BUY (committing a new pubkey to the registration)
  sovereign: boolean;
  // scanning phase
  scanState: ScanState;
};

type Msg =
  | { type: "SET"; payload: Partial<S> }
  | { type: "ADVANCE"; patch?: Partial<S> };

const INIT: S = {
  step: 0,
  address: "", price: "", payTaddrInput: "",
  uri: "", memo: "", paymentAddress: "", amountZec: "",
  unlockCode: "", unlockError: "", unlockLoading: false,
  addressInput: "", priceInput: "", inputError: "",
  otpMemo: "", otpUri: "", otpCode: "", otpError: "",
  otpLoading: false, otpSent: false, otpAttempts: 0,
  sovereign: false,
  signPubkey: "", signSignature: "", signError: "", signLoading: false,
  scanState: "not_detected",
};

function reducer(state: S, msg: Msg): S {
  switch (msg.type) {
    case "SET": return { ...state, ...msg.payload };
    case "ADVANCE": return { ...state, ...(msg.patch ?? {}), step: state.step + 1 };
  }
}

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
  const [s, dispatch] = useReducer(reducer, INIT, (init): S => {
    const stored = readLocalStorage<StoredResume | null>(RESUME_KEY, null);
    if (!stored || stored.action !== action || stored.name !== name || stored.network !== network) {
      return init;
    }
    // Reset transient flags so a stale "loading" never sticks across reloads.
    return {
      ...stored.state,
      unlockLoading: false,
      otpLoading: false,
      signLoading: false,
      unlockError: "",
      inputError: "",
      otpError: "",
      signError: "",
    };
  });
  const phases: Phase[] = phasesFor(action, resolveResult, s.sovereign);
  const phase = phases[s.step] ?? phases[phases.length - 1];

  // Persist on every state change. One effect; no wrapper hook.
  useEffect(() => {
    writeLocalStorage<StoredResume>(RESUME_KEY, { action, name, network, state: s });
  }, [s, action, name, network]);

  function set(payload: Partial<S>) { dispatch({ type: "SET", payload }); }
  function advance(patch?: Partial<S>) { dispatch({ type: "ADVANCE", patch }); }

  // Builds the OTP memo/uri needed when advancing into the otp phase.
  function buildOtpPatch() {
    const regAddr = "registration" in resolveResult ? resolveResult.registration.address : "";
    const sid = generateSessionId();
    const memo = buildZvsMemo(sid, regAddr);
    const { OTP_SIGNIN_ADDR, OTP_AMOUNT } = getNetworkConstants(network);
    return {
      otpMemo: memo,
      otpUri: zip321Uri(OTP_SIGNIN_ADDR, OTP_AMOUNT, memo).uri,
      otpCode: "", otpError: "", otpSent: false, otpAttempts: 0,
    };
  }

  // -- Unlock phase --

  async function handleUnlock() {
    if (s.unlockLoading) return;
    const code = s.unlockCode.trim();
    if (!code) { set({ unlockError: "Enter your unlock code." }); return; }
    set({ unlockError: "", unlockLoading: true });
    try {
      const result = await checkUnlockCode(name, code);
      if (!result.ok) { set({ unlockError: result.error || "Invalid unlock code.", unlockLoading: false }); return; }
      const ar = await dispatchAction("CLAIM", name, network,
        { address: s.address, priceZats: 0, payTaddr: "" },
        { kind: "unlock", token: result.proof });
      if (!ar.ok) { set({ unlockError: ar.error, unlockLoading: false }); return; }
      advance({ uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", unlockLoading: false });
    } catch {
      set({ unlockError: "Something went wrong. Try again.", unlockLoading: false });
    }
  }

  // -- Input phase --

  const needsAddress = action === "CLAIM" || action === "BUY" || action === "UPDATE";
  const needsPrice = action === "LIST";
  const needsPayTaddr = action === "LIST";

  async function handleInputContinue() {
    set({ inputError: "" });
    if (needsAddress) {
      const addr = s.addressInput.trim();
      if (!addr) { set({ inputError: "Address is required." }); return; }
      const v = validateAddress(addr);
      if (v.status === "viewkey" || v.status === "tex" || v.status === "invalid") {
        set({ inputError: v.warning || "Invalid address format." }); return;
      }
    }
    if (needsPrice) {
      const zec = parsePrice(s.priceInput);
      if (zec === null) { set({ inputError: "Enter a valid price." }); return; }
      if (zec < 0 || zec > 21_000_000) { set({ inputError: "Price must be between 0 and 21,000,000 ZEC." }); return; }
    }
    if (needsPayTaddr && !s.payTaddrInput.trim()) { set({ inputError: "Payout address is required." }); return; }

    const nextPhase = phases[s.step + 1];
    const otpPatch = nextPhase === "otp" ? buildOtpPatch() : {};

    if (action === "CLAIM" || action === "BUY") {
      const addr = s.addressInput.trim();
      const ar = await dispatchAction(action, name, network,
        { address: addr, priceZats: 0, payTaddr: "" },
        { kind: "none" });
      if (!ar.ok) { set({ inputError: ar.error }); return; }
      advance({ address: addr, uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", ...otpPatch });
    } else {
      advance({
        ...(needsAddress ? { address: s.addressInput.trim() } : {}),
        ...(needsPrice ? { price: s.priceInput.trim() } : {}),
        ...otpPatch,
      });
    }
  }

  // -- OTP phase --

  async function handleVerifyOtp() {
    if (s.otpLoading) return;
    if (!s.otpSent) { set({ otpError: "Send the verification transaction first." }); return; }
    const code = s.otpCode.trim();
    if (!/^\d{6}$/.test(code)) { set({ otpError: "Enter the 6-digit code from your wallet." }); return; }
    const { OTP_MAX_ATTEMPTS } = getNetworkConstants(network);
    if (s.otpAttempts >= OTP_MAX_ATTEMPTS) { set({ otpError: "Max attempts reached." }); return; }
    set({ otpError: "", otpLoading: true });
    try {
      const regAddr = "registration" in resolveResult ? resolveResult.registration.address : "";
      const result = await verifyOtp(s.otpMemo, code, regAddr);
      if (!result.ok) {
        set({ otpAttempts: s.otpAttempts + 1, otpError: result.error, otpCode: "", otpLoading: false });
        return;
      }

      const ar: ServerReply = await dispatchAction(action, name, network, {
        address: s.address,
        priceZats: Math.round((parsePrice(s.price) ?? 0) * 1e8),
        payTaddr: s.payTaddrInput,
      }, { kind: "otp", token: result.proof });

      if (!ar.ok) { set({ otpError: ar.error, otpLoading: false }); return; }
      advance({ uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", otpLoading: false });
    } catch {
      set({ otpError: "Something went wrong. Try again.", otpLoading: false });
    }
  }

  // -- Sign phase --

  const sovereignPayload = useMemo(() => {
    const reg = "registration" in resolveResult ? resolveResult.registration : null;
    return generatePayload(action, name, network, {
      address: s.address,
      priceZats: s.price ? Math.round((parsePrice(s.price) ?? 0) * 1e8) : 0,
      payTaddr: s.payTaddrInput || (resolveResult.status === "listed" ? resolveResult.payTaddr : ""),
      nonce: (reg?.nonce ?? 0) + 1,
    });
  }, [action, name, network, s.address, s.price, s.payTaddrInput, resolveResult]);

  async function handleVerifySign() {
    if (s.signLoading || !s.signSignature.trim()) return;
    const pub = (s.signPubkey || ("registration" in resolveResult ? resolveResult.registration.pubkey ?? "" : "")).trim();
    if (!pub) { set({ signError: "Public key is required." }); return; }
    set({ signError: "", signLoading: true });
    try {
      const sig = s.signSignature.trim();
      const pubBytes = decodeBase64ToBytes(pub);
      if (!pubBytes || pubBytes.length !== 32) { set({ signError: "Invalid public key (need 32 bytes base64).", signLoading: false }); return; }
      const sigBytes = decodeBase64ToBytes(sig);
      if (!sigBytes || sigBytes.length !== 64) { set({ signError: "Invalid signature (need 64 bytes base64).", signLoading: false }); return; }

      const importedKey = await window.crypto.subtle.importKey(
        "raw", toArrayBuffer(pubBytes), { name: "Ed25519" }, false, ["verify"],
      );
      const verified = await window.crypto.subtle.verify(
        "Ed25519", importedKey, toArrayBuffer(sigBytes), new TextEncoder().encode(sovereignPayload),
      );
      if (!verified) { set({ signError: "Signature does not match the payload.", signLoading: false }); return; }

      // priceZats here is the unit fix: the old sign-path call passed raw ZEC,
      // diverging from the OTP path. dispatchAction collapses that.
      const ar: ServerReply = await dispatchAction(action, name, network, {
        address: s.address,
        priceZats: Math.round((parsePrice(s.price) ?? 0) * 1e8),
        payTaddr: s.payTaddrInput,
      }, { kind: "sign", signature: sig, pubkey: pub });

      if (!ar.ok) { set({ signError: ar.error, signLoading: false }); return; }
      advance({ uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", signLoading: false });
    } catch {
      set({ signError: "Signature verification failed.", signLoading: false });
    }
  }

  // -- Scanning: reset state on entry, then poll watcher until mined/rejected --
  const firedSuccessRef = useRef(false);
  useEffect(() => {
    if (phase !== "scanning") return;
    firedSuccessRef.current = false;
    set({ scanState: "not_detected" });
  }, [phase]);

  const scanActive = phase === "scanning" && s.scanState !== "mined" && s.scanState !== "rejected";
  usePoll(scanActive, async () => {
    const result = await checkMempool(name, network);
    if (!result.found || !result.response) {
      set({ scanState: "not_detected" });
      return;
    }
    const { status } = result.response.state;
    if (status === "pending") set({ scanState: "in_mempool" });
    else if (status === "resolving") set({ scanState: "confirming" });
    else if (status === "confirmed") {
      set({ scanState: "mined" });
      if (!firedSuccessRef.current) { firedSuccessRef.current = true; onSuccess?.(name); }
    } else if (status === "rejected") set({ scanState: "rejected" });
  }, 2000);

  // -- Fund poll: BUY only. Auto-advance when seller's t-addr has the price. --
  const fundActive = phase === "fund" && action === "BUY" && resolveResult.status === "listed";
  usePoll(fundActive, async () => {
    if (resolveResult.status !== "listed") return;
    const { payTaddr, listingPrice } = resolveResult;
    const result = await checkUtxo(payTaddr, network);
    if (result.found && result.response && result.response.total_received_zats >= listingPrice.zats) {
      advance();
    }
  }, 3000);

  // -- Keyboard --
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
            <input type="text" value={s.unlockCode} autoFocus
              onChange={(e) => set({ unlockCode: e.target.value.toUpperCase(), unlockError: "" })}
              onKeyDown={(e) => { if (e.key === "Enter") handleUnlock(); }}
              placeholder="XXXX-XXXX-XXXX"
              className="w-full rounded-xl px-4 py-3 text-sm font-mono tracking-[0.15em] outline-none text-center"
              style={{ background: "var(--color-raised)", border: `1.5px solid ${s.unlockError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
            {s.unlockError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{s.unlockError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>Cancel</button>
              <button type="button" onClick={handleUnlock} disabled={s.unlockLoading}
                className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {s.unlockLoading ? "Verifying…" : "Unlock"}
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
                <input type="text" value={s.addressInput} autoFocus
                  onChange={(e) => set({ addressInput: e.target.value, inputError: "" })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                  placeholder="u1…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            {needsPrice && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Price (ZEC)</label>
                <input type="text" inputMode="decimal" value={s.priceInput}
                  onChange={(e) => set({ priceInput: e.target.value, inputError: "" })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                  placeholder="0.00"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            {needsPayTaddr && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Payout Address (t-address)</label>
                <input type="text" value={s.payTaddrInput}
                  onChange={(e) => set({ payTaddrInput: e.target.value, inputError: "" })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                  placeholder="t1…"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            {s.inputError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{s.inputError}</p>}
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
        {phase === "sign" && (() => {
          const committedPubkey = ("registration" in resolveResult ? resolveResult.registration.pubkey : null) ?? "";
          return (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Sovereign Signature</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Sign this payload with your Ed25519 private key to authorize this transaction.{" "}
              <a href="/keypair" target="_blank" rel="noreferrer"
                style={{ color: "var(--home-result-primary-bg)", textDecoration: "underline" }}>
                Use the keypair tool
              </a>.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Payload to Sign</label>
              <code className="w-full break-all rounded-lg px-3 py-2 text-xs font-mono"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}>
                {sovereignPayload}
              </code>
            </div>
            {committedPubkey ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Public Key (committed)</label>
                <code className="w-full break-all rounded-lg px-3 py-2 text-xs font-mono"
                  style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}>
                  {committedPubkey}
                </code>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Public Key (base64)</label>
                <input type="text" value={s.signPubkey}
                  onChange={(e) => set({ signPubkey: e.target.value.trim(), signError: "" })}
                  placeholder="Paste your Ed25519 public key"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono"
                  style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Signature (base64)</label>
              <textarea value={s.signSignature}
                onChange={(e) => set({ signSignature: e.target.value.trim(), signError: "" })}
                rows={3} placeholder="Paste signed payload"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono resize-none"
                style={{ background: "var(--color-raised)", border: "1.5px solid var(--faq-border)", color: "var(--fg-heading)" }} />
            </div>
            {s.signError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{s.signError}</p>}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={handleVerifySign} disabled={s.signLoading}
                className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {s.signLoading ? "Verifying…" : "Use Signature"}
              </button>
            </div>
          </div>
          );
        })()}
        {phase === "otp" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Verify Ownership</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Send exact amount and memo to the address below to request a verification code.
            </p>
            {s.otpMemo && (
              <QrBlock
                address={getNetworkConstants(network).OTP_SIGNIN_ADDR}
                amount={getNetworkConstants(network).OTP_AMOUNT}
                memo={s.otpMemo}
                size={180}
              />
            )}
            {!s.otpSent ? (
              <button type="button" onClick={() => set({ otpSent: true, otpError: "" })}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                I Sent It!
              </button>
            ) : (
              <>
                <input type="text" inputMode="numeric" maxLength={6} value={s.otpCode}
                  onChange={(e) => set({ otpCode: e.target.value.replace(/\D/g, "").slice(0, 6), otpError: "" })}
                  onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
                  placeholder="000000" autoFocus
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none text-center tracking-[0.3em] font-mono"
                  style={{ background: "var(--color-raised)", border: `1.5px solid ${s.otpError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
                <button type="button" onClick={handleVerifyOtp} disabled={!s.otpCode.trim() || s.otpLoading}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                  style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                  {s.otpLoading ? "Verifying…" : "Verify Code"}
                </button>
              </>
            )}
            {s.otpError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{s.otpError}</p>}
            {s.otpAttempts > 0 && (
              <p className="text-xs" style={{ color: "var(--fg-muted)" }}>
                Attempt {s.otpAttempts} of {getNetworkConstants(network).OTP_MAX_ATTEMPTS}
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
            {s.uri && s.paymentAddress && (
              <QrBlock
                address={s.paymentAddress}
                amount={s.amountZec}
                memo={s.memo}
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
            {action === "BUY" && network === "mainnet" ? (
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                Waiting for payment detection...
              </p>
            ) : (
              <button type="button" onClick={() => advance()}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                I&rsquo;ve Sent the Payment
              </button>
            )}
          </div>
        )}
        {phase === "scanning" && s.scanState !== "mined" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Scanning</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Checking the mempool and resolver for <strong>{name}.zcash</strong>.
            </p>
            <div className="w-full rounded-xl p-5 flex flex-col items-center gap-3"
              style={{
                background: "var(--color-raised)",
                border: `1.5px solid ${s.scanState === "in_mempool" || s.scanState === "confirming" ? "#ca8a04" : s.scanState === "rejected" ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`,
              }}>
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {s.scanState === "not_detected" && "Transaction not detected yet."}
                {s.scanState === "in_mempool" && "Transaction is in the mempool. Waiting to be mined."}
                {s.scanState === "confirming" && "Confirming transaction. Hang tight."}
                {s.scanState === "rejected" && "Transaction not found."}
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
              Close
            </button>
          </div>
        )}
        {phase === "scanning" && s.scanState === "mined" && (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--fg-heading)" }}>
              {name}.zcash is yours
            </h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Your name is registered on-chain and ready to use.
            </p>
            <button type="button" onClick={() => { removeLocalStorage(RESUME_KEY); onClose(); }}
              className="px-6 py-3 rounded-full text-sm font-semibold"
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
