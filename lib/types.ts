import type { Network } from "@/lib/zns/client";

/**
 * Per-network constants used by Zip321Modal.
 * Payment URIs are now built by the SDK (CompletedAction.uri) using the
 * indexer's registry address — no hardcoded ZIP321_RECIPIENT_ADDRESS needed.
 */
interface NetworkConstants {
  OTP_SIGNIN_ADDR: string;
  OTP_AMOUNT: string;
  OTP_MAX_ATTEMPTS: number;
}

/** Testnet and mainnet each have their own set of addresses. Testnet addresses start with "utest1". */
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

/** Returns the addresses and limits for the given network. Defaults to testnet. */
export function getNetworkConstants(network: Network = "testnet"): NetworkConstants {
  return NETWORK_CONSTANTS[network];
}

/** Maximum ZEC a name can be listed for sale at. 21 million = the Zcash total supply cap.
 *  Used for both client-side validation (Zip321Modal) and server-side validation (actions.ts). */
export const MAX_LIST_FOR_SALE_AMOUNT = 21_000_000;

/** The five operations a user can perform on a Zcash name. */
export type Action = "claim" | "buy" | "update" | "list" | "delist" | "release";

export interface ModalTarget {
  name: string;
  action: Action;
  registrationAddress?: string;
  registrationNonce?: number;
  registrationPubkey?: string | null;
  listingPriceZec?: number;
  network: Network;
  networkPassword: string;
  isReserved?: boolean;
}

export type PendingTransactionPhase = "payment" | "scanning";
export type PendingTransactionScanState = "loading" | "not_detected" | "in_mempool" | "being_mined" | "mined";

export interface PendingTransactionState {
  target: Omit<ModalTarget, "networkPassword">;
  phase: PendingTransactionPhase;
  addressInput: string;
  priceInput: string;
  paymentUri: string;
  scanState: PendingTransactionScanState;
  updatedAt: number;
}

/**
 * Result of resolving a name query. Discriminated union representing the three possible states.
 */
export type ResolveName =
  | {
      status: 'available'
      query: string
      claimCost: { zats: number; zec: number }
      firstBucket?: number
    }
  | {
      status: 'reserved'
      query: string
      claimCost: { zats: number; zec: number }
      firstBucket?: number
    }
  | {
      status: 'blocked'
      query: string
    }
  | {
      status: 'registered'
      query: string
      registration: { name: string; address: string; txid: string; height: number; nonce: number; pubkey?: string | null }
      firstBucket?: number
    }
  | {
      status: 'listed'
      query: string
      registration: { name: string; address: string; txid: string; height: number; nonce: number; pubkey?: string | null }
      listingPrice: { zats: number; zec: number }
      firstBucket?: number
    }
