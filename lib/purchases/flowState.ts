// Shared purchase-flow state for NameActionForm and Zip321Modal.
// Phase ownership table + reducer live here so both UIs share one source of truth.
//
// The flow mirrors the whitepaper authorization procedure:
//   CLAIM   input → confirm (name price) → scanning
//   UPDATE  input → confirm ($1 request fee) → otp → respond → scanning
//   RELEASE confirm ($1 request fee) → otp → respond → scanning
//
// Two payment screens: `confirm` renders the Request memo ZIP-321 (name price
// for claims, the $1 request fee for update/release); `respond` renders the
// Respond memo ZIP-321 carrying the OTP and the update's name payment.

import type { Phase, ScanState } from "@/lib/types";

export type PurchaseFlowState = {
  step: number;
  // input phase
  address: string;
  addressInput: string;
  termInput: string; // "forever" | "none" | "<N>y"
  inputError: string;
  // confirm phase — the Request payment (claim price / $1 request fee)
  uri: string;
  memo: string;
  paymentAddress: string;
  amountZec: string;
  // otp phase — the six-digit code from the Mint's Relay memo
  otpCode: string;
  otpError: string;
  otpLoading: boolean;
  otpVerified: boolean;
  // respond phase — the Respond payment (OTP + update name payment)
  respondUri: string;
  respondMemo: string;
  respondAmountZec: string;
  // scanning phase — watches the resolver until the Name Note lands
  scanState: ScanState;
  successFired: boolean;
  // baseline captured when the flow opened, for scan expectation
  baselineTxid: string;
};

export type PurchaseFlowMsg =
  | { type: "SET"; payload: Partial<PurchaseFlowState> }
  | { type: "ADVANCE"; patch?: Partial<PurchaseFlowState> };

export const PURCHASE_FLOW_INIT: PurchaseFlowState = {
  step: 0,
  address: "",
  addressInput: "",
  termInput: "",
  inputError: "",
  uri: "",
  memo: "",
  paymentAddress: "",
  amountZec: "",
  otpCode: "",
  otpError: "",
  otpLoading: false,
  otpVerified: false,
  respondUri: "",
  respondMemo: "",
  respondAmountZec: "",
  scanState: "not_detected",
  successFired: false,
  baselineTxid: "",
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
//   input:    user inputs survive (they typed them; don't make them retype)
//   confirm:  server-dispatched Request fields are owned here — back-nav clears
//   otp:      entered code clears on back-nav; the Request payment already
//             happened on-chain, so backing into confirm keeps it
//   respond:  server-built Respond fields are owned here
//   scanning: scanState is reset on entry anyway, but owning it makes the
//             back-nav semantics explicit.
export const PHASE_OWNS: Record<Phase, ReadonlyArray<keyof PurchaseFlowState>> = {
  input: [],
  confirm: ["uri", "memo", "paymentAddress", "amountZec"],
  otp: ["otpCode", "otpError", "otpVerified"],
  respond: ["respondUri", "respondMemo", "respondAmountZec"],
  scanning: ["scanState"],
  unlock: [],
};
