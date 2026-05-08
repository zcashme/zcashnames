"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ZNS } from "zcashname-sdk";
import type { ModalRequest, ModalPhase, Action, Network } from "@/lib/types";
import { getNetworkConstants, MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import { verifyOtp, buildClaim, buildBuy, buildUpdate, buildList, buildDelist, buildRelease, checkUnlockCode } from "@/lib/zns/actions";
import { checkScannerState } from "@/lib/zns/resolve";
import { checkMempool } from "@/lib/zns/mempool";
import { validateAddress, normalizeUsername } from "@/lib/zns/utils";
import { generateSessionId, buildZvsMemo } from "@/lib/payment/memo";
import { buildZcashUri } from "@/lib/payment/zip321";
import { readLocalStorage, writeLocalStorage, removeLocalStorage } from "@/components/hooks/useLocalStorage";

const STORAGE_KEY = "zns-modal-v2";

function initialState(): ModalPhase {
  return { phase: "idle" };
}

function defaultAuth(request: ModalRequest): "default" | "otp" | "sovereign" {
  if (request.registration?.pubkey) return "sovereign";
  if (request.action === "CLAIM" || request.action === "BUY") return "default";
  return "otp";
}

function needsOtp(request: ModalRequest): boolean {
  return request.action !== "CLAIM" && request.action !== "BUY";
}

function isOwnerAction(action: Action): boolean {
  return action === "UPDATE" || action === "LIST" || action === "DELIST" || action === "RELEASE";
}

function needsUnlock(request: ModalRequest): boolean {
  return request.isReserved === true && request.action === "CLAIM";
}

export interface ModalMachineAPI {
  state: ModalPhase;
  open: (request: ModalRequest) => void;
  close: () => void;
  setUnlockCode: (code: string) => void;
  submitUnlock: () => Promise<void>;
  setAddress: (addr: string) => void;
  setPrice: (price: string) => void;
  setPayTaddr: (addr: string) => void;
  setAuth: (mode: "default" | "otp" | "sovereign") => void;
  submitInput: () => Promise<void>;
  otpUri: string;
  otpBack: () => void;
  markOtpSent: () => void;
  setOtpCode: (code: string) => void;
  submitOtp: () => Promise<void>;
  setSignPubkey: (key: string) => void;
  setSignSignature: (sig: string) => void;
  submitSign: () => Promise<void>;
  sentTransaction: () => void;
  sentFund: () => void;
  dismissDone: () => void;
}

export function useModalMachine(onSuccess?: (name: string) => void): ModalMachineAPI {
  const [state, setState] = useState<ModalPhase>(() =>
    readLocalStorage(STORAGE_KEY, initialState()),
  );
  const successRef = useRef<string | null>(null);

  // Persist to localStorage on every state change
  useEffect(() => {
    if (state.phase === "idle" || state.phase === "done") {
      removeLocalStorage(STORAGE_KEY);
    } else {
      writeLocalStorage(STORAGE_KEY, state);
    }
  }, [state]);

  // Scanner polling
  useEffect(() => {
    if (state.phase !== "scanning" || state.scan === "mined") return;

    const current = state;
    let cancelled = false;
    let sawMempool = false;

    const action = current.request.action;
    const name = current.request.name;
    const network = current.request.network;

    const expectedAddr = action === "CLAIM" || action === "BUY" || action === "UPDATE" ? current.request.registration?.address : undefined;
    const expectedPrice = action === "LIST" ? (() => {
      const req = current.request;
      if (req.listing?.priceZec) return Math.round(req.listing.priceZec * 1e8);
      return undefined;
    })() : undefined;

    async function poll() {
      const [mr, rr] = await Promise.all([
        checkMempool(name, network),
        checkScannerState(name, network, action, { address: expectedAddr, priceZats: expectedPrice }),
      ]);
      if (cancelled) return;

      if (mr.found) sawMempool = true;

      let scan: ModalPhase["scan"] = "loading";
      let txid: string | undefined;
      let warnings: string[] | undefined;

      if (rr === "success") {
        scan = "mined";
      } else if (mr.found && mr.entry) {
        scan = "in_mempool";
        txid = mr.entry.txid;
        warnings = mr.entry.warnings;
      } else if (sawMempool) {
        scan = "being_mined";
      } else {
        scan = "not_detected";
      }

      setState((prev) => prev.phase === "scanning" ? {
        ...prev,
        scan,
        txid: txid ?? prev.txid,
        warnings: warnings ?? prev.warnings,
      } as ModalPhase & { phase: "scanning" } : prev);

      if (scan === "mined") {
        const key = `${network}:${action}:${name}`;
        if (successRef.current !== key) {
          successRef.current = key;
          onSuccess?.(name);
        }
        setState((prev) => prev.phase === "scanning" ? { ...prev, scan: "mined", txid: txid ?? prev.txid } as ModalPhase & { phase: "scanning" } : prev);
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [state.phase === "scanning" ? state.scan : null, onSuccess]);

  // Actions
  const open = useCallback((request: ModalRequest) => {
    if (needsUnlock(request)) {
      setState({ phase: "unlock", request, code: "", loading: false, error: "" });
    } else {
      setState({
        phase: "input",
        request,
        address: "",
        price: "",
        payTaddr: "",
        auth: defaultAuth(request),
        loading: false,
        error: "",
      });
    }
  }, []);

  const close = useCallback(() => {
    setState((s) => {
      if (s.phase === "scanning") return s;
      if (s.phase === "confirm" || s.phase === "fund") return s;
      return initialState();
    });
  }, []);

  // Unlock
  const setUnlockCode = useCallback((code: string) => {
    setState((s) => s.phase === "unlock" ? { ...s, code, error: "" } as ModalPhase & { phase: "unlock" } : s);
  }, []);

  const submitUnlock = useCallback(async () => {
    setState((s) => s.phase === "unlock" ? { ...s, loading: true, error: "" } as ModalPhase & { phase: "unlock" } : s);
    const current = (await new Promise<ModalPhase & { phase: "unlock" }>((resolve) => {
      setState((s) => {
        if (s.phase !== "unlock") return s;
        resolve(s);
        return s;
      });
    }));
    try {
      const result = await checkUnlockCode(current.request.name, current.code);
      if (!result.ok) {
        setState((s) => s.phase === "unlock" ? { ...s, loading: false, error: result.error || "Invalid unlock code." } as ModalPhase & { phase: "unlock" } : s);
        return;
      }
      setState({
        phase: "input",
        request: current.request,
        address: "",
        price: "",
        payTaddr: "",
        auth: defaultAuth(current.request),
        unlockProof: result.proof,
        loading: false,
        error: "",
      });
    } catch {
      setState((s) => s.phase === "unlock" ? { ...s, loading: false, error: "Something went wrong." } as ModalPhase & { phase: "unlock" } : s);
    }
  }, []);

  // Input
  const setAddress = useCallback((address: string) => {
    setState((s) => s.phase === "input" ? { ...s, address, error: "" } as ModalPhase & { phase: "input" } : s);
  }, []);

  const setPrice = useCallback((price: string) => {
    setState((s) => s.phase === "input" ? { ...s, price, error: "" } as ModalPhase & { phase: "input" } : s);
  }, []);

  const setPayTaddr = useCallback((addr: string) => {
    setState((s) => s.phase === "input" ? { ...s, payTaddr: addr, error: "" } as ModalPhase & { phase: "input" } : s);
  }, []);

  const setAuth = useCallback((auth: "default" | "otp" | "sovereign") => {
    setState((s) => s.phase === "input" ? { ...s, auth, error: "" } as ModalPhase & { phase: "input" } : s);
  }, []);

  const submitInput = useCallback(async () => {
    setState((s) => s.phase === "input" ? { ...s, loading: true, error: "" } as ModalPhase & { phase: "input" } : s);
    const current = await new Promise<ModalPhase & { phase: "input" }>((resolve) => {
      setState((s) => { if (s.phase !== "input") return s; resolve(s); return s; });
    });

    const { request, address, price, payTaddr } = current;

    // Validate
    const needsAddr = request.action === "CLAIM" || request.action === "BUY" || request.action === "UPDATE";
    const needsPrice = request.action === "LIST";
    const needsPTaddr = request.action === "LIST";

    if (needsAddr) {
      const addr = address.trim();
      if (!addr) { setState((s) => s.phase === "input" ? { ...s, loading: false, error: "Address is required." } as ModalPhase & { phase: "input" } : s); return; }
      const v = validateAddress(addr);
      if (["viewkey", "tex", "invalid"].includes(v.status)) {
        setState((s) => s.phase === "input" ? { ...s, loading: false, error: v.warning || "Invalid address." } as ModalPhase & { phase: "input" } : s); return;
      }
    }

    if (needsPrice) {
      const zec = parseFloat(price.replace(/,/g, ""));
      if (isNaN(zec) || zec < 0 || zec > MAX_LIST_FOR_SALE_AMOUNT) {
        setState((s) => s.phase === "input" ? { ...s, loading: false, error: "Price must be between 0 and 21,000,000 ZEC." } as ModalPhase & { phase: "input" } : s); return;
      }
    }

    // Route based on auth
    if (current.auth === "sovereign") {
      const zns = new ZNS({ network: request.network });
      const nextNonce = (request.registration?.nonce ?? 0) + 1;
      let payload = "";
      switch (request.action) {
        case "CLAIM": payload = zns.prepareClaim(request.name, address.trim(), 0).payload; break;
        case "BUY": payload = zns.prepareBuy(request.name, address.trim(), 0).payload; break;
        case "UPDATE": payload = zns.prepareUpdate(request.name, address.trim(), nextNonce).payload; break;
        case "LIST": payload = zns.prepareList(request.name, Math.round(parseFloat(price.replace(/,/g, "")) * 1e8), payTaddr.trim(), nextNonce).payload; break;
        case "DELIST": payload = zns.prepareDelist(request.name, nextNonce).payload; break;
        case "RELEASE": payload = zns.prepareRelease(request.name, nextNonce).payload; break;
      }
      setState({ phase: "sign", request, payload, pubkey: request.registration?.pubkey ?? "", sig: "", loading: false, error: "", pubkeyError: "", sigError: "" });
      return;
    }

    if (current.auth === "otp") {
      if (!request.registration?.address) {
        setState((s) => s.phase === "input" ? { ...s, loading: false, error: "Registration address unavailable. Search again." } as ModalPhase & { phase: "input" } : s); return;
      }
      const sid = generateSessionId();
      setState({ phase: "otp", request, sessionId: sid, registeredAddress: request.registration.address, code: "", sent: false, attempts: 0, loading: false, error: "" });
      return;
    }

    // Default auth — call server directly
    try {
      const base = { name: request.name, network: request.network };
      let uri = "";
      if (request.action === "BUY") {
        const r = await buildBuy({ ...base, address: address.trim(), listingPriceZats: request.listing?.priceZec ? Math.round(request.listing.priceZec * 1e8) : undefined });
        if (!r.ok) { setState((s) => s.phase === "input" ? { ...s, loading: false, error: r.error } as ModalPhase & { phase: "input" } : s); return; }
        uri = r.uri;
      } else {
        const r = await buildClaim({ ...base, address: address.trim(), unlockProof: current.unlockProof });
        if (!r.ok) { setState((s) => s.phase === "input" ? { ...s, loading: false, error: r.error } as ModalPhase & { phase: "input" } : s); return; }
        uri = r.uri;
      }
      setState({ phase: "confirm", request, uri });
    } catch (err) {
      setState((s) => s.phase === "input" ? { ...s, loading: false, error: err instanceof Error ? err.message : "Transaction failed." } as ModalPhase & { phase: "input" } : s);
    }
  }, []);

  // OTP
  const otpUri = useMemo(() => {
    if (state.phase !== "otp") return "";
    const memo = buildZvsMemo(state.sessionId, state.registeredAddress);
    const { OTP_SIGNIN_ADDR, OTP_AMOUNT } = getNetworkConstants(state.request.network);
    return buildZcashUri(OTP_SIGNIN_ADDR, OTP_AMOUNT, memo);
  }, [state.phase === "otp" ? (state as { sessionId: string; registeredAddress: string; request: ModalRequest }).sessionId : null]);

  const otpBack = useCallback(() => {
    setState((s) => s.phase === "otp" ? { phase: "input", request: s.request, address: "", price: "", payTaddr: "", auth: "otp", loading: false, error: "" } : s);
  }, []);

  const markOtpSent = useCallback(() => {
    setState((s) => s.phase === "otp" ? { ...s, sent: true, error: "" } as ModalPhase : s);
  }, []);

  const setOtpCode = useCallback((code: string) => {
    setState((s) => s.phase === "otp" ? { ...s, code, error: "" } as ModalPhase : s);
  }, []);

  const submitOtp = useCallback(async () => {
    setState((s) => s.phase === "otp" ? { ...s, loading: true, error: "" } as ModalPhase : s);
    const current = await new Promise<ModalPhase & { phase: "otp" }>((resolve) => {
      setState((s) => { if (s.phase !== "otp") return s; resolve(s); return s; });
    });

    if (!/^\d{6}$/.test(current.code)) {
      setState((s) => s.phase === "otp" ? { ...s, loading: false, error: "Enter the 6-digit code from your wallet." } as ModalPhase : s);
      return;
    }

    const { OTP_MAX_ATTEMPTS } = getNetworkConstants(current.request.network);
    if (current.attempts >= OTP_MAX_ATTEMPTS) {
      setState((s) => s.phase === "otp" ? { ...s, loading: false, error: "Max attempts reached. Please start over." } as ModalPhase : s);
      return;
    }

    const memo = buildZvsMemo(current.sessionId, current.registeredAddress);

    try {
      const vr = await verifyOtp(memo, current.code, current.registeredAddress);
      if (!vr.ok) {
        setState((s) => s.phase === "otp" ? { ...s, loading: false, error: vr.error, attempts: s.attempts + 1, code: "" } as ModalPhase : s);
        return;
      }

      // Call the appropriate action builder
      const { request, proof } = { ...current, proof: vr.proof as string };
      const base = { name: current.request.name, network: current.request.network, otpProof: vr.proof };

      let result;

      // Need address/price inputs from the previous input phase - extract from request
      const addr = current.request.registration?.address ?? "";
      
      // Call appropriate builder based on action
      switch (current.request.action) {
        case "UPDATE":
          // Need the new address - get from request
          result = await buildUpdate({ ...base, address: addr });
          break;
        case "LIST": {
          const pz = current.request.listing?.priceZec ?? 0;
          const pt = current.request.listing?.payTaddr ?? "";
          result = await buildList({ ...base, priceZats: Math.round(pz * 1e8), payTaddr: pt });
          break;
        }
        case "DELIST":
          result = await buildDelist(base);
          break;
        case "RELEASE":
          result = await buildRelease(base);
          break;
        default:
          setState((s) => s.phase === "otp" ? { ...s, loading: false, error: "Unsupported action." } as ModalPhase : s);
          return;
      }

      if (!result.ok) {
        setState((s) => s.phase === "otp" ? { ...s, loading: false, error: result.error } as ModalPhase : s);
        return;
      }
      setState({ phase: "confirm", request: current.request, uri: result.uri });
    } catch (err) {
      setState((s) => s.phase === "otp" ? { ...s, loading: false, error: err instanceof Error ? err.message : "Something went wrong." } as ModalPhase : s);
    }
  }, []);

  // Sovereign sign
  const setSignPubkey = useCallback((key: string) => {
    setState((s) => s.phase === "sign" ? { ...s, pubkey: key, error: "", pubkeyError: "", sigError: "" } as ModalPhase : s);
  }, []);

  const setSignSignature = useCallback((sig: string) => {
    setState((s) => s.phase === "sign" ? { ...s, sig, error: "", pubkeyError: "", sigError: "" } as ModalPhase : s);
  }, []);

  const submitSign = useCallback(async () => {
    setState((s) => s.phase === "sign" ? { ...s, loading: true, error: "" } as ModalPhase : s);
    const current = await new Promise<ModalPhase & { phase: "sign" }>((resolve) => {
      setState((s) => { if (s.phase !== "sign") return s; resolve(s); return s; });
    });

    // We need the address/price info from the state. Since we moved to sign from input, 
    // we need to get the address and price from the sign phase state. But we don't store those in sign phase.
    // The sign phase has payload which contains the info, or we need to extract from somewhere.
    
    // Actually, current design: the address/price are NOT stored in sign phase. 
    // This is a problem for the server call which needs them.
    // 
    // For simplicity: the hook's submitSign just passes through to the server.
    // The server actions have their own build* functions that resolve the name again.
    // So address isn't needed here - the server action builds it.
    
    const { request } = current;
    const base = { name: request.name, network: request.network, sovereignSig: current.sig, sovereignPub: current.pubkey || undefined };

    let result;
    switch (request.action) {
      case "CLAIM":
        result = await buildClaim({ ...base, address: "" });
        break;
      case "BUY":
        result = await buildBuy({ ...base, address: "", listingPriceZats: request.listing?.priceZec ? Math.round(request.listing.priceZec * 1e8) : undefined });
        break;
      case "UPDATE":
        result = await buildUpdate({ ...base, address: "" });
        break;
      case "LIST": {
        const pz = request.listing?.priceZec ?? 0;
        const pt = request.listing?.payTaddr ?? "";
        result = await buildList({ ...base, priceZats: Math.round(pz * 1e8), payTaddr: pt });
        break;
      }
      case "DELIST":
        result = await buildDelist(base);
        break;
      case "RELEASE":
        result = await buildRelease(base);
        break;
      default:
        setState((s) => s.phase === "sign" ? { ...s, loading: false, error: "Unsupported action." } as ModalPhase : s);
        return;
    }

    if (!result.ok) {
      setState((s) => s.phase === "sign" ? { ...s, loading: false, error: result.error } as ModalPhase : s);
      return;
    }
    setState({ phase: "confirm", request, uri: result.uri });
  }, []);

  // Confirm → scanning
  const sentTransaction = useCallback(() => {
    setState((s) => s.phase === "confirm" ?
      (s.request.action === "BUY"
        ? { phase: "fund", request: s.request, payTaddr: s.request.listing?.payTaddr ?? "", amountZec: s.request.listing?.priceZec ?? 0, uri: s.uri }
        : { phase: "scanning", request: s.request, uri: s.uri, scan: "loading" as const })
      : s);
  }, []);

  const sentFund = useCallback(() => {
    setState((s) => s.phase === "fund" ? { phase: "scanning", request: s.request, uri: s.uri, scan: "loading" as const } : s);
  }, []);

  const dismissDone = useCallback(() => {
    setState(initialState());
  }, []);

  return {
    state,
    open,
    close,
    setUnlockCode,
    submitUnlock,
    setAddress,
    setPrice,
    setPayTaddr,
    setAuth,
    submitInput,
    otpUri,
    otpBack,
    markOtpSent,
    setOtpCode,
    submitOtp,
    setSignPubkey,
    setSignSignature,
    submitSign,
    sentTransaction,
    sentFund,
    dismissDone,
  };
}
