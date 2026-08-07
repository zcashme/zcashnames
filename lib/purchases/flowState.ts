// Shared purchase-flow state for Zip321Modal and NameActionForm.
// Phase ownership table + reducer live here so both UIs share one source of truth.

import type { Phase, ScanState } from "@/lib/types";

export type PurchaseFlowState = {
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
  // scanning phase (watches memo'd tx on the mempool watcher)
  scanState: ScanState;
  successFired: boolean;
  // settling phase (BUY only): watches the indexer until the seller payment
  // has been observed and ownership has flipped to the buyer.
  settleState: ScanState;
};

export type PurchaseFlowMsg =
  | { type: "SET"; payload: Partial<PurchaseFlowState> }
  | { type: "ADVANCE"; patch?: Partial<PurchaseFlowState> };

export const PURCHASE_FLOW_INIT: PurchaseFlowState = {
  step: 0,
  address: "",
  price: "",
  payTaddrInput: "",
  uri: "",
  memo: "",
  paymentAddress: "",
  amountZec: "",
  unlockCode: "",
  unlockError: "",
  unlockLoading: false,
  unlockProof: "",
  addressInput: "",
  priceInput: "",
  inputError: "",
  otpMemo: "",
  otpUri: "",
  otpCode: "",
  otpError: "",
  otpLoading: false,
  otpSent: false,
  otpAttempts: 0,
  otpVerified: false,
  scanState: "not_detected",
  successFired: false,
  settleState: "not_detected",
};

export function purchaseFlowReducer(
  state: PurchaseFlowState,
  msg: PurchaseFlowMsg,
): PurchaseFlowState {
  switch (msg.type) {
    case "SET":
      return { ...state, ...msg.payload };
    case "ADVANCE":
      return { ...state, ...(msg.patch ?? {}), step: state.step + 1 };
  }
}

// Each phase declares the fields it OWNS — when the user backs past a phase,
// those fields get cleared. Keeping this as a table (not procedural code)
// means adding a new phase = adding one row, not editing goto().
//
//   unlock:   proof itself survives (one-shot, can't be re-generated)
//   input:    user inputs survive (they typed them; don't make them retype)
//   otp:      memo/uri/sent/attempts survive (paid for the OTP session)
//   confirm:  server-dispatched URI fields are owned here — back-nav clears
//   fund:     nothing local (UTXO state is on-chain)
//   scanning: scanState is reset on entry anyway, but owning it makes the
//             back-nav semantics explicit.
export const PHASE_OWNS: Record<Phase, ReadonlyArray<keyof PurchaseFlowState>> = {
  unlock: ["unlockCode", "unlockError"],
  input: [],
  // Back-nav past otp burns the session (memo/uri/sent/attempts) so the next
  // forward pass requests a fresh passcode.
  otp: ["otpCode", "otpError", "otpMemo", "otpUri", "otpSent", "otpAttempts", "otpVerified"],
  confirm: ["uri", "memo", "paymentAddress", "amountZec"],
  scanning: ["scanState"],
  fund: [],
  settling: ["settleState", "successFired"],
};

export function parsePrice(raw: string): number | null {
  const n = raw.replace(/,/g, "").trim();
  if (!n) return null;
  const num = Number(n);
  return Number.isFinite(num) && num >= 0 ? num : null;
}
