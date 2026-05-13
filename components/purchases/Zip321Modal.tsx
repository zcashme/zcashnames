"use client";

import type React from "react";
import { useMemo, useReducer, useEffect } from "react";
import { usePoll } from "@/components/hooks/usePoll";
import { createPortal } from "react-dom";
import { ACTION_CAPS, ACTION_LABELS, getNetworkConstants, phasesFor } from "@/lib/types";
import type { Action as ZnsAction, ActionAuth, Network, Phase, ResolveName, ScanState } from "@/lib/types";
import { readLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";
import { RESUME_KEY, clearResume, notifyResumeChanged, type ResumeSnapshot } from "@/lib/purchases/resume";

// Resume: the modal writes its full reducer state to localStorage on every
// dispatch, keyed by {action,name,network}. Reopening the modal for the same
// target rehydrates the reducer so the user picks up where they left off.
// The serialized `phase` is for outside readers (banner) — the modal itself
// recomputes phase from state.step. Cleared on Done after a successful tx.
type StoredResume = ResumeSnapshot<S>;
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

const ACTION_NOUN: Record<ZnsAction, string> = {
  CLAIM: "claim",
  BUY: "purchase",
  UPDATE: "address update",
  LIST: "listing",
  DELIST: "delist",
  RELEASE: "release",
};

function minedMessage(action: ZnsAction, displayName: string): string {
  switch (action) {
    case "CLAIM":   return `${displayName} is yours. Claim confirmed on-chain.`;
    case "BUY":     return `${displayName} is now yours. Purchase confirmed on-chain.`;
    case "UPDATE":  return `Address updated. ${displayName} now resolves to your new address.`;
    case "LIST":    return `${displayName} is now listed for sale.`;
    case "DELIST":  return `${displayName} has been delisted.`;
    case "RELEASE": return `${displayName} has been released.`;
  }
}

// ---- Auth dispatch ---------------------------------------------------------
//
// NameOwnership / ActionAuth live in lib/types.ts (next to Action, Network,
// Phase). The two-axis split — name-ownership proof vs. reserved-claim
// unlock — is a domain concept, not a modal-local one.

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
  auth: ActionAuth,
): Promise<ServerReply> {
  const sig = auth.owner.kind === "sign" ? auth.owner.signature : undefined;
  const pub = auth.owner.kind === "sign" ? auth.owner.pubkey : undefined;
  const otp = auth.owner.kind === "otp" ? auth.owner.token : undefined;
  switch (action) {
    case "CLAIM":   return claimAction(name, data.address, network, auth.reservedUnlock, sig, pub);
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
  unlockProof: string;
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
  successFired: boolean;
  // fund phase (BUY): gate seller payment behind protocol-tx confirmation so
  // the buyer doesn't pay the seller before ZNS has accepted the BUY intent.
  buyTxConfirmed: boolean;
};

type Msg =
  | { type: "SET"; payload: Partial<S> }
  | { type: "ADVANCE"; patch?: Partial<S> };

const INIT: S = {
  step: 0,
  address: "", price: "", payTaddrInput: "",
  uri: "", memo: "", paymentAddress: "", amountZec: "",
  unlockCode: "", unlockError: "", unlockLoading: false, unlockProof: "",
  addressInput: "", priceInput: "", inputError: "",
  otpMemo: "", otpUri: "", otpCode: "", otpError: "",
  otpLoading: false, otpSent: false, otpAttempts: 0,
  sovereign: false,
  signPubkey: "", signSignature: "", signError: "", signLoading: false,
  scanState: "not_detected",
  successFired: false,
  buyTxConfirmed: false,
};

function purchaseReducer(state: S, msg: Msg): S {
  switch (msg.type) {
    case "SET": return { ...state, ...msg.payload };
    case "ADVANCE": return { ...state, ...(msg.patch ?? {}), step: state.step + 1 };
  }
}

// Each phase declares the fields it OWNS — when the user backs past a phase,
// those fields get cleared. Keeping this as a table (not procedural code)
// means adding a new phase = adding one row, not editing goto().
//
//   unlock:   proof itself survives (one-shot, can't be re-generated)
//   input:    user inputs survive (they typed them; don't make them retype)
//   otp:      memo/uri/sent/attempts survive (paid for the OTP session)
//   sign:     pubkey survives (identity, not payload-bound)
//   confirm:  server-dispatched URI fields are owned here — back-nav clears
//   fund:     nothing local (UTXO state is on-chain)
//   scanning: scanState is reset on entry anyway, but owning it makes the
//             back-nav semantics explicit.
const PHASE_OWNS: Record<Phase, ReadonlyArray<keyof S>> = {
  unlock:   ["unlockCode", "unlockError"],
  input:    [],
  otp:      ["otpCode", "otpError"],
  sign:     ["signSignature", "signError"],
  confirm:  ["uri", "memo", "paymentAddress", "amountZec"],
  fund:     ["buyTxConfirmed"],
  scanning: ["scanState", "successFired"],
};

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
  const [s, dispatch] = useReducer(purchaseReducer, INIT, (init): S => {
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
    writeLocalStorage<StoredResume>(RESUME_KEY, {
      action, name, network,
      phase, scanState: s.scanState, state: s,
    });
    notifyResumeChanged();
  }, [s, action, name, network]);

  function set(payload: Partial<S>) { dispatch({ type: "SET", payload }); }
  function advance(patch?: Partial<S>) { dispatch({ type: "ADVANCE", patch }); }

  // Backward navigation: for each phase the user is stepping past, clear the
  // fields that phase owns (see PHASE_OWNS). Forward sequencing of dispatches
  // ensures the next forward step re-populates whatever got cleared.
  function goto(targetStep: number) {
    if (targetStep >= s.step) return;
    const patch: Partial<S> = {};
    for (const crossed of phases.slice(targetStep + 1, s.step + 1)) {
      for (const field of PHASE_OWNS[crossed]) {
        // Reset to the field's INIT value so types stay sound across keys.
        (patch as Record<string, unknown>)[field] = INIT[field];
      }
    }
    set({ ...patch, step: targetStep });
  }

  // For inputless OTP flows (DELIST/RELEASE), the modal opens directly on the
  // otp phase — handleInputContinue never runs, so we lazily build the OTP
  // session here on first entry.
  useEffect(() => {
    if (phase === "otp" && !s.otpMemo) set(buildOtpPatch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, s.otpMemo]);

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
      // Stash the proof and advance. The actual CLAIM dispatch happens in
      // handleInputContinue once the user has entered their address — calling
      // claimAction here would fail server-side address validation.
      advance({ unlockProof: result.proof, unlockLoading: false });
    } catch {
      set({ unlockError: "Something went wrong. Try again.", unlockLoading: false });
    }
  }

  // -- Input phase --

  const needsAddress = action === "CLAIM" || action === "BUY" || action === "UPDATE";
  const needsPrice = action === "LIST";
  const needsPayTaddr = action === "LIST";
  const isOwnerAction = action === "UPDATE" || action === "LIST" || action === "DELIST" || action === "RELEASE";
  const ownerCommittedPubkey = "registration" in resolveResult ? resolveResult.registration.pubkey : null;

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
    // Only build a fresh OTP session on first entry. If the user already paid
    // for a session and is re-advancing into otp after a back-nav, preserve it.
    const otpPatch = nextPhase === "otp" && !s.otpMemo ? buildOtpPatch() : {};

    // Defer the server dispatch when an auth phase (sign/otp) comes next —
    // that phase needs to be the one to call the server with both the unlock
    // proof (if any) AND the owner-auth proof in the same request.
    if ((action === "CLAIM" || action === "BUY") && nextPhase === "confirm") {
      const addr = s.addressInput.trim();
      const ar = await dispatchAction(action, name, network,
        { address: addr, priceZats: 0, payTaddr: "" },
        { reservedUnlock: action === "CLAIM" ? s.unlockProof || undefined : undefined, owner: { kind: "none" } });
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

      // OTP is owner-action only — unlock proof never applies here.
      const ar: ServerReply = await dispatchAction(action, name, network, {
        address: s.address,
        priceZats: Math.round((parsePrice(s.price) ?? 0) * 1e8),
        payTaddr: s.payTaddrInput,
      }, { owner: { kind: "otp", token: result.proof } });

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

      // For a reserved-name sovereign claim, both proofs go in the same call.
      const ar: ServerReply = await dispatchAction(action, name, network, {
        address: s.address,
        priceZats: Math.round((parsePrice(s.price) ?? 0) * 1e8),
        payTaddr: s.payTaddrInput,
      }, {
        reservedUnlock: action === "CLAIM" ? s.unlockProof || undefined : undefined,
        owner: { kind: "sign", signature: sig, pubkey: pub },
      });

      if (!ar.ok) { set({ signError: ar.error, signLoading: false }); return; }
      advance({ uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", signLoading: false });
    } catch {
      set({ signError: "Signature verification failed.", signLoading: false });
    }
  }

  // -- Scanning: poll watcher until mined/rejected. Entry-state reset is
  // handled by PHASE_OWNS on back-nav; forward entry inherits "not_detected"
  // from INIT or from the prior back-nav reset.
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
      if (!s.successFired) {
        set({ scanState: "mined", successFired: true });
        onSuccess?.(name);
      } else {
        set({ scanState: "mined" });
      }
    } else if (status === "rejected") set({ scanState: "rejected" });
  }, 2000);

  // -- BUY gate: don't unlock the seller-payment QR until the protocol-fee tx
  // has confirmed on-chain. Otherwise the buyer can pay the seller before ZNS
  // recognises the BUY intent and lose the funds. Testnet has no mempool
  // endpoint, so we treat the gate as auto-open there.
  const buyGateActive =
    phase === "fund" && action === "BUY" && !s.buyTxConfirmed && network === "mainnet";
  usePoll(buyGateActive, async () => {
    const result = await checkMempool(name, network);
    if (result.found && result.response?.state.status === "confirmed") {
      set({ buyTxConfirmed: true });
    }
  }, 2000);
  // Testnet has no on-chain detection, so let the user proceed manually.
  useEffect(() => {
    if (phase === "fund" && action === "BUY" && network !== "mainnet" && !s.buyTxConfirmed) {
      set({ buyTxConfirmed: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, action, network]);

  // -- Fund poll: BUY only. Auto-advance when seller's t-addr has the price. --
  const fundActive =
    phase === "fund" && action === "BUY" && resolveResult.status === "listed" && s.buyTxConfirmed;
  usePoll(fundActive, async () => {
    if (resolveResult.status !== "listed") return;
    const { payTaddr, listingPrice } = resolveResult;
    const result = await checkUtxo(payTaddr, network);
    if (result.found && result.response && result.response.total_received_zats >= listingPrice.zats) {
      advance();
    }
  }, 3000);

  // -- Progress segments --
  function progressClipPath(i: number, n: number): string {
    if (n <= 1) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
    if (i === 0) return "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 0 100%)";
    if (i === n - 1) return "polygon(0 0, 100% 0, 100% 100%, 6px 100%)";
    return "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 6px 100%)";
  }
  const showProgress = !(phase === "scanning" && s.scanState === "mined");
  const progressSegments = showProgress ? (
    <div className="flex w-full justify-center">
      <div className="flex max-w-full items-center gap-[3px]">
        {phases.map((step, i) => {
          const after = i > s.step;
          const current = i === s.step;
          const rejected = current && phase === "scanning" && s.scanState === "rejected";
          // unlock is non-interactive — re-entering re-dispatches CLAIM with a
          // fresh proof, and there's nothing the user can fix back there.
          const clickable = i < s.step && step !== "unlock";
          let background = "var(--fg-heading)";
          if (after) background = "var(--border-muted)";
          if (rejected) background = "var(--accent-red, #e05252)";
          return (
            <button
              key={`${step}-${i}`}
              type="button"
              aria-label={clickable ? `Back to ${step}` : step}
              aria-current={current ? "step" : undefined}
              disabled={!clickable}
              onClick={clickable ? () => goto(i) : undefined}
              className={`block h-1.5 w-8 sm:w-[34px] p-0 border-0 ${clickable ? "cursor-pointer" : "cursor-default"}`}
              style={{ clipPath: progressClipPath(i, phases.length), background }}
            />
          );
        })}
      </div>
    </div>
  ) : null;

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
        className="relative rounded-2xl w-full max-w-md overflow-visible"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          color: "var(--fg-body)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase !== "unlock" && (() => {
          const isMined = phase === "scanning" && s.scanState === "mined";
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
              {phase === "scanning" && !isMined ? (
                <span
                  className="inline-block h-6 w-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: "var(--border-muted)", borderTopColor: "var(--fg-heading)" }}
                />
              ) : isMined ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : phase === "input" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                  <path d="M8 6h8" />
                  <path d="M8 10h5" />
                  <path d="M8 14h4" />
                  <path d="M16 3h1a2 2 0 0 1 2 2v6" />
                  <path d="M7 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
                  <path d="M9 3h6" />
                  <path d="M15 18l4-4 2 2-4 4h-2v-2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
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
          className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain rounded-2xl p-8"
          style={{ paddingTop: phase === "unlock" ? undefined : "3rem" }}
          onWheel={(e) => e.stopPropagation()}
        >
        {progressSegments && <div className="mb-5">{progressSegments}</div>}
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
            <div className="text-center">
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                {ACTION_LABELS[action]} {name}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                {prepareDescription(action, name, "")}
              </p>
            </div>
            {needsAddress && (() => {
              const trimmed = s.addressInput.trim();
              const v = trimmed ? validateAddress(trimmed) : { status: "invalid" as const, warning: "" };
              const borderColor = !trimmed
                ? "var(--faq-border)"
                : v.status === "viewkey" || v.status === "tex" || v.status === "invalid"
                  ? "var(--accent-red, #e05252)"
                  : v.status === "unified"
                    ? "#22c55e"
                    : "#ca8a04";
              const showWarning =
                trimmed &&
                v.warning &&
                v.status !== "viewkey" &&
                v.status !== "tex" &&
                v.status !== "invalid";
              return (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                    {action === "UPDATE" ? "New Zcash Address" : "Your Zcash Address"}
                  </label>
                  <input type="text" value={s.addressInput} autoFocus
                    onChange={(e) => set({ addressInput: e.target.value, inputError: "" })}
                    onKeyDown={(e) => { if (e.key === "Enter") handleInputContinue(); }}
                    placeholder="u1…"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "var(--color-raised)", border: `1.5px solid ${borderColor}`, color: "var(--fg-heading)" }} />
                  {showWarning && (
                    <p className="text-xs" style={{ color: "#ca8a04" }}>{v.warning}</p>
                  )}
                </div>
              );
            })()}
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
            {isOwnerAction ? (
              <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
                Changes to this name are authorized by{" "}
                <strong style={{ color: "var(--fg-heading)" }}>
                  {ownerCommittedPubkey ? "keypairs" : "passcodes"}
                </strong>
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Changes to this name will be authorized by
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["Passcodes", false],
                    ["Keypairs", true],
                  ] as const).map(([label, sov]) => {
                    const selected = s.sovereign === sov;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => set({ sovereign: sov, inputError: "", signError: "" })}
                        className="rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85"
                        style={selected
                          ? { background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }
                          : { background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
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
                {s.sovereign ? "Continue to Sign" : "Continue"}
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
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
              {action === "BUY" ? "Pay the registry" : "Send Payment"}
            </h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {action === "BUY"
                ? <>This is the registry commission only. You&rsquo;ll pay the seller the listing price next.</>
                : "Send exact amount and memo to complete the transaction."}
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
        {phase === "fund" && (() => {
          const listed = resolveResult.status === "listed" ? resolveResult : null;
          if (!listed) {
            return (
              <div className="flex flex-col items-center gap-4 text-center">
                <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Listing withdrawn</h2>
                <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                  This name is no longer for sale. Don&rsquo;t send the seller payment.
                </p>
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                  Close
                </button>
              </div>
            );
          }
          return (
            <div className="flex flex-col items-center gap-4 text-center">
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Pay the seller</h2>
              {!s.buyTxConfirmed ? (
                <>
                  <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                    Waiting for the registry to confirm your transaction.
                  </p>
                  <div className="flex items-center gap-3 py-4">
                    <span
                      className="inline-block h-5 w-5 rounded-full border-2 animate-spin"
                      style={{ borderColor: "var(--border-muted)", borderTopColor: "var(--fg-heading)" }}
                    />
                    <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
                      Confirming with the registry&hellip;
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                    Send <strong>{listed.listingPrice.zec} ZEC</strong> to the seller&rsquo;s transparent address to complete your purchase of <strong>{name}.zcash</strong>.
                  </p>
                  <QrBlock
                    address={listed.payTaddr}
                    amount={String(listed.listingPrice.zec)}
                    memo=""
                    size={200}
                  />
                  {network === "mainnet" ? (
                    <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                      Waiting for payment detection&hellip;
                    </p>
                  ) : (
                    <button type="button" onClick={() => advance()}
                      className="px-5 py-2.5 rounded-full text-sm font-semibold"
                      style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                      I&rsquo;ve Sent the Payment
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })()}
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
                {s.scanState === "not_detected" && <>Your {ACTION_NOUN[action]} hasn&rsquo;t been detected yet.</>}
                {s.scanState === "in_mempool" && <>Your {ACTION_NOUN[action]} is in the mempool. Waiting to be mined.</>}
                {s.scanState === "confirming" && <>Your {ACTION_NOUN[action]} is being mined. Hang tight &mdash; this should only take a moment.</>}
                {s.scanState === "rejected" && <>Your {ACTION_NOUN[action]} was not found.</>}
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
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {minedMessage(action, `${name}.zcash`)}
            </p>
            <div className="flex gap-3">
              <a
                href={network === "testnet" ? `/explorer?env=testnet&name=${encodeURIComponent(name)}` : `/explorer?name=${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)", textDecoration: "none" }}
              >
                View on Explorer
              </a>
              <button type="button" onClick={() => { clearResume(); onClose(); }}
                className="px-6 py-3 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                Done
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
