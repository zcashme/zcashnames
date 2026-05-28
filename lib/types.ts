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

/** All actions that appear in the event log -- user actions plus admin SETPRICE. */
export type EventAction = Action | "SETPRICE";

export const ACTION_LABELS = {
  CLAIM: "Claim",
  BUY: "Buy",
  UPDATE: "Update",
  LIST: "List",
  DELIST: "Delist",
  RELEASE: "Release",
} as const satisfies Record<Action, string>;

// Used in copy: "Your {noun} is in the mempool" / "hasn't been detected yet".
// Lowercased and reads naturally inline — `ACTION_LABELS[action].toLowerCase()`
// would give "buy" / "update", which sound clipped in running prose.
export const ACTION_NOUNS = {
  CLAIM: "claim",
  BUY: "purchase",
  UPDATE: "address update",
  LIST: "listing",
  DELIST: "delist",
  RELEASE: "release",
} as const satisfies Record<Action, string>;

// Auth shape for the zns server actions. Two orthogonal axes:
//   - `owner`: proof of ownership over the name (none / otp / sign).
//   - `reservedUnlock`: only meaningful when CLAIMing a reserved name. A
//     reserved sovereign claim sends both in one dispatch.
export type NameOwnership =
  | { kind: "none" }
  | { kind: "otp"; token: string }
  | { kind: "sign"; signature: string; pubkey: string };

export interface ActionAuth {
  reservedUnlock?: string;
  owner: NameOwnership;
}

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
//
//   scanning — watches the just-sent ZNS-memo'd tx through the mempool watcher
//              until it confirms on-chain.
//   settling — BUY-only. After the buyer pays the seller's t-addr, the indexer
//              still has to observe the transparent payment and flip ownership.
//              This phase polls the indexer until the name resolves to the
//              buyer's UA, then declares success.
export type Phase =
  | "unlock"
  | "input"
  | "otp"
  | "confirm"
  | "scanning"
  | "fund"
  | "settling";

// Capability table per action. The phase list is *derived* from this plus the
// runtime (resolve status, sovereign opt-in), so there's no second source of
// truth and no inline phase-array mutation in the modal. See phasesFor().
//
//   needsAuth     action requires proof of current control (otp or sig)
//   allowsCommit  user may attach/rotate the future-control pubkey (sovereign)
//   fund          BUY-shaped extra payment step (seller payout)
//   needsInput    has a data-collection screen at the top of the flow
//
export interface ActionCaps {
  needsAuth: boolean;
  allowsCommit: boolean;
  fund: boolean;
  needsInput: boolean;
}
export const ACTION_CAPS: Record<Action, ActionCaps> = {
  CLAIM:   { needsAuth: false, allowsCommit: true,  fund: false, needsInput: true  },
  BUY:     { needsAuth: false, allowsCommit: true,  fund: true,  needsInput: true  },
  UPDATE:  { needsAuth: true,  allowsCommit: true,  fund: false, needsInput: true  },
  LIST:    { needsAuth: true,  allowsCommit: true,  fund: false, needsInput: true  },
  DELIST:  { needsAuth: true,  allowsCommit: false, fund: false, needsInput: true  },
  RELEASE: { needsAuth: true,  allowsCommit: false, fund: false, needsInput: true  },
};

/**
 * Derive the linear phase list for an action given the runtime context.
 *
 * Rules:
 *   - Reserved CLAIM prepends `unlock`.
 *   - `input` appears if the action collects user data.
 *   - The `otp` phase appears for owner actions (needsAuth).
 *   - `confirm` always appears.
 *   - `scanning` always appears after `confirm` — watches the memo'd tx
 *     (registry commission for BUY, the action tx for everything else) to mine.
 *   - BUY adds `fund` after scanning (now that the BUY-intent is confirmed,
 *     the buyer pays the seller's t-addr) and then `settling` (indexer flips
 *     ownership once it observes the seller payment).
 */
export function phasesFor(
  action: Action,
  resolve: ResolveName,
): Phase[] {
  const caps = ACTION_CAPS[action];
  const phases: Phase[] = [];

  if (action === "CLAIM" && resolve.status === "reserved") phases.push("unlock");
  if (caps.needsInput) phases.push("input");
  if (caps.needsAuth) phases.push("otp");

  phases.push("confirm");
  phases.push("scanning");
  if (caps.fund) {
    phases.push("fund");
    phases.push("settling");
  }
  return phases;
}

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
  action: EventAction;
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
  | "mined";

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