import type { Network } from "@/lib/zns/name";

/**
 * Per-network addresses and limits used by Zip321Modal to build payment URIs.
 *
 * Two addresses per network:
 * - ZIP321_RECIPIENT_ADDRESS: where users send ZEC to pay for name operations (claim, buy, list, etc.)
 * - OTP_SIGNIN_ADDR: where users send a tiny payment to prove they own a name before update/list/delist
 */
interface NetworkConstants {
  /** Destination address for all name operation payments (claim, buy, update, list, delist). */
  ZIP321_RECIPIENT_ADDRESS: string;
  /** Destination address for OTP ownership verification payments. Separate from the main address
   *  so the indexer can distinguish verification txs from operation txs. */
  OTP_SIGNIN_ADDR: string;
  /** ZEC amount for the OTP verification payment. Stored as a string because buildZcashUri()
   *  expects a string, not a number. Currently "0.002" on both networks. */
  OTP_AMOUNT: string;
  /** Max OTP code entry attempts before the user must start over. Prevents brute-forcing the 6-digit code. */
  OTP_MAX_ATTEMPTS: number;
}

/** Testnet and mainnet each have their own set of addresses. Testnet addresses start with "utest1". */
const NETWORK_CONSTANTS: Record<Network, NetworkConstants> = {
  testnet: {
    ZIP321_RECIPIENT_ADDRESS:
      "utest1f32kn6c4zvn54xr8wfsnxmj9hzpu2mwgtxzpzwcw34906tdccdvzs0z2dx38lly7tpan77x6udt8pjczqm22ymsdhlz9j0tk5yq664nl",
    OTP_SIGNIN_ADDR:
      "utest100qlkeru5c3m5kfrwe2hsmcfzmusreaza2prdyelg2kd2tr2842nceq952vay3gpmgky09fgft4z57h4z2zqzz5rcwgd4q90u54ek5yyca4s6e6y2jja9sww27kzedzznjcupcu0svq2exvq995c0lhl5zm53g4ksnm2xuwt3snv4dgh",
    OTP_AMOUNT: "0.002",
    OTP_MAX_ATTEMPTS: 5,
  },
  mainnet: {
    ZIP321_RECIPIENT_ADDRESS:
      "u1u7d3s6a66f76xzk00hnrtz6v5e4hn97mv0k9uy47c8c9j3y5v3k558nhtsqtl4ny8xz4n4gjm6gcsy8ru9m8tltcf6az2gvhaywshlfl290eqsz4ky8weydf04k57kfd42p3tam3m9g25x8lle6zpyqc5tvvwhsumxr8q9prqcfn6ulpejlsg28dl7vuxeqqffu4uehzrqpucwdrj85",
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
