"use client";

import { useCallback, useEffect, useRef, useReducer } from "react";
import { usePoll } from "@/components/hooks/usePoll";
import { readLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";
import {
  PURCHASE_FLOW_INIT,
  PHASE_OWNS,
  parsePrice,
  purchaseFlowReducer,
  type PurchaseFlowState,
} from "@/lib/purchases/flowState";
import { dispatchAction } from "@/lib/purchases/dispatchAction";
import {
  RESUME_KEY,
  clearResume,
  notifyResumeChanged,
  type ResumeSnapshot,
} from "@/lib/purchases/resume";
import { watchScanning, deriveScanState, type Expected } from "@/lib/purchases/scanningWatcher";
import { generateSessionId, buildZvsMemo } from "@/lib/purchases/memo";
import { zip321Uri } from "@/lib/purchases/zip321";
import { checkUtxo } from "@/lib/zns/mempool";
import { resolveName } from "@/lib/zns/resolve";
import { isValidTransparentAddress, validateAddress } from "@/lib/zns/utils";
import {
  checkUnlockCode,
  verifyOtp,
  markProtectedNameRedeemedAction,
} from "@/lib/zns/actions";
import { getNetworkConstants, phasesFor } from "@/lib/types";
import type { Action, Network, Phase, ResolveName } from "@/lib/types";

type StoredResume = ResumeSnapshot<PurchaseFlowState>;

export type UsePurchaseFlowOptions = {
  action: Action;
  name: string;
  network: Network;
  resolveResult: ResolveName;
  onSuccess?: (name: string) => void;
  /** When true, skip writing resume (e.g. tests). Default false. */
  disableResume?: boolean;
};

export type UsePurchaseFlowResult = {
  state: PurchaseFlowState;
  phases: Phase[];
  phase: Phase;
  set: (payload: Partial<PurchaseFlowState>) => void;
  advance: (patch?: Partial<PurchaseFlowState>) => void;
  goto: (targetStep: number) => void;
  needsAddress: boolean;
  needsPrice: boolean;
  needsPayTaddr: boolean;
  isOwnerAction: boolean;
  handleUnlock: () => Promise<void>;
  handleInputContinue: () => Promise<void>;
  handleOtpBack: () => void;
  handleVerifyOtp: () => Promise<void>;
  clearAndDone: () => void;
};

export function usePurchaseFlow({
  action,
  name,
  network,
  resolveResult,
  onSuccess,
  disableResume = false,
}: UsePurchaseFlowOptions): UsePurchaseFlowResult {
  const [s, dispatch] = useReducer(
    purchaseFlowReducer,
    PURCHASE_FLOW_INIT,
    (init): PurchaseFlowState => {
      if (disableResume) return init;
      const stored = readLocalStorage<StoredResume | null>(RESUME_KEY, null);
      if (
        !stored ||
        stored.action !== action ||
        stored.name !== name ||
        stored.network !== network
      ) {
        return init;
      }
      return {
        ...stored.state,
        unlockLoading: false,
        otpLoading: false,
        otpVerified: false,
        unlockError: "",
        inputError: "",
        otpError: "",
      };
    },
  );

  const phases: Phase[] = phasesFor(action, resolveResult);
  const phase = phases[s.step] ?? phases[phases.length - 1];

  const otpVerifyInFlightRef = useRef(false);
  const otpAdvanceTimerRef = useRef<number | null>(null);
  const stateRef = useRef(s);
  stateRef.current = s;
  const sawMempoolRef = useRef(false);

  const set = useCallback((payload: Partial<PurchaseFlowState>) => {
    dispatch({ type: "SET", payload });
  }, []);

  const advance = useCallback((patch?: Partial<PurchaseFlowState>) => {
    dispatch({ type: "ADVANCE", patch });
  }, []);

  // Persist on every state change.
  useEffect(() => {
    if (disableResume) return;
    writeLocalStorage<StoredResume>(RESUME_KEY, {
      action,
      name,
      network,
      phase,
      phases,
      scanState: s.scanState,
      state: s,
    });
    notifyResumeChanged();
    // phases is derived from action+resolveResult; omit identity from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, action, name, network, phase, disableResume]);

  useEffect(() => {
    return () => {
      if (otpAdvanceTimerRef.current != null) {
        window.clearTimeout(otpAdvanceTimerRef.current);
        otpAdvanceTimerRef.current = null;
      }
    };
  }, []);

  function goto(targetStep: number) {
    if (targetStep >= s.step) return;
    const patch: Partial<PurchaseFlowState> = {};
    for (const crossed of phases.slice(targetStep + 1, s.step + 1)) {
      for (const field of PHASE_OWNS[crossed]) {
        (patch as Record<string, unknown>)[field] = PURCHASE_FLOW_INIT[field];
      }
    }
    set({ ...patch, step: targetStep });
  }

  function buildOtpPatch() {
    const regAddr =
      "registration" in resolveResult ? resolveResult.registration.address : "";
    const sid = generateSessionId();
    const memo = buildZvsMemo(sid, regAddr);
    const { OTP_SIGNIN_ADDR, OTP_AMOUNT } = getNetworkConstants(network);
    return {
      otpMemo: memo,
      otpUri: zip321Uri(OTP_SIGNIN_ADDR, OTP_AMOUNT, memo).uri,
      otpCode: "",
      otpError: "",
      otpSent: false,
      otpAttempts: 0,
      otpVerified: false,
    };
  }

  // When OTP is the first phase (RELEASE/DELIST — no input step), seed the
  // verification session on entry instead of building it during input→otp.
  useEffect(() => {
    if (phase !== "otp" || s.otpMemo) return;
    set(buildOtpPatch());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, s.otpMemo]);

  async function handleUnlock() {
    if (s.unlockLoading) return;
    const code = s.unlockCode.trim();
    if (!code) {
      set({ unlockError: "Enter your unlock code." });
      return;
    }
    set({ unlockError: "", unlockLoading: true });
    try {
      const result = await checkUnlockCode(name, code);
      if (!result.ok) {
        set({ unlockError: result.error || "Invalid unlock code.", unlockLoading: false });
        return;
      }
      advance({ unlockProof: result.proof, unlockLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Try again.";
      set({ unlockError: message || "Something went wrong. Try again.", unlockLoading: false });
    }
  }

  const needsAddress = action === "CLAIM" || action === "BUY" || action === "UPDATE";
  const needsPrice = action === "LIST";
  const needsPayTaddr = action === "LIST";
  const isOwnerAction =
    action === "UPDATE" || action === "LIST" || action === "DELIST" || action === "RELEASE";

  async function handleInputContinue() {
    set({ inputError: "" });
    if (needsAddress) {
      const addr = s.addressInput.trim();
      if (!addr) {
        set({ inputError: "Address is required." });
        return;
      }
      const v = validateAddress(addr);
      if (v.status === "viewkey" || v.status === "tex" || v.status === "invalid") {
        set({ inputError: v.warning || "Invalid address format." });
        return;
      }
    }
    if (needsPrice) {
      const zec = parsePrice(s.priceInput);
      if (zec === null) {
        set({ inputError: "Enter a valid price." });
        return;
      }
      if (zec < 0 || zec > 21_000_000) {
        set({ inputError: "Price must be between 0 and 21,000,000 ZEC." });
        return;
      }
    }
    if (needsPayTaddr) {
      const payTaddr = s.payTaddrInput.trim();
      if (!payTaddr) {
        set({ inputError: "Payout address is required." });
        return;
      }
      // Full Base58Check + network-matched t-addr (t1/t3 mainnet, tm/tn testnet).
      if (!isValidTransparentAddress(payTaddr, network)) {
        set({
          inputError:
            network === "testnet"
              ? "Enter a valid testnet transparent address (tm or tn)."
              : "Enter a valid transparent Zcash address (t1 or t3).",
        });
        return;
      }
    }

    if (action === "BUY" && resolveResult.status === "listed" && resolveResult.pendingBuy) {
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
        set({
          inputError:
            "Another buyer has locked this name. Try again after their purchase window expires.",
        });
        return;
      }
    }

    const nextPhase = phases[s.step + 1];
    const otpPatch = nextPhase === "otp" && !s.otpMemo ? buildOtpPatch() : {};

    if ((action === "CLAIM" || action === "BUY") && nextPhase === "confirm") {
      const addr = s.addressInput.trim();
      const ar = await dispatchAction(
        action,
        name,
        network,
        { address: addr, priceZats: 0, payTaddr: "" },
        {
          protectedUnlock: action === "CLAIM" ? s.unlockProof || undefined : undefined,
          owner: { kind: "none" },
        },
      );
      if (!ar.ok) {
        set({ inputError: ar.error });
        return;
      }
      advance({
        address: addr,
        uri: ar.uri,
        memo: ar.memo,
        paymentAddress: ar.paymentAddress ?? "",
        amountZec: ar.amountZec ?? "",
        ...otpPatch,
      });
    } else {
      advance({
        ...(needsAddress ? { address: s.addressInput.trim() } : {}),
        ...(needsPrice ? { price: s.priceInput.trim() } : {}),
        ...otpPatch,
      });
    }
  }

  function handleOtpBack() {
    const ok = window.confirm("Are you sure? You'll have to request another passcode.");
    if (!ok) return;
    goto(s.step - 1);
  }

  async function handleVerifyOtp() {
    // Guard concurrent clicks / double-invoke so we never step past confirm
    // (Send Payment) into scanning after a successful passcode.
    if (otpVerifyInFlightRef.current || s.otpLoading || s.otpVerified) return;
    if (!s.otpSent) {
      set({ otpError: "Send the verification transaction first." });
      return;
    }
    const code = s.otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      set({ otpError: "Enter the 6-digit code from your wallet." });
      return;
    }
    const { OTP_MAX_ATTEMPTS } = getNetworkConstants(network);
    if (s.otpAttempts >= OTP_MAX_ATTEMPTS) {
      set({ otpError: "Max attempts reached." });
      return;
    }
    otpVerifyInFlightRef.current = true;
    set({ otpError: "", otpLoading: true });
    try {
      const regAddr =
        "registration" in resolveResult ? resolveResult.registration.address : "";
      const result = await verifyOtp(s.otpMemo, code, regAddr);
      if (!result.ok) {
        otpVerifyInFlightRef.current = false;
        set({
          otpAttempts: s.otpAttempts + 1,
          otpError: result.error,
          otpCode: "",
          otpLoading: false,
          otpVerified: false,
        });
        return;
      }

      const ar = await dispatchAction(
        action,
        name,
        network,
        {
          address: s.address,
          priceZats: Math.round((parsePrice(s.price) ?? 0) * 1e8),
          payTaddr: s.payTaddrInput,
        },
        { owner: { kind: "otp", token: result.proof } },
      );

      if (!ar.ok) {
        otpVerifyInFlightRef.current = false;
        set({ otpError: ar.error, otpLoading: false, otpVerified: false });
        return;
      }

      const paymentPatch = {
        uri: ar.uri,
        memo: ar.memo,
        paymentAddress: ar.paymentAddress ?? "",
        amountZec: ar.amountZec ?? "",
      };
      // Always land on Send Payment (confirm) — never relative-advance, which
      // can skip into Scanning if verify runs more than once.
      const confirmIdx = phases.indexOf("confirm");
      set({
        ...paymentPatch,
        otpLoading: false,
        otpVerified: true,
      });
      if (otpAdvanceTimerRef.current != null) {
        window.clearTimeout(otpAdvanceTimerRef.current);
      }
      otpAdvanceTimerRef.current = window.setTimeout(() => {
        otpAdvanceTimerRef.current = null;
        otpVerifyInFlightRef.current = false;
        // Keep otpVerified true so green passcode borders persist on completed OTP steps.
        // Back-nav past OTP still clears it via PHASE_OWNS.
        if (confirmIdx >= 0) {
          set({
            ...paymentPatch,
            otpVerified: true,
            step: confirmIdx,
          });
        } else {
          advance({
            ...paymentPatch,
            otpVerified: true,
          });
        }
      }, 650);
    } catch {
      otpVerifyInFlightRef.current = false;
      set({ otpError: "Something went wrong. Try again.", otpLoading: false, otpVerified: false });
    }
  }

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
      const { scanState: next, sawMempool } = deriveScanState(tick, expected, {
        sawMempool: sawMempoolRef.current,
      });
      sawMempoolRef.current = sawMempool;
      if (next === cur.scanState) return;
      if (next === "mined" && action === "BUY") {
        advance({ scanState: "mined" });
        return;
      }
      if (next === "mined" && !cur.successFired) {
        set({ scanState: "mined", successFired: true });
        if (action === "CLAIM") {
          void markProtectedNameRedeemedAction(name);
        }
        onSuccess?.(name);
        return;
      }
      set({ scanState: next });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, name, network, action]);

  const fundActive =
    phase === "fund" && action === "BUY" && resolveResult.status === "listed";
  usePoll(
    fundActive,
    async () => {
      if (resolveResult.status !== "listed") return;
      const { payTaddr, listingPrice } = resolveResult;
      const result = await checkUtxo(payTaddr, network);
      if (
        result.found &&
        result.response &&
        result.response.total_received_zats >= listingPrice.zats
      ) {
        advance();
      }
    },
    3000,
  );

  const settleActive = phase === "settling" && s.settleState !== "mined";
  usePoll(
    settleActive,
    async () => {
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
    },
    2000,
  );

  function clearAndDone() {
    clearResume();
  }

  return {
    state: s,
    phases,
    phase,
    set,
    advance,
    goto,
    needsAddress,
    needsPrice,
    needsPayTaddr,
    isOwnerAction,
    handleUnlock,
    handleInputContinue,
    handleOtpBack,
    handleVerifyOtp,
    clearAndDone,
  };
}
