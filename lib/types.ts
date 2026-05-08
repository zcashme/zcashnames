/* ── Shared domain types ─────────────────────────────────────────────── */

export type Network = "testnet" | "mainnet";
export type Zats = number;

export const ACTIONS = ["CLAIM", "BUY", "UPDATE", "LIST", "DELIST", "RELEASE"] as const;
export type Action = (typeof ACTIONS)[number];

export interface PendingBuy {
  buyer: string;
  price: Zats;
  claimHeight: number;
  expiresAt: number;
  txid: string;
}

export interface Listing {
  name: string;
  price: Zats;
  payTaddr: string;
  nonce: number;
  txid: string;
  height: number;
  signature: string;
  pubkey: string | null;
  pendingBuy: PendingBuy | undefined;
}

export interface Registration {
  name: string;
  address: string;
  txid: string;
  height: number;
  nonce: number;
  signature: string | null;
  lastAction: string;
  pubkey: string | null;
  listing: Listing | null;
}

export interface ZnsEvent {
  id: number;
  name: string;
  action: string;
  txid: string;
  height: number;
  ua: string | null;
  price: number | null;
  nonce: number | null;
  signature: string | null;
  pubkey: string | null;
}

/* ── Network constants ───────────────────────────────────────────────── */

interface NetworkConstants {
  OTP_SIGNIN_ADDR: string;
  OTP_AMOUNT: string;
  OTP_MAX_ATTEMPTS: number;
}

const NETWORK_CONSTANTS: Record<Network, NetworkConstants> = {
  testnet: {
    OTP_SIGNIN_ADDR:
      "utest100qlkeru5c3m5kfrwe2hsmcfzmusreaza2prdyelg2kd2tr2842nceq952vay3gpmgky09fgft4z57h4z2zqzz5rcwgd4q90u54ek5yyca4s6e6y2jja9sww27kzedzznjcupcu0svq2exvq995c0lhl5zm53g4ksnm2xuwt3snv4dgh",
    OTP_AMOUNT: "0.002",
    OTP_MAX_ATTEMPTS: 5,
  },
  mainnet: {
    OTP_SIGNIN_ADDR:
      "u1gphl7vrklduuv96kpw4eetx4vrs8nnk7w9tuzvppyuuctw0tuskkpmfulrjapr05zh78p3chpxhx3tm28qau3uwd36k94vgucpxphyv5hkg36nhvr4axeljpz04acdhc7vskg9nsxfhylcl5lnspxtkrhjzn5xaedr2ae567ks3gz24u",
    OTP_AMOUNT: "0.002",
    OTP_MAX_ATTEMPTS: 5,
  },
};

export function getNetworkConstants(network: Network = "testnet"): NetworkConstants {
  return NETWORK_CONSTANTS[network];
}

export const MAX_LIST_FOR_SALE_AMOUNT = 21_000_000;

/* ── Modal machine ───────────────────────────────────────────────────── */

export interface ModalRequest {
  name: string;
  action: Action;
  network: Network;
  registration?: { address: string; nonce: number; pubkey: string | null };
  listing?: { priceZec: number; payTaddr: string };
  isReserved?: boolean;
}

export type ScanState = "loading" | "not_detected" | "in_mempool" | "being_mined" | "mined";

export type ModalPhase =
  | { phase: "idle" }
  | { phase: "unlock"; request: ModalRequest; code: string; loading: boolean; error: string }
  | { phase: "input"; request: ModalRequest; address: string; price: string; payTaddr: string; auth: "default" | "otp" | "sovereign"; unlockProof?: string; loading: boolean; error: string }
  | { phase: "otp"; request: ModalRequest; sessionId: string; registeredAddress: string; code: string; sent: boolean; proof?: string; attempts: number; address: string; price: string; payTaddr: string; loading: boolean; error: string }
  | { phase: "sign"; request: ModalRequest; payload: string; unlockProof?: string; pubkey: string; sig: string; address: string; price: string; payTaddr: string; loading: boolean; error: string; pubkeyError: string; sigError: string }
  | { phase: "confirm"; request: ModalRequest; uri: string }
  | { phase: "fund"; request: ModalRequest; payTaddr: string; amountZec: number; uri: string }
  | { phase: "scanning"; request: ModalRequest; uri: string; scan: ScanState; txid?: string; warnings?: string[] }
  | { phase: "done"; request: ModalRequest };

export type ModalPhaseKind = ModalPhase["phase"];

/* ── Resolve result ──────────────────────────────────────────────────── */

export type ResolveName =
  | { status: "available"; query: string; claimCost: { zats: number; zec: number }; firstBucket?: number }
  | { status: "reserved"; query: string; claimCost: { zats: number; zec: number }; firstBucket?: number }
  | { status: "blocked"; query: string }
  | { status: "registered"; query: string; registration: { name: string; address: string; txid: string; height: number; nonce: number; pubkey?: string | null }; firstBucket?: number }
  | { status: "listed"; query: string; registration: { name: string; address: string; txid: string; height: number; nonce: number; pubkey?: string | null }; listingPrice: { zats: number; zec: number }; payTaddr: string; pendingBuy?: PendingBuy; firstBucket?: number };
