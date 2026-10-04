//
// Shared domain types used across the entire app — components, server actions,
// and the SDK wrapper all depend on these. Every name operation flows through
// the three Action variants defined here.
//
// Data flow for a name operation, end to end (whitepaper protocol):
//   1. User searches a name → resolveName() returns a ResolveName union
//   2. Based on status, the UI shows action buttons (Claim / Update / Release)
//   3. The flow builds a Request memo (ZNS:claim|update|release:...) and the
//      user pays the Mint treasury via ZIP-321
//   4. For update/release, the Mint Relays an OTP to the bound address; the
//      user enters it and pays the Respond (ZNS:otp:...) to execute
//   5. The client polls the resolver until the Name Note lands on-chain
//

/* ── Primitives ───────────────────────────────────────────────────────── */

export type Network = "testnet" | "mainnet";
export type Zats = number; // 1 ZEC = 100_000_000 zats

/* ── Actions & Phases ─────────────────────────────────────────────────── */

// The protocol has exactly three lifecycle verbs (whitepaper §Name Notes).
export const ACTIONS = ["CLAIM", "UPDATE", "RELEASE"] as const;
export type Action = (typeof ACTIONS)[number];

/** Lowercase verbs as they appear in memos, Name Notes, and resolver events. */
export type ProtocolVerb = "claim" | "update" | "release";

export const ACTION_VERB: Record<Action, ProtocolVerb> = {
  CLAIM: "claim",
  UPDATE: "update",
  RELEASE: "release",
};

export const ACTION_LABELS = {
  CLAIM: "Claim",
  UPDATE: "Update",
  RELEASE: "Release",
} as const satisfies Record<Action, string>;

// Used in copy: "Your {noun} is being scanned" / "hasn't appeared yet".
// Lowercased and reads naturally inline.
export const ACTION_NOUNS = {
  CLAIM: "claim",
  UPDATE: "address update",
  RELEASE: "release",
} as const satisfies Record<Action, string>;

export const ACTION_COLORS = {
  CLAIM:   { bg: "var(--color-accent-green-light)", text: "var(--color-accent-green)" },
  UPDATE:  { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  RELEASE: { bg: "rgba(239,68,68,0.15)", text: "#ef4444" },
} as const satisfies Record<Action, { bg: string; text: string }>;

// Capability table per action (whitepaper §Requests, §Authorization):
//   needsInput   collects user data (target address / term) before dispatch
//   needsFee     carries the $1 Request fee (update/release)
//   needsOtp     completes via Relay→Respond OTP authorization
//   paysOnRespond  the name payment rides on the Respond, not the Request
export interface ActionCaps {
  needsInput: boolean;
  needsFee: boolean;
  needsOtp: boolean;
  paysOnRespond: boolean;
}
export const ACTION_CAPS: Record<Action, ActionCaps> = {
  CLAIM:   { needsInput: true,  needsFee: false, needsOtp: false, paysOnRespond: false },
  UPDATE:  { needsInput: true,  needsFee: true,  needsOtp: true,  paysOnRespond: true  },
  // No form fields — releases always act on the currently bound address.
  RELEASE: { needsInput: false, needsFee: true,  needsOtp: true,  paysOnRespond: true  },
};

// Linear phases a purchase modal walks through. Zip321Modal renders one screen
// per phase, advancing as the user completes each step.
//
//   input    — collect target Unified Address (and term for claim/update)
//   confirm  — first payment screen: the Request memo
//              (claim: name price · update/release: $1 request fee)
//   otp      — the user enters the six-digit code the Mint Relayed to the
//              bound address (update/release only)
//   respond  — second payment screen: the Respond memo carrying the OTP and,
//              for updates, the name payment (release Respond carries none)
//   scanning — polls the resolver until the resulting Name Note is on-chain
export type Phase =
  | "unlock"
  | "input"
  | "confirm"
  | "otp"
  | "respond"
  | "scanning";

/**
 * Derive the linear phase list for an action.
 *
 *   CLAIM   input → confirm → scanning
 *   UPDATE  input → confirm → otp → respond → scanning
 *   RELEASE confirm → otp → respond → scanning
 */
export function phasesFor(action: Action): Phase[] {
  const caps = ACTION_CAPS[action];
  const phases: Phase[] = [];
  if (caps.needsInput) phases.push("input");
  phases.push("confirm");
  if (caps.needsOtp) {
    phases.push("otp");
    phases.push("respond");
  }
  phases.push("scanning");
  return phases;
}

/* ── Name Availability ────────────────────────────────────────────────── */

// The possible states a searched name can be in. The UI (HomeResultCard,
// ExplorerNameDetail, NameStatus) renders differently for each one.
export type NameAvailabilityState = "available" | "registered" | "blocked";

/* ── Domain Objects ────────────────────────────────────────────────────── */

// Mirrors the resolver's Registration record (zcashname-sdk 0.13).
export interface Registration {
  name: string;
  address: string;
  txid: string;
  height: number;
  /** "claim" | "update" | "release" */
  lastAction: ProtocolVerb;
  /** "none" for registrations without fixed expiration, else a Unix timestamp string. */
  expiresAt: string;
}

// Mirrors the resolver's event log entries.
export interface ZnsEvent {
  id: number;
  name: string;
  action: ProtocolVerb;
  txid: string;
  height: number;
  /** Ordering within a block when several events share a height. */
  actionIndex: number;
  address: string;
  expiresAt: string;
}

/* ── ResolveName ──────────────────────────────────────────────────────── */

// Discriminated union returned by resolveName(). UI switches on `status`
// to decide which buttons and pricing to show.
export type ResolveName =
  | { status: "available"; query: string; claimCost: { zats: number; zec: number } }
  | { status: "blocked"; query: string }
  | { status: "registered"; query: string; registration: Registration };

/* ── Transaction State ───────────────────────────────────────────────── */

// Scan states while watching for the resulting Name Note on-chain.
// "in_mempool"/"confirming" are transient flavor states; the resolver is the
// source of truth for "mined".
export type ScanState =
  | "not_detected"
  | "in_mempool"
  | "confirming"
  | "mined";

/* ── Network Constants ────────────────────────────────────────────────── */

// Client-side cap on Respond passcode entries. The Mint enforces the
// authoritative attempt limit inside the enclave.
export const OTP_MAX_ATTEMPTS = 5;

/* ── Contact Methods ──────────────────────────────────────────────────── */

export const CONTACT_KINDS = ["email", "signal", "discord", "x", "telegram", "forum", "other"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const CONTACT_LABEL: Record<ContactKind, string> = {
  email:    "Email",
  signal:   "Signal",
  discord:  "Discord",
  x:        "X / Twitter",
  telegram: "Telegram",
  forum:    "Zcash Community Forum",
  other:    "Other",
};

export const CONTACT_PLACEHOLDER: Record<ContactKind, string> = {
  email:    "you@example.com",
  signal:   "@yourhandle or signal username",
  discord:  "@yourhandle",
  x:        "@yourhandle",
  telegram: "@yourhandle",
  forum:    "@username on forum.zcashcommunity.com",
  other:    "How should we reach you?",
};
