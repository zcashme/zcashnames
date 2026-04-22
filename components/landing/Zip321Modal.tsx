"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { buildTransaction, checkUnlockCode } from "@/lib/zns/transaction";
import { checkScannerState } from "@/lib/zns/resolve";
import { checkMempool } from "@/lib/zns/mempool";
import { validateAddress } from "@/lib/zns/name";
import { buildZcashUri, parseZip321Uri } from "@/lib/payment/zip321";
import { generateSessionId, buildZvsMemo } from "@/lib/payment/memo";
import { getNetworkConstants, MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import type {
  Action,
  ModalTarget,
  PendingTransactionPhase,
  PendingTransactionScanState,
  PendingTransactionState,
} from "@/lib/types";
import type { Network } from "@/lib/zns/name";
import { useCopy } from "@/components/hooks/useCopy";
import CopyIconButton from "@/components/CopyIconButton";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type { ModalTarget } from "@/lib/types";

interface Zip321ModalProps {
  target: ModalTarget;
  onClose: () => void;
  onSuccess?: (name: string) => void;
  resumeState?: PendingTransactionState | null;
  onPersistState?: (state: PendingTransactionState) => void;
  onClearState?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Phase = "unlock" | "input" | "otp" | "sign" | "payment" | "scanning";

type AuthMode = "default" | "otp" | "sovereign";

type ScanState = PendingTransactionScanState;

type QrSectionKind = "otp" | "payment";

const ACTION_LABEL: Record<Action, string> = {
  claim: "Claim",
  buy: "Buy",
  update: "Update Address",
  list: "List for Sale",
  delist: "Delist",
  release: "Release Name",
};

const PREPARE_ACTION_LABEL: Record<Action, string> = {
  claim: "Claim",
  buy: "Buy",
  update: "Update",
  list: "List",
  delist: "Delist",
  release: "Release",
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
  return Number.isFinite(num) && num >= 0 ? num : null;
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

function prepareDescription(action: Action, name: string, amount: string): React.ReactNode {
  switch (action) {
    case "buy":
      return <>Purchase for <strong>{amount}</strong>.</>;
    case "delist":
      return <>Remove from sale.</>;
    case "release":
      return <>Allowing others to claim it.</>;
    case "update":
      return <>Set a new address.</>;
    case "list":
      return <>Set a price for <strong>{name}</strong>.</>;
    case "claim":
      return <><strong>{name}</strong></>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Zip321Modal({
  target,
  onClose,
  onSuccess,
  resumeState,
  onPersistState,
  onClearState,
}: Zip321ModalProps) {
  const {
    name,
    action,
    registrationAddress,
    registrationNonce,
    registrationPubkey,
    listingPriceZec,
    network,
    networkPassword,
    isReserved,
  } = target;
  const { OTP_SIGNIN_ADDR, OTP_AMOUNT, OTP_MAX_ATTEMPTS } =
    getNetworkConstants(network);

  const needsAddress = action === "claim" || action === "buy" || action === "update";
  const needsPrice = action === "list";
  const ownerAction = action === "update" || action === "list" || action === "delist" || action === "release";
  const ownerAuthMode: AuthMode | null = ownerAction ? (registrationPubkey ? "sovereign" : "otp") : null;
  const needsUnlock = isReserved && action === "claim";
  const displayName = `${name}.zcash`;
  const listingPriceLabel = listingPriceZec == null ? "the listed price" : `${listingPriceZec} ZEC`;
  const explorerHref =
    network === "testnet"
      ? `/explorer?env=testnet&name=${encodeURIComponent(name)}`
      : `/explorer?name=${encodeURIComponent(name)}`;

  const initialResumeState =
    resumeState &&
    resumeState.target.name === name &&
    resumeState.target.action === action &&
    resumeState.target.network === network
      ? resumeState
      : null;

  // Phase
  const [phase, setPhase] = useState<Phase>(initialResumeState?.phase ?? (needsUnlock ? "unlock" : "input"));

  const otpCopy = useCopy();
  const payloadCopy = useCopy();
  const uriCopy = useCopy();
  const otpAddressCopy = useCopy();
  const otpAmountCopy = useCopy();
  const otpMemoCopy = useCopy();
  const paymentAddressCopy = useCopy();
  const paymentAmountCopy = useCopy();
  const paymentMemoCopy = useCopy();

  // Unlock phase
  const [unlockInput, setUnlockInput] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [verifiedUnlockCode, setVerifiedUnlockCode] = useState<string | undefined>();

  // Input phase
  const [addressInput, setAddressInput] = useState(initialResumeState?.addressInput ?? "");
  const [priceInput, setPriceInput] = useState(initialResumeState?.priceInput ?? "");
  const [inputError, setInputError] = useState("");
  const [inputLoading, setInputLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>(ownerAuthMode ?? "default");
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
  const [otpSent, setOtpSent] = useState(false);
  const [showOtpUri, setShowOtpUri] = useState(false);

  // Payment phase
  const [paymentUri, setPaymentUri] = useState(initialResumeState?.paymentUri ?? "");
  const [showPaymentUri, setShowPaymentUri] = useState(false);
  const [qrDownloadError, setQrDownloadError] = useState("");
  const [showOtpHelp, setShowOtpHelp] = useState(false);
  const [showPaymentHelp, setShowPaymentHelp] = useState(false);
  const [expandedQr, setExpandedQr] = useState<QrSectionKind | null>(null);

  // Scanning phase
  const [scanState, setScanState] = useState<ScanState>(initialResumeState?.scanState ?? "loading");
  const [showNotDetectedDetail, setShowNotDetectedDetail] = useState(false);
  // Sticky flag: once we've seen the tx in the mempool during this scanning
  // session, treat any subsequent "empty mempool, empty resolver" as
  // "being_mined" rather than regressing to "not_detected".
  const sawMempoolRef = useRef(false);
  // One-shot guard so onSuccess fires at most once per scanning session.
  const firedSuccessRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const otpQrRef = useRef<HTMLDivElement>(null);
  const paymentQrRef = useRef<HTMLDivElement>(null);
  const otpQrCanvasRef = useRef<HTMLCanvasElement>(null);
  const paymentQrCanvasRef = useRef<HTMLCanvasElement>(null);

  function buildPendingState(nextPhase: PendingTransactionPhase, nextScanState: ScanState = scanState): PendingTransactionState {
    return {
      target: {
        name,
        action,
        registrationAddress,
        registrationNonce,
        registrationPubkey,
        listingPriceZec,
        network,
        isReserved,
      },
      phase: nextPhase,
      addressInput,
      priceInput,
      paymentUri,
      scanState: nextScanState,
      updatedAt: Date.now(),
    };
  }

  function handleCloseRequest() {
    if ((phase === "payment" || phase === "scanning") && paymentUri && onPersistState) {
      onPersistState(buildPendingState(phase, phase === "scanning" ? scanState : "loading"));
    }
    onClose();
  }

  // Focus first input on mount
  const addressRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const sovereignPubkeyRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (needsAddress) addressRef.current?.focus();
    else if (needsPrice) priceRef.current?.focus();
  }, [needsAddress, needsPrice]);

  useEffect(() => {
    setAuthMode(ownerAuthMode ?? "default");
    setInputError("");
    setSignError("");
  }, [ownerAuthMode, name, action]);

  // ESC key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleCloseRequest(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [handleCloseRequest]);

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

  useEffect(() => {
    if (phase !== "scanning") {
      setShowNotDetectedDetail(false);
      return;
    }

    setShowNotDetectedDetail(false);
    const id = window.setTimeout(() => {
      setShowNotDetectedDetail(true);
    }, 15000);

    return () => {
      window.clearTimeout(id);
    };
  }, [phase]);

  // Ref mirror so the interval callback can read the latest scan state without
  // having to re-create the interval on every state change.
  const scanStateRef = useRef<ScanState>("loading");
  useEffect(() => { scanStateRef.current = scanState; }, [scanState]);

  useEffect(() => {
    if (!onPersistState) return;
    if ((phase === "payment" || phase === "scanning") && paymentUri) {
      onPersistState(buildPendingState(phase, phase === "scanning" ? scanState : "loading"));
      return;
    }
    onClearState?.();
  }, [addressInput, onClearState, onPersistState, paymentUri, phase, priceInput, scanState]);

  // Address validation (live)
  const addrValidation = addressInput.trim()
    ? validateAddress(addressInput.trim())
    : { status: "invalid" as const, warning: "" };

  const addrBorderColor = !addressInput.trim()
    ? "var(--faq-border)"
    : addrValidation.status === "viewkey" || addrValidation.status === "tex" || addrValidation.status === "invalid"
      ? "var(--accent-red, #e05252)"
      : addrValidation.status === "unified"
        ? "#22c55e"
        : "#ca8a04";

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
      if (v.status === "viewkey" || v.status === "tex" || v.status === "invalid") {
        setInputError(v.warning || "Invalid address format."); return;
      }
    }

    // Validate price
    if (needsPrice) {
      const zec = parsedPrice;
      if (zec === null) { setInputError("Enter a valid price."); return; }
      if (zec < 0 || zec > MAX_LIST_FOR_SALE_AMOUNT) {
        setInputError("Price must be between 0 and 21,000,000 ZEC.");
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
      setOtpSent(false);
      setShowOtpUri(false);
      setShowOtpHelp(false);
      setQrDownloadError("");
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
      goToPayment(result.uri);
    } catch {
      setInputError("Something went wrong. Try again.");
    } finally {
      setInputLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otpLoading) return;
    if (!otpSent) { setOtpError("Send the verification transaction first, then enter the code from your wallet."); return; }
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
      goToPayment(result.uri);
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
      goToPayment(result.uri);
    } catch {
      setSignError("Something went wrong. Try again.");
    } finally {
      setSignLoading(false);
    }
  }

  /*
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
    setOtpSent(false);
    setShowOtpUri(false);
    setShowOtpHelp(false);
    setQrDownloadError("");
  }
  */

  function handleOtpBack() {
    const confirmed = window.confirm("Are You Sure? You will have to request another passcode.");
    if (!confirmed) return;

    setOtpInput("");
    setOtpAttempts(0);
    setOtpError("");
    setOtpSent(false);
    setShowOtpUri(false);
    setShowOtpHelp(false);
    setQrDownloadError("");
    setPhase("input");
  }

  function goToPayment(uri: string) {
    setPaymentUri(uri);
    setShowPaymentUri(false);
    setShowPaymentHelp(false);
    setQrDownloadError("");
    setScanState("loading");
    setShowNotDetectedDetail(false);
    setPhase("payment");
  }

  function qrFilename(kind: QrSectionKind) {
    const cleanName = name.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "name";
    if (kind === "otp") return `zcashname-verify-ownership-${cleanName}.png`;
    return `zcashname-${action}-${cleanName}.png`;
  }

  async function downloadQrPng(kind: QrSectionKind) {
    const sourceCanvas = kind === "otp" ? otpQrCanvasRef.current : paymentQrCanvasRef.current;
    if (!sourceCanvas) {
      setQrDownloadError("QR download is unavailable. Try again or copy the URI.");
      return;
    }

    try {
      setQrDownloadError("");
      const padding = 96;
      const qrSize = 768;
      const canvas = document.createElement("canvas");
      canvas.width = qrSize + padding * 2;
      canvas.height = qrSize + padding * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas is unavailable.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sourceCanvas, padding, padding, qrSize, qrSize);

      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("QR PNG export failed."));
        }, "image/png");
      });
      const pngUrl = URL.createObjectURL(pngBlob);
      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = qrFilename(kind);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    } catch {
      setQrDownloadError("Could not save the QR. Try taking a screenshot or copying the URI.");
    }
  }

  function renderExpandIcon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M8 3H3v5" />
        <path d="M3 3l7 7" />
        <path d="M16 3h5v5" />
        <path d="M21 3l-7 7" />
        <path d="M8 21H3v-5" />
        <path d="M3 21l7-7" />
        <path d="M16 21h5v-5" />
        <path d="M21 21l-7-7" />
      </svg>
    );
  }

  function renderRetractIcon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M10 3v7H3" />
        <path d="M3 10l7-7" />
        <path d="M14 3v7h7" />
        <path d="M21 10l-7-7" />
        <path d="M10 21v-7H3" />
        <path d="M3 14l7 7" />
        <path d="M14 21v-7h7" />
        <path d="M21 14l-7 7" />
      </svg>
    );
  }

  function renderScanIcon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M7 3H5a2 2 0 0 0-2 2v2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <path d="M8 8h8v8H8z" />
        <path d="M11 11h2v2h-2z" />
      </svg>
    );
  }

  function renderPrepareIcon() {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M8 6h8" />
        <path d="M8 10h5" />
        <path d="M8 14h4" />
        <path d="M16 3h1a2 2 0 0 1 2 2v6" />
        <path d="M7 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5" />
        <path d="M9 3h6" />
        <path d="M15 18l4-4 2 2-4 4h-2v-2z" />
      </svg>
    );
  }

  function renderFloatingPhaseIcon() {
    if (phase !== "input" && phase !== "otp" && phase !== "payment" && phase !== "scanning") return null;

    const isMined = phase === "scanning" && scanState === "mined";
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
            style={{
              borderColor: "var(--border-muted)",
              borderTopColor: "var(--fg-heading)",
            }}
          />
        ) : isMined ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : phase === "input" ? (
          renderPrepareIcon()
        ) : (
          renderScanIcon()
        )}
      </span>
    );
  }

  function getFlowSteps(): Phase[] {
    const steps: Phase[] = [];
    if (needsUnlock) steps.push("unlock");
    steps.push("input");
    if (isSovereignMode) steps.push("sign");
    else if (usesOtpFlow) steps.push("otp");
    steps.push("payment", "scanning");
    return steps;
  }

  function progressClipPath(index: number, count: number): string {
    if (count <= 1) return "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
    if (index === 0) return "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 0 100%)";
    if (index === count - 1) return "polygon(0 0, 100% 0, 100% 100%, 6px 100%)";
    return "polygon(0 0, calc(100% - 6px) 0, 100% 100%, 6px 100%)";
  }

  function renderProgressSegments() {
    const steps = getFlowSteps();
    const currentIndex = steps.indexOf(phase);
    if (currentIndex < 0) return null;

    return (
      <div className="flex w-full justify-center" aria-hidden="true">
        <div className="flex max-w-full items-center gap-[3px]">
          {steps.map((step, index) => (
            <span
              key={`${step}-${index}`}
              className="block h-1.5 w-8 sm:w-[34px]"
              style={{
                clipPath: progressClipPath(index, steps.length),
                background: index <= currentIndex ? "var(--fg-heading)" : "var(--border-muted)",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  function renderManualCopyRow(label: string, value: string, copied: boolean, onCopy: () => void) {
    return (
      <div className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-left">
        <span className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
          {label}
        </span>
        <code
          className="min-w-0 truncate rounded-md px-2 py-1 text-xs font-mono"
          style={{ background: "var(--color-raised)", color: "var(--fg-body)", border: "1px solid var(--border-muted)" }}
          title={value}
        >
          {value || "Not set"}
        </code>
        <CopyIconButton
          copied={copied}
          onClick={onCopy}
          disabled={!value}
          style={secondaryBtnStyle}
          ariaLabel={`Copy ${label.toLowerCase()}`}
          title={copied ? "Copied!" : `Copy ${label.toLowerCase()}`}
        />
      </div>
    );
  }

  function renderQrPaymentBlock(kind: QrSectionKind, uri: string, size: number) {
    const isOtp = kind === "otp";
    const parsed = uri ? parseZip321Uri(uri) : { address: "", amount: "", memoRaw: "", memoDecoded: "" };
    const showUri = isOtp ? showOtpUri : showPaymentUri;
    const setShowUri = isOtp ? setShowOtpUri : setShowPaymentUri;
    const showHelp = isOtp ? showOtpHelp : showPaymentHelp;
    const setShowHelp = isOtp ? setShowOtpHelp : setShowPaymentHelp;
    const uriCopyState = isOtp ? otpCopy : uriCopy;
    const addressCopy = isOtp ? otpAddressCopy : paymentAddressCopy;
    const amountCopy = isOtp ? otpAmountCopy : paymentAmountCopy;
    const memoCopy = isOtp ? otpMemoCopy : paymentMemoCopy;
    const qrRef = isOtp ? otpQrRef : paymentQrRef;
    const qrCanvasRef = isOtp ? otpQrCanvasRef : paymentQrCanvasRef;
    const label = isOtp ? "ownership verification URI" : "payment URI";

    return (
      <div className="w-full flex flex-col items-center gap-4">
        <div className="grid w-full grid-cols-[2.25rem_auto_2.25rem] items-start justify-center gap-2">
          <span aria-hidden="true" />
          <a
            href={uri}
            className="block rounded-xl p-3 transition-transform duration-150 ease-out active:scale-95"
            style={{ background: "#ffffff", WebkitTapHighlightColor: "transparent" }}
            aria-label={`Open ${label} in wallet`}
            title={`Open ${label} in wallet`}
          >
            <div ref={qrRef} className="block leading-none">
              <QRCodeSVG value={uri} size={size} fgColor="#000000" bgColor="#ffffff" marginSize={4} />
              <QRCodeCanvas
                ref={qrCanvasRef}
                value={uri}
                size={768}
                fgColor="#000000"
                bgColor="#ffffff"
                marginSize={4}
                className="pointer-events-none absolute h-px w-px opacity-0"
                aria-hidden="true"
              />
            </div>
          </a>
          <button
            type="button"
            onClick={() => setExpandedQr(kind)}
            className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={secondaryBtnStyle}
            aria-label={`Expand ${label} QR`}
            title={`Expand ${label} QR`}
          >
            {renderExpandIcon()}
          </button>
        </div>

        <div className="w-full flex flex-col gap-3">
          {showUri && (
            <div
              className="flex w-full items-stretch overflow-hidden rounded-lg text-left"
              style={{ background: "var(--color-raised)", color: "var(--fg-body)", border: "1px solid var(--border-muted)" }}
            >
              <code className="min-w-0 flex-1 break-all px-3 py-2 text-xs select-all">{uri}</code>
              <div
                className="flex items-center px-1.5"
                style={{ borderLeft: "1px solid var(--border-muted)" }}
              >
                <CopyIconButton
                  copied={uriCopyState.copied}
                  onClick={() => uriCopyState.copy(uri)}
                  ariaLabel={`Copy ${label}`}
                  title={uriCopyState.copied ? "Copied!" : `Copy ${label}`}
                  style={{
                    background: "transparent",
                    border: "0",
                    color: "var(--fg-body)",
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowHelp((current) => !current)}
            className="self-center px-1 py-1 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
            style={{ color: "var(--fg-body)" }}
          >
            {showHelp ? "Hide Help" : "Trouble scanning?"}
          </button>

          <div
            className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
            style={{
              gridTemplateRows: showHelp ? "1fr" : "0fr",
              opacity: showHelp ? 1 : 0,
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className="rounded-xl p-4 text-left"
                style={{ background: "var(--color-raised)", border: "1px solid var(--border-muted)" }}
              >
                <div className="flex flex-col gap-2 text-xs leading-relaxed" style={{ color: "var(--fg-body)" }}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => setShowUri((current) => !current)}
                      className="w-20 shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={secondaryBtnStyle}
                    >
                      {showUri ? "Hide URI" : "Show URI"}
                    </button>
                    <p className="m-0">Using Zingo! or Zkool? Tap the QR to open in wallet or paste URI in To: field.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => downloadQrPng(kind)}
                      className="w-20 shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={secondaryBtnStyle}
                    >
                      Save QR
                    </button>
                    <p className="m-0">Using Zashi? Save the QR, then upload it from the wallet scanner.</p>
                  </div>
                  <p>Manual entry: copy the address, memo, and amount into your wallet.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {renderManualCopyRow("Address", parsed.address, addressCopy.copied, () => addressCopy.copy(parsed.address))}
            {renderManualCopyRow("Amount", parsed.amount, amountCopy.copied, () => amountCopy.copy(parsed.amount))}
            {renderManualCopyRow("Memo", parsed.memoDecoded, memoCopy.copied, () => memoCopy.copy(parsed.memoDecoded))}
          </div>

          {qrDownloadError && (
            <p className="text-left text-xs font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
              {qrDownloadError}
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderExpandedQrLayer() {
    if (!expandedQr) return null;
    const uri = expandedQr === "otp" ? otpUri : paymentUri;
    if (!uri) return null;
    const label = expandedQr === "otp" ? "ownership verification URI" : "payment URI";

    return (
      <div
        className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
        onClick={(e) => {
          e.stopPropagation();
          setExpandedQr(null);
        }}
      >
        <div className="flex max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] items-start justify-center gap-2">
          <a
            href={uri}
            className="block rounded-xl bg-white p-3 transition-transform duration-150 ease-out active:scale-95"
            style={{ WebkitTapHighlightColor: "transparent" }}
            aria-label={`Open expanded ${label} in wallet`}
            title={`Open ${label} in wallet`}
            onClick={(e) => e.stopPropagation()}
          >
            <QRCodeSVG
              value={uri}
              size={900}
              fgColor="#000000"
              bgColor="#ffffff"
              marginSize={4}
              className="h-auto w-[min(76vw,76vh,900px)] max-w-full"
            />
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedQr(null);
            }}
            className="mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-black cursor-pointer transition-opacity hover:opacity-85"
            aria-label={`Retract ${label} QR`}
            title={`Retract ${label} QR`}
          >
            {renderRetractIcon()}
          </button>
        </div>
      </div>
    );
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
      onClick={handleCloseRequest}
    >
      <div
        ref={containerRef}
        className="relative rounded-2xl w-full max-w-md overflow-visible"
        style={{
          background: "var(--feature-card-bg)",
          border: "1px solid var(--faq-border)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Phase 0: Unlock (reserved names only) ── */}
        {renderFloatingPhaseIcon()}
        <div
          className="max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain rounded-2xl"
          onWheel={(e) => e.stopPropagation()}
        >
        {phase === "unlock" && (
            <div className="p-8 flex flex-col gap-5">
              {renderProgressSegments()}
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
          <div className="px-8 pb-8 pt-12 flex flex-col gap-5">
            {renderProgressSegments()}
            <div className="text-center">
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                {PREPARE_ACTION_LABEL[action]} {name}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                {prepareDescription(action, name, listingPriceLabel)}
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
                {addressInput.trim() && addrValidation.warning && addrValidation.status !== "viewkey" && addrValidation.status !== "tex" && addrValidation.status !== "invalid" && (
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

            {ownerAction ? (
              <p className="text-center text-sm" style={{ color: "var(--fg-body)" }}>
                Changes to this name are authorized by{" "}
                <strong style={{ color: "var(--fg-heading)" }}>
                  {ownerAuthMode === "sovereign" ? "keypairs" : "passcodes"}
                </strong>
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ color: "var(--fg-muted)" }}>
                  Changes to this name will be authorized by
                </label>
                <div className="grid grid-cols-2 gap-2">
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
                </div>
              </div>
            )}

            {inputError && (
              <p className="text-sm font-semibold" style={{ color: "var(--accent-red, #e05252)" }}>
                {inputError}
              </p>
            )}

            <div className="flex gap-3 justify-center pt-1">
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
          <div className="px-8 pb-8 pt-12 flex flex-col items-center gap-5 text-center">
            {renderProgressSegments()}
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                Verify Ownership
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                Send exact amount and memo to address to request code.
              </p>
            </div>

            {otpUri && (
              renderQrPaymentBlock("otp", otpUri, 180)
            )}

            {otpSent ? (
              <div className="w-full flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-center" style={{ color: "var(--fg-muted)" }}>
                  Check your wallet&hellip; you will receive a six-digit code.
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
            ) : null}

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

            <div className="flex flex-wrap gap-3 w-full justify-between pt-1">
              <button
                type="button"
                onClick={handleOtpBack}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(true);
                  setOtpError("");
                }}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={secondaryBtnStyle}
              >
                I Sent It!
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!otpSent || !otpInput.trim() || otpLoading || otpAttempts >= OTP_MAX_ATTEMPTS}
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
          <div className="px-8 pb-8 pt-12 flex flex-col gap-5">
            {renderProgressSegments()}
            <div className="text-center">
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
          <div className="px-8 pb-8 pt-12 flex flex-col items-center gap-5 text-center">
            {renderProgressSegments()}
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--fg-heading)" }}>
                Send to {ACTION_LABEL[action].toLowerCase()} &quot;{name}&quot;
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--fg-body)" }}>
                Send exact amount and memo to address to complete transaction.
              </p>
            </div>

            {paymentUri && (
              renderQrPaymentBlock("payment", paymentUri, 200)
            )}

            <div className="flex gap-3 w-full justify-center pt-1">
              {(action === "claim" || action === "buy") && (
                <button
                  type="button"
                  onClick={() => setPhase("input")}
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={secondaryBtnStyle}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setScanState("loading");
                  setShowNotDetectedDetail(false);
                  setPhase("scanning");
                }}
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
          <div className="px-8 pb-8 pt-12 flex flex-col items-center gap-5 text-center">
            {renderProgressSegments()}
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
              <p className="text-sm" style={{ color: "var(--fg-body)" }}>
                {scanState === "loading" && "Checking…"}
                {scanState === "not_detected" && (
                  <>
                    Your {ACTION_NOUN[action]} hasn&rsquo;t been detected yet.
                    {showNotDetectedDetail && " It may not have propagated, or wasn't sent correctly."}
                  </>
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
                disabled={scanState === "mined"}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                style={secondaryBtnStyle}
              >
                Back
              </button>
              {scanState === "mined" ? (
                <a
                  href={explorerHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                  style={secondaryBtnStyle}
                >
                  View on Explorer
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-not-allowed opacity-50"
                  style={secondaryBtnStyle}
                >
                  View on Explorer
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseRequest}
                className="px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      {renderExpandedQrLayer()}
    </div>,
    document.body,
  );
}
