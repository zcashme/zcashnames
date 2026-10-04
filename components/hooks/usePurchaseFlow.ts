"use client";

import { useCallback, useEffect, useRef, useReducer } from "react";
import { readLocalStorage, writeLocalStorage } from "@/components/hooks/useLocalStorage";
import {
  PURCHASE_FLOW_INIT,
  PHASE_OWNS,
  purchaseFlowReducer,
  type PurchaseFlowState,
} from "@/lib/purchases/flowState";
import { dispatchRequest, dispatchRespond } from "@/lib/purchases/dispatchAction";
import {
  RESUME_KEY,
  clearResume,
  notifyResumeChanged,
  type ResumeSnapshot,
} from "@/lib/purchases/resume";
import { watchScanning, deriveScanState } from "@/lib/purchases/scanningWatcher";
import { validateAddress } from "@/lib/zns/utils";
import { ACTION_VERB, phasesFor } from "@/lib/types";
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
  isOwnerAction: boolean;
  handleInputContinue: () => Promise<void>;
  handleConfirmSent: () => void;
  handleOtpBack: () => void;
  handleVerifyOtp: () => Promise<void>;
  handleRespondSent: () => void;
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
        ...init,
        ...stored.state,
        otpLoading: false,
        otpVerified: false,
        inputError: "",
        otpError: "",
      };
    },
  );

  const phases: Phase[] = phasesFor(action);
  const phase = phases[s.step] ?? phases[phases.length - 1];

  const otpInFlightRef = useRef(false);
  const stateRef = useRef(s);
  stateRef.current = s;

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
    // phases is derived from action; omit identity from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, action, name, network, phase, disableResume]);

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

  const needsAddress = action === "CLAIM" || action === "UPDATE";
  const isOwnerAction = action === "UPDATE" || action === "RELEASE";

  // The bound address, available for owner actions and scan baselines.
  const boundAddress =
    "registration" in resolveResult ? resolveResult.registration.address : "";
  const baselineTxid =
    "registration" in resolveResult ? resolveResult.registration.txid : "";

  // RELEASE has no input phase — seed the $1 request fee payment on entry.
  // The request acts on the currently bound address.
  useEffect(() => {
    if (action !== "RELEASE" || phase !== "confirm" || s.uri) return;
    let cancelled = false;
    void (async () => {
      const ar = await dispatchRequest("RELEASE", name, network, {
        address: boundAddress,
        term: "",
      });
      if (cancelled) return;
      if (!ar.ok) {
        set({ inputError: ar.error });
        return;
      }
      set({
        address: boundAddress,
        uri: ar.uri,
        memo: ar.memo,
        paymentAddress: ar.paymentAddress,
        amountZec: ar.amountZec,
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, phase, s.uri]);

  async function handleInputContinue() {
    set({ inputError: "" });
    let address = s.addressInput.trim();
    let term = s.termInput.trim();

    if (needsAddress) {
      if (!address) {
        set({ inputError: "Unified address is required." });
        return;
      }
      const v = validateAddress(address);
      if (v.status === "viewkey" || v.status === "tex" || v.status === "invalid") {
        set({ inputError: v.warning || "Invalid address format." });
        return;
      }
    }

    // Defaults per action: claims register a year at a time unless extended;
    // updates carry the current expiration forward unless changed.
    if (action === "CLAIM" && !term) term = "1y";
    if (action === "UPDATE" && !term) term = "none";

    if (isOwnerAction) {
      // UPDATE acts on the currently bound address for the Relay destination,
      // but the memo targets the NEW address; keep both straight.
      if (action === "UPDATE" && !address) {
        set({ inputError: "Unified address is required." });
        return;
      }
    }

    const ar = await dispatchRequest(action, name, network, { address, term });
    if (!ar.ok) {
      set({ inputError: ar.error });
      return;
    }
    advance({
      address,
      termInput: term,
      uri: ar.uri,
      memo: ar.memo,
      paymentAddress: ar.paymentAddress,
      amountZec: ar.amountZec,
    });
  }

  // User has sent the Request payment (claim price / $1 request fee).
  function handleConfirmSent() {
    advance({ baselineTxid });
  }

  function handleOtpBack() {
    const ok = window.confirm(
      "Are you sure? Your request fee payment stands, but you'll need to re-enter the passcode.",
    );
    if (!ok) return;
    goto(s.step - 1);
  }

  // The user received the Mint's Relay memo in their wallet and typed the
  // six-digit code. Verification happens inside the Mint — here we build the
  // Respond payment (OTP memo + name payment for updates).
  async function handleVerifyOtp() {
    if (otpInFlightRef.current || s.otpLoading || s.otpVerified) return;
    const code = s.otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      set({ otpError: "Enter the 6-digit code from your wallet." });
      return;
    }
    otpInFlightRef.current = true;
    set({ otpError: "", otpLoading: true });
    try {
      const verb = ACTION_VERB[action];
      // Respond UA: the memo's target address (new address for updates, the
      // released binding's address for releases).
      const ua = (action === "UPDATE" ? s.address : boundAddress).trim();
      const ar = await dispatchRespond(verb, name, network, code, ua, s.termInput);
      if (!ar.ok) {
        otpInFlightRef.current = false;
        set({ otpError: ar.error, otpLoading: false, otpVerified: false });
        return;
      }
      otpInFlightRef.current = false;
      advance({
        respondUri: ar.uri,
        respondMemo: ar.memo,
        respondAmountZec: ar.amountZec,
        otpLoading: false,
        otpVerified: true,
      });
    } catch {
      otpInFlightRef.current = false;
      set({ otpError: "Something went wrong. Try again.", otpLoading: false, otpVerified: false });
    }
  }

  function handleRespondSent() {
    advance({ baselineTxid });
  }

  // Scanning: poll the resolver until the expected Name Note effect lands.
  useEffect(() => {
    if (phase !== "scanning") return;
    return watchScanning(name, network, (tick) => {
      const cur = stateRef.current;
      const next = deriveScanState(tick, {
        action,
        targetAddress: cur.address.trim() || undefined,
        baselineTxid: cur.baselineTxid || baselineTxid,
      });
      if (next === cur.scanState) return;
      if (next === "mined" && !cur.successFired) {
        set({ scanState: "mined", successFired: true });
        onSuccess?.(name);
        return;
      }
      set({ scanState: next });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, name, network, action]);

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
    isOwnerAction,
    handleInputContinue,
    handleConfirmSent,
    handleOtpBack,
    handleVerifyOtp,
    handleRespondSent,
    clearAndDone,
  };
}
