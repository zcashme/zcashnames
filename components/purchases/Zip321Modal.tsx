"use client";

import type React from "react";
import { useMemo, useReducer, useEffect, useRef, useState } from "react";
import { usePoll } from "@/components/hooks/usePoll";
import { watchScanning, deriveScanState, type Expected } from "@/lib/purchases/scanningWatcher";
import { createPortal } from "react-dom";
import { ACTION_CAPS, ACTION_LABELS, getNetworkConstants, phasesFor } from "@/lib/types";
import type { Action as ZnsAction, ActionAuth, Network, Phase, ResolveName, ScanState } from "@/lib/types";
import { readLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";
import { RESUME_KEY, clearResume, notifyPurchaseModalVisibility, notifyResumeChanged, type ResumeSnapshot } from "@/lib/purchases/resume";

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
import { checkUtxo } from "@/lib/zns/mempool";
import { resolveName } from "@/lib/zns/resolve";
import { generatePayload } from "@/lib/zns/payload";
import { QrBlock } from "@/components/ui/QrBlock";
import { useCopy } from "@/components/hooks/useCopy";
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
  otpVerified: boolean;
  // sign phase
  signPubkey: string;
  signSignature: string;
  signError: string;
  signLoading: boolean;
  // sovereign opt-in for CLAIM/BUY (committing a new pubkey to the registration)
  sovereign: boolean;
  // scanning phase (watches memo'd tx on the mempool watcher)
  scanState: ScanState;
  successFired: boolean;
  // settling phase (BUY only): watches the indexer until the seller payment
  // has been observed and ownership has flipped to the buyer.
  settleState: ScanState;
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
  otpLoading: false, otpSent: false, otpAttempts: 0, otpVerified: false,
  sovereign: false,
  signPubkey: "", signSignature: "", signError: "", signLoading: false,
  scanState: "not_detected",
  successFired: false,
  settleState: "not_detected",
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
  // Back-nav past otp burns the session (memo/uri/sent/attempts) so the next
  // forward pass requests a fresh passcode. handleOtpBack warns the user.
  otp:      ["otpCode", "otpError", "otpMemo", "otpUri", "otpSent", "otpAttempts", "otpVerified"],
  sign:     ["signSignature", "signError"],
  confirm:  ["uri", "memo", "paymentAddress", "amountZec"],
  scanning: ["scanState"],
  fund:     [],
  settling: ["settleState", "successFired"],
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
  const payloadCopy = useCopy();
  const modalContentRef = useRef<HTMLDivElement | null>(null);
  const [modalContentHeight, setModalContentHeight] = useState<number | null>(null);
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
      otpVerified: false,
      signLoading: false,
      unlockError: "",
      inputError: "",
      otpError: "",
      signError: "",
    };
  });
  const phases: Phase[] = phasesFor(action, resolveResult, s.sovereign);
  const phase = phases[s.step] ?? phases[phases.length - 1];

  useEffect(() => {
    notifyPurchaseModalVisibility(true);
    return () => notifyPurchaseModalVisibility(false);
  }, []);

  useEffect(() => {
    const node = modalContentRef.current;
    if (!node) return;

    const measure = () => setModalContentHeight(node.scrollHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Persist on every state change. One effect; no wrapper hook.
  useEffect(() => {
    writeLocalStorage<StoredResume>(RESUME_KEY, {
      action, name, network,
      phase, phases, scanState: s.scanState, state: s,
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

  // Builds the OTP memo/uri needed when advancing into the otp phase.
  function buildOtpPatch() {
    const regAddr = "registration" in resolveResult ? resolveResult.registration.address : "";
    const sid = generateSessionId();
    const memo = buildZvsMemo(sid, regAddr);
    const { OTP_SIGNIN_ADDR, OTP_AMOUNT } = getNetworkConstants(network);
    return {
      otpMemo: memo,
      otpUri: zip321Uri(OTP_SIGNIN_ADDR, OTP_AMOUNT, memo).uri,
      otpCode: "", otpError: "", otpSent: false, otpAttempts: 0, otpVerified: false,
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

    // Resume path: a BUY-intent has already been mined for this name. If the
    // entered UA matches the locked buyer, skip straight to the seller-payment
    // phase. If it doesn't match, someone else's BUY is in flight on this
    // name — the user can't proceed until that window expires.
    if (
      action === "BUY"
      && resolveResult.status === "listed"
      && resolveResult.pendingBuy
    ) {
      const addr = s.addressInput.trim();
      if (resolveResult.pendingBuy.buyer === addr) {
        const fundIdx = phases.indexOf("fund");
        if (fundIdx >= 0) {
          set({
            step: fundIdx,
            address: addr,
          });
          return;
        }
      } else {
        set({ inputError: "Another buyer has locked this name. Try again after their purchase window expires." });
        return;
      }
    }

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

  function handleOtpBack() {
    const ok = window.confirm("Are you sure? You'll have to request another passcode.");
    if (!ok) return;
    goto(s.step - 1);
  }

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
        set({ otpAttempts: s.otpAttempts + 1, otpError: result.error, otpCode: "", otpLoading: false, otpVerified: false });
        return;
      }

      // OTP is owner-action only — unlock proof never applies here.
      const ar: ServerReply = await dispatchAction(action, name, network, {
        address: s.address,
        priceZats: Math.round((parsePrice(s.price) ?? 0) * 1e8),
        payTaddr: s.payTaddrInput,
      }, { owner: { kind: "otp", token: result.proof } });

      if (!ar.ok) { set({ otpError: ar.error, otpLoading: false, otpVerified: false }); return; }
      set({ uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", otpLoading: false, otpVerified: true });
      window.setTimeout(() => {
        advance({ uri: ar.uri, memo: ar.memo, paymentAddress: ar.paymentAddress ?? "", amountZec: ar.amountZec ?? "", otpVerified: false });
      }, 650);
    } catch {
      set({ otpError: "Something went wrong. Try again.", otpLoading: false, otpVerified: false });
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

  const committedPubkey =
    ("registration" in resolveResult ? resolveResult.registration.pubkey : null) ?? "";
  const requiresPubkeyInput = !committedPubkey;
  const [pubkeyLiveError, setPubkeyLiveError] = useState("");
  const [signatureLiveError, setSignatureLiveError] = useState("");

  // Live-validate the sovereign pubkey + signature as the user types. Each
  // check is incremental: bad base64 / wrong byte count first, then a real
  // Ed25519 verify once both inputs decode cleanly. Empty inputs clear errors
  // so the field shows neutral state instead of "invalid" before any typing.
  useEffect(() => {
    if (phase !== "sign") {
      setPubkeyLiveError("");
      setSignatureLiveError("");
      return;
    }
    let cancelled = false;
    const pubInput = s.signPubkey.trim();
    const effectivePub = (committedPubkey || pubInput).trim();
    const sig = s.signSignature.trim();

    (async () => {
      let pubError = "";
      let sigError = "";
      let pubKey: CryptoKey | null = null;

      if (requiresPubkeyInput && pubInput) {
        const pubBytes = decodeBase64ToBytes(pubInput);
        if (!pubBytes) pubError = "Public key must be valid base64.";
        else if (pubBytes.length !== 32) pubError = "Public key must decode to 32 bytes.";
        else if (!window.crypto?.subtle) pubError = "WebCrypto is unavailable in this browser.";
        else {
          try {
            pubKey = await window.crypto.subtle.importKey(
              "raw", toArrayBuffer(pubBytes), { name: "Ed25519" }, false, ["verify"],
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
              "raw", toArrayBuffer(pubBytes), { name: "Ed25519" }, false, ["verify"],
            );
          } catch { pubKey = null; }
        }
      }

      if (sig) {
        const sigBytes = decodeBase64ToBytes(sig);
        if (!sigBytes) sigError = "Signature must be valid base64.";
        else if (sigBytes.length !== 64) sigError = "Signature must decode to 64 bytes.";
        else if (!effectivePub) sigError = "Enter a valid public key first.";
        else if (!window.crypto?.subtle) sigError = "WebCrypto is unavailable in this browser.";
        else if (!pubKey) sigError = "Enter a valid public key first.";
        else {
          const payloadBytes = new TextEncoder().encode(sovereignPayload);
          const verified = await window.crypto.subtle.verify(
            "Ed25519", pubKey, toArrayBuffer(sigBytes), payloadBytes,
          );
          if (!verified) sigError = "Signature does not match the payload and public key.";
        }
      }

      if (cancelled) return;
      setPubkeyLiveError(pubError);
      setSignatureLiveError(sigError);
    })();

    return () => { cancelled = true; };
  }, [phase, requiresPubkeyInput, committedPubkey, s.signPubkey, s.signSignature, sovereignPayload]);

  const canSubmitSovereign =
    !s.signLoading &&
    !!s.signSignature.trim() &&
    (!requiresPubkeyInput || !!s.signPubkey.trim()) &&
    !pubkeyLiveError &&
    !signatureLiveError;

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

  // -- Scanning: subscribe to the shared scanning watcher.
  //
  // watchScanning runs ONE poll per (name, network) regardless of subscriber
  // count; the modal and usePurchaseResume's banner share it. Each tick
  // fetches mempool + resolver in parallel and emits raw signals.
  //
  // The indexer (resolver) is the SOURCE OF TRUTH for "mined" — once the
  // registry reflects `expected`, the action is done regardless of what the
  // mempool watcher has (or hasn't) seen. The mempool result is only used
  // for the intermediate "in mempool" / "being mined" UX flavor.
  //
  // `expected` is captured once at scanning entry — main does the same.
  //
  // For non-BUY actions, mined = done; onSuccess fires here.
  // For BUY, mined means the registry-commission tx (the BUY-intent) was
  // accepted on-chain. Auto-advance to `fund` so the buyer can pay the
  // seller, but DON'T declare success — ownership flips later in `settling`.
  //
  // The listener reads s/successFired via ref so the closure stays fresh
  // without retriggering the subscription on every state change.
  const stateRef = useRef(s);
  stateRef.current = s;
  const sawMempoolRef = useRef(false);
  useEffect(() => {
    if (phase !== "scanning") return;
    sawMempoolRef.current = false;
    const expected: Expected = {
      action,
      address: stateRef.current.address.trim() || undefined,
      priceZats: stateRef.current.priceInput
        ? Math.round((parsePrice(stateRef.current.priceInput) ?? 0) * 1e8)
        : undefined,
    };
    return watchScanning(name, network, (tick) => {
      const cur = stateRef.current;
      const { scanState: next, sawMempool } = deriveScanState(
        tick, expected, { sawMempool: sawMempoolRef.current },
      );
      sawMempoolRef.current = sawMempool;
      if (next === cur.scanState) return;
      if (next === "mined" && action === "BUY") {
        advance({ scanState: "mined" });
        return;
      }
      if (next === "mined" && !cur.successFired) {
        set({ scanState: "mined", successFired: true });
        onSuccess?.(name);
        return;
      }
      set({ scanState: next });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, name, network, action]);

  // -- Fund poll: BUY only. Auto-advance to settling when the seller's t-addr
  // shows funds at or above the listing price. The scanning phase already
  // ensured the BUY-intent is confirmed before we got here, so no gate.
  const fundActive =
    phase === "fund" && action === "BUY" && resolveResult.status === "listed";
  usePoll(fundActive, async () => {
    if (resolveResult.status !== "listed") return;
    const { payTaddr, listingPrice } = resolveResult;
    const result = await checkUtxo(payTaddr, network);
    if (result.found && result.response && result.response.total_received_zats >= listingPrice.zats) {
      advance();
    }
  }, 3000);

  // -- Settling poll: BUY only. The seller's t-addr has funds (per the fund
  // phase) but the registry doesn't transfer the name until the indexer
  // observes that payment on-chain and runs `finalize_buy`. Poll resolveName
  // until `address === buyerUa`, then declare success.
  const settleActive = phase === "settling" && s.settleState !== "mined";
  usePoll(settleActive, async () => {
    const buyerUa = s.address.trim();
    const r = await resolveName(name, network);
    if (r.status === "registered" && r.registration.address === buyerUa) {
      if (!s.successFired) {
        set({ settleState: "mined", successFired: true });
        onSuccess?.(name);
      } else {
        set({ settleState: "mined" });
      }
    } else if (r.status === "listed" && r.pendingBuy?.buyer === buyerUa) {
      set({ settleState: "confirming" });
    } else {
      set({ settleState: "not_detected" });
    }
  }, 2000);

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
          // unlock is non-interactive — re-entering re-dispatches CLAIM with a
          // fresh proof, and there's nothing the user can fix back there.
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
          height: modalContentHeight == null ? "auto" : `min(${modalContentHeight}px, calc(100vh - 2rem))`,
          transition: "height 380ms ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase !== "unlock" && (() => {
          const isMined =
            (phase === "scanning" && s.scanState === "mined")
            || (phase === "settling" && s.settleState === "mined");
          const isWaiting =
            (phase === "scanning" && s.scanState !== "mined")
            || phase === "settling";
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
          className="h-full max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain rounded-2xl"
          onWheel={(e) => e.stopPropagation()}
        >
        <div ref={modalContentRef} className="p-8" style={{ paddingTop: phase === "unlock" ? undefined : "3rem" }}>
        {progressSegments && <div className="mb-5">{progressSegments}</div>}
        {phase === "unlock" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Reserved Name</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {modalDescription(action, "unlock", name, s)}
            </p>
            <input type="text" value={s.unlockCode} autoFocus
              onChange={(e) => {
                const raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
                const formatted = [raw.slice(0, 4), raw.slice(4, 8), raw.slice(8, 12)].filter(Boolean).join("-");
                set({ unlockCode: formatted, unlockError: "" });
              }}
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
        {phase === "input" && (() => {
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
                {isResume ? <>Resume purchase of <NameBadge name={name} /></> : <>{ACTION_LABELS[action]} <NameBadge name={name} /></>}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                {isResume
                  ? modalDescription(action, "input", name, s, { isResume: true })
                  : inputDescription(action, name, listingPriceZec ? `${listingPriceZec} ZEC` : undefined)}
              </p>
            </div>
            {needsAddress && (() => {
              const trimmed = s.addressInput.trim();
              const v = trimmed ? validateAddress(trimmed) : { status: "invalid" as const, warning: "" };
              const isMatchedBuyer = !!pendingBuy && trimmed === pendingBuy.buyer;
              const isMismatchedBuyer = !!pendingBuy && !!trimmed && trimmed !== pendingBuy.buyer && v.status === "unified";
              const borderColor = !trimmed
                ? "var(--faq-border)"
                : isMatchedBuyer
                  ? "#22c55e"
                  : isMismatchedBuyer
                    ? "var(--accent-red, #e05252)"
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
                v.status !== "invalid" &&
                !isMatchedBuyer;
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
                  {isMatchedBuyer && (
                    <p className="text-xs" style={{ color: "#22c55e" }}>
                      ✓ This address matches the locked purchase. Continue to send the seller payment.
                    </p>
                  )}
                  {isMismatchedBuyer && (
                    <p className="text-xs" style={{ color: "var(--accent-red, #e05252)" }}>
                      This name is locked to a different buyer&rsquo;s address.
                    </p>
                  )}
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
            <div className="flex gap-3 justify-center">
              {s.step > 0 && (
                <button type="button" onClick={() => goto(s.step - 1)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>Back</button>
              )}
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>Cancel</button>
              <button type="button" onClick={handleInputContinue}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {isResume ? "Continue to Payment" : s.sovereign ? "Continue to Sign" : "Continue"}
              </button>
            </div>
          </div>
          );
        })()}
        {phase === "sign" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Sovereign Signature</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              Sign this payload with your Ed25519 private key to authorize{" "}
              <strong>{ACTION_LABELS[action].toLowerCase()}</strong> for <NameBadge name={name} />.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Payload to Sign</label>
              <code className="w-full break-all rounded-lg px-3 py-2 text-xs font-mono select-all"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)", color: "var(--fg-body)" }}>
                {sovereignPayload}
              </code>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => payloadCopy.copy(sovereignPayload)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                  {payloadCopy.copied ? "Copied!" : "Copy Payload"}
                </button>
                <a href={`/keypair?payload=${encodeURIComponent(sovereignPayload)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)", textDecoration: "none" }}>
                  Open Keypair Tool
                </a>
              </div>
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
                  style={{ background: "var(--color-raised)", border: `1.5px solid ${pubkeyLiveError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
                {s.signPubkey.trim() && (
                  <p className="text-xs"
                    style={{ color: pubkeyLiveError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}>
                    {pubkeyLiveError || "Valid Ed25519 public key."}
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>Signature (base64)</label>
              <textarea value={s.signSignature}
                onChange={(e) => set({ signSignature: e.target.value.trim(), signError: "" })}
                rows={3} placeholder="Paste signed payload"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none font-mono resize-none"
                style={{ background: "var(--color-raised)", border: `1.5px solid ${signatureLiveError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
              {s.signSignature.trim() && (
                <p className="text-xs"
                  style={{ color: signatureLiveError ? "var(--accent-red, #e05252)" : "var(--color-accent-green)" }}>
                  {signatureLiveError || "Valid Ed25519 signature for this payload."}
                </p>
              )}
            </div>
            {s.signError && <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>{s.signError}</p>}
            <div className="flex gap-3 justify-between">
              <button type="button" onClick={() => goto(s.step - 1)}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>Back</button>
              <button type="button" onClick={handleVerifySign} disabled={!canSubmitSovereign}
                className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {s.signLoading ? "Verifying…" : "Use Signature"}
              </button>
            </div>
          </div>
        )}
        {phase === "otp" && (
          (() => {
            return (
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
            {s.otpSent && (
              <p className="m-0 text-sm" style={{ color: "var(--fg-body)" }}>
                The registered owner will receive a code.
              </p>
            )}
            {s.otpSent && (
              <input type="text" inputMode="numeric" maxLength={6} value={s.otpCode}
                disabled={s.otpVerified}
                onChange={(e) => set({ otpCode: e.target.value.replace(/\D/g, "").slice(0, 6), otpError: "", otpVerified: false })}
                onKeyDown={(e) => { if (e.key === "Enter") handleVerifyOtp(); }}
                placeholder="000000" autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm outline-none text-center tracking-[0.3em] font-mono disabled:opacity-70"
                style={{ background: "var(--color-raised)", border: `1.5px solid ${s.otpError ? "var(--accent-red, #e05252)" : "var(--faq-border)"}`, color: "var(--fg-heading)" }} />
            )}
            {s.otpVerified && (
              <p
                className="m-0 text-sm font-semibold transition-[opacity,transform] duration-[320ms] ease-out"
                style={{
                  color: "var(--color-accent-green)",
                  opacity: 1,
                  transform: "translateY(0)",
                }}
                aria-live="polite"
              >
                Passcode accepted.
              </p>
            )}
            {(s.otpError || s.otpAttempts > 0) && (
              <p className="m-0 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1">
                {s.otpError && (
                  <span className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                    {s.otpError}
                  </span>
                )}
                {s.otpAttempts > 0 && (
                  <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
                    Attempt {s.otpAttempts} of {getNetworkConstants(network).OTP_MAX_ATTEMPTS}
                  </span>
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-3 w-full justify-between pt-1">
              {s.step > 0 ? (
                <button type="button" onClick={handleOtpBack}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                  Back
                </button>
              ) : <span />}
              <button type="button" onClick={() => set({ otpSent: true, otpError: "", otpVerified: false })}
                disabled={s.otpSent}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                I Sent It!
              </button>
              <button type="button" onClick={handleVerifyOtp}
                disabled={!s.otpSent || !s.otpCode.trim() || s.otpLoading || s.otpVerified || s.otpAttempts >= getNetworkConstants(network).OTP_MAX_ATTEMPTS}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={s.otpVerified
                  ? { background: "var(--color-accent-green-light)", color: "var(--color-accent-green)", border: "1.5px solid var(--color-accent-green)" }
                  : { background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                {s.otpVerified ? "Verified!" : s.otpLoading ? "Verifying…" : "Verify Code"}
              </button>
            </div>
          </div>
            );
          })()
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
                <button type="button" onClick={() => goto(s.step - 1)}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                  Back
                </button>
              )}
              <button type="button" onClick={() => advance()}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                I Sent It!
              </button>
            </div>
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
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {modalDescription(action, "fund", name, s, { listingPriceZec: listed.listingPrice.zec })}
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
              <button type="button" onClick={() => advance()}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--home-result-primary-bg)", color: "var(--home-result-primary-fg)", boxShadow: "var(--home-result-primary-shadow)" }}>
                I&rsquo;ve Sent the Payment
              </button>
            </div>
          );
        })()}
        {phase === "scanning" && s.scanState !== "mined" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Scanning</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {modalDescription(action, "scanning", name, s)}
            </p>
            <div className="w-full rounded-xl p-5 flex flex-col items-center gap-3"
              style={{
                background: "var(--color-raised)",
                border: `1.5px solid ${s.scanState === "in_mempool" || s.scanState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
              }}>
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {scanningStatusMessage(action, s.scanState)}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <span
                className="inline-flex overflow-hidden transition-[max-width,opacity,margin] duration-[450ms] ease-out"
                style={{
                  maxWidth: s.scanState === "not_detected" && s.step > 0 ? "7rem" : "0rem",
                  opacity: s.scanState === "not_detected" && s.step > 0 ? 1 : 0,
                  pointerEvents: s.scanState === "not_detected" && s.step > 0 ? "auto" : "none",
                }}
                aria-hidden={s.scanState === "not_detected" && s.step > 0 ? undefined : "true"}
              >
                <button type="button" onClick={() => goto(s.step - 1)}
                  tabIndex={s.scanState === "not_detected" && s.step > 0 ? 0 : -1}
                  className="whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
                  Back
                </button>
              </span>
              <button type="button" onClick={onClose}
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
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
        {phase === "settling" && s.settleState !== "mined" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>Finalising your purchase</h2>
            <p className="text-sm" style={{ color: "var(--fg-body)" }}>
              {modalDescription(action, "settling", name, s)}
            </p>
            <div className="w-full rounded-xl p-5 flex flex-col items-center gap-3"
              style={{
                background: "var(--color-raised)",
                border: `1.5px solid ${s.settleState === "confirming" ? "#ca8a04" : "var(--faq-border)"}`,
              }}>
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {settlingStatusMessage(action, s.settleState)}
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-semibold"
              style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}>
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
      </div>
    </div>,
    document.body,
  );
}
