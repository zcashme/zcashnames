//
// Shared domain types used across the entire app — components, server actions,
// and the SDK wrapper all depend on these. Every name operation flows through
// the six Action variants defined here.
//
// Data flow for a name purchase, end to end:
//   1. User searches a name → resolveName() returns a ResolveName union
//   2. Based on status, the UI shows action buttons (Claim, Buy, List, etc.)
//   3. Clicking one opens Zip321Modal, which calls the matching server action
//   4. The server action verifies ownership (OTP or unlock code), builds a
//      signed payload, and returns a ZIP-321 payment URI
//   5. The user pays with their wallet; the client polls the mempool watcher
//      until the tx is mined, then refreshes the search result
//

/* ── Primitives ───────────────────────────────────────────────────────── */

export type Network = "testnet" | "mainnet";
export type Zats = number; // 1 ZEC = 100_000_000 zats

/* ── Actions & Phases ─────────────────────────────────────────────────── */

export const ACTIONS = [
  "CLAIM",
  "BUY",
  "UPDATE",
  "LIST",
  "DELIST",
  "RELEASE",
] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_LABELS = {
  CLAIM: "Claim",
  BUY: "Buy",
  UPDATE: "Update",
  LIST: "List",
  DELIST: "Delist",
  RELEASE: "Release",
} as const satisfies Record<Action, string>;

export const ACTION_COLORS = {
  CLAIM: { bg: "var(--color-accent-green-light)", text: "var(--color-accent-green)" },
  BUY:   { bg: "rgba(59,130,246,0.15)", text: "var(--color-brand-blue, #3b82f6)" },
  UPDATE:{ bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  LIST:  { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  DELIST:{ bg: "rgba(156,163,175,0.15)", text: "var(--fg-muted)" },
  RELEASE:{ bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
} as const satisfies Record<Action, { bg: string; text: string }>;

// Linear phases a purchase modal walks through. Zip321Modal renders one screen
// per phase, advancing as the user completes each step.
export type Phase =
  | "unlock"
  | "input"
  | "otp"
  | "sign"
  | "confirm"
  | "fund"
  | "scanning";

// Which phases each action walks through. CLAIM is the simplest (no OTP needed
// since nobody owns the name yet). BUY adds a "fund" step for explicit payment.
// Every mutating action ends in "scanning" where the client polls the mempool.
export const ACTION_PHASES: Record<Action, Phase[]> = {
  CLAIM:  ["input", "confirm", "scanning"],
  BUY:    ["input", "confirm", "fund", "scanning"],
  UPDATE: ["input", "otp", "confirm", "scanning"],
  LIST:   ["input", "otp", "confirm", "scanning"],
  DELIST: ["otp", "confirm", "scanning"],
  RELEASE:["otp", "confirm", "scanning"],
};

/* ── Name Availability ────────────────────────────────────────────────── */

// The five possible states a searched name can be in. The UI (HomeResultCard,
// ExplorerNameDetail, NameStatus) renders differently for each one.
export type NameAvailabilityState =
  | "available"
  | "forsale"
  | "unavailable"
  | "reserved"
  | "blocked";

/* ── Auth ─────────────────────────────────────────────────────────────── */

// Two paths to prove you own your .zcash address:
//   "otp"       — send a tiny amount of ZEC to a known address; the OTP code
//                 is derived from the memo field (see lib/purchases/otp.ts)
//   "sovereign" — sign a challenge with your wallet's key (not yet implemented)
export type AuthMethod = "otp" | "sovereign";

/* ── Domain Objects ────────────────────────────────────────────────────── */

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

/* ── ResolveName ──────────────────────────────────────────────────────── */

// Discriminated union returned by resolveName(). UI switches on `status`
// to decide which buttons, badges, and pricing to show.
//
// Data flow for a name purchase, end to end:
//   1. User searches a name → resolveName() returns a ResolveName union
//   2. Based on status, the UI shows action buttons (Claim, Buy, List, etc.)
//   3. Clicking one opens Zip321Modal, which calls the matching server action
//   4. The server action verifies ownership (OTP or unlock code), builds a
//      signed payload, and returns a ZIP-321 payment URI
//   5. The user pays with their wallet; the client polls the mempool watcher
//      until the tx is mined, then refreshes the search result

export type ResolveName =
  | { status: "available"; query: string; claimCost: { zats: number; zec: number } }
  | { status: "reserved";  query: string; claimCost: { zats: number; zec: number } }
  | { status: "blocked";   query: string }
  | {
      status: "registered";
      query: string;
      registration: {
        name: string; address: string; txid: string; height: number; nonce: number;
        pubkey?: string | null;
      };
    }
  | {
      status: "listed";
      query: string;
      registration: {
        name: string; address: string; txid: string; height: number; nonce: number;
        pubkey?: string | null;
      };
      listingPrice: { zats: number; zec: number };
      payTaddr: string;
      pendingBuy?: PendingBuy;
    };

/* ── Transaction State ───────────────────────────────────────────────── */

// Mempool tx tracking states. Maps to the mempool watcher's status machine
// (see lib/zns/mempool.ts). The client polls every 2s after the user sends a tx.
export type ScanState =
  | "not_detected"
  | "in_mempool"
  | "confirming"
  | "mined"
  | "rejected";

// Persisted to localStorage so the user can close the tab and come back.
// usePendingTransaction polls the mempool watcher until scanState settles.
export interface PendingTransactionState {
  target: { action: Action; name: string; network: Network };
  phase: Phase;
  scanState: ScanState;
  txid?: string;
  warnings?: string[];
  updatedAt: number;
  addressInput?: string;
  priceInput?: string;
}

/* ── Network Constants ────────────────────────────────────────────────── */

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

export const MAX_LIST_FOR_SALE_AMOUNT = 21_000_000;

export function getNetworkConstants(network: Network = "testnet"): NetworkConstants {
  return NETWORK_CONSTANTS[network];
}

/* ── Contact Methods ──────────────────────────────────────────────────── */

export const CONTACT_KINDS = ["email", "signal", "discord", "x", "telegram", "forum"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const CONTACT_LABEL: Record<ContactKind, string> = {
  email:    "Email",
  signal:   "Signal",
  discord:  "Discord",
  x:        "X / Twitter",
  telegram: "Telegram",
  forum:    "Zcash Community Forum",
};

export const CONTACT_PLACEHOLDER: Record<ContactKind, string> = {
  email:    "you@example.com",
  signal:   "@yourhandle or signal username",
  discord:  "@yourhandle",
  x:        "@yourhandle",
  telegram: "@yourhandle",
  forum:    "@username on forum.zcashcommunity.com",
};