"use server";

import type { Network, ProtocolVerb } from "@/lib/types";
import { getZns, normalizeUsername, isValidUsername, validateAddress } from "@/lib/zns/utils";
import { getMintConfig, isMintNetworkEnabled } from "@/lib/zns/mint-config";
import {
  buildClaimRequest,
  buildCodedClaimRequest,
  buildUpdateRequest,
  buildReleaseRequest,
  buildOtpRespond,
  isValidTerm,
  isValidSixDigitCode,
  type ClaimTerm,
  type UpdateTerm,
} from "@/lib/zns/request-memo";
import {
  quoteClaimZats,
  quoteRequestFeeZats,
  quoteUpdateRespondZats,
} from "@/lib/zns/pricing";
import { zatsToZecString } from "@/lib/zns/pricing-static";
import { zip321Uri } from "@/lib/purchases/zip321";

//
// Write-path server actions for the Mint protocol.
//
// The site never signs anything: it validates the request against the
// resolver's public registry state, builds the whitepaper Request/Respond
// memo, and hands back a ZIP-321 payment URI whose destination is the Mint
// treasury Unified Address. The attested Mint evaluates the memo on-chain.
//
// Actions:
//   claimRequest    → ZNS:claim:<term>:<name>:<ua>   + name price
//   updateRequest   → ZNS:update:<term>:<name>:<ua>  + $1 request fee
//   releaseRequest  → ZNS:release:<name>:<ua>        + $1 request fee
//   otpRespond      → ZNS:otp:<otp>:<name>:<verb>:<ua>  (+ name payment for update)
//

export interface PaymentReply {
  ok: true;
  uri: string;
  memo: string;
  paymentAddress: string;
  amountZec: string;
}
export interface ErrorReply {
  ok: false;
  error: string;
}

function treasury(network: Network): string | null {
  return getMintConfig(network).treasuryUa;
}

function payment(
  memo: string,
  address: string,
  zats: number,
): PaymentReply {
  const amountZec = zatsToZecString(zats);
  const { uri } = zip321Uri(address, amountZec, memo);
  return { ok: true, uri, memo, paymentAddress: address, amountZec };
}

function guardNetwork(network: Network): ErrorReply | null {
  if (!isMintNetworkEnabled(network)) {
    return { ok: false, error: "This network's mint is not online yet." };
  }
  return null;
}

function guardName(rawName: string): { name: string } | ErrorReply {
  const name = normalizeUsername(rawName);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };
  return { name };
}

function guardUa(rawAddress: string): ErrorReply | null {
  const result = validateAddress(rawAddress.trim());
  if (result.status !== "unified") {
    return { ok: false, error: result.warning || "Unified address required." };
  }
  return null;
}

// ── CLAIM ──────────────────────────────────────────────────────────────
//
// `ZNS:claim:<term>:<name>:<ua>` (or `ZNS:claim:<code>:<term>:<name>:<ua>`
// for protected names once access-code claiming is wired up). Payment is the
// name price for the requested term. Passcode-free open claiming is what the
// allowOpenClaims flag gates: mainnet keeps it false even after launch.

export async function claimRequestAction(
  name: string,
  address: string,
  term: string,
  network: Network,
  accessCode?: string,
): Promise<PaymentReply | ErrorReply> {
  const guard = guardNetwork(network);
  if (guard) return guard;

  const mint = getMintConfig(network);
  const nameCheck = guardName(name);
  if (!("name" in nameCheck)) return nameCheck;
  const n = nameCheck.name;

  const uaGuard = guardUa(address);
  if (uaGuard) return uaGuard;
  const ua = address.trim();

  if (!isValidTerm(term)) {
    return { ok: false, error: "Choose a term: forever or 1-99 years." };
  }
  const claimTerm = term as ClaimTerm;

  // The resolver's public view decides "registered or not"; protected-name
  // eligibility is Mint policy. Mainnet never allows open claims — every
  // claim there must carry an access code.
  try {
    const existing = await getZns(network).resolveName(n);
    if (existing) return { ok: false, error: `Name "${n}" is already registered.` };
  } catch {
    return { ok: false, error: "Resolver unavailable — try again shortly." };
  }

  let memo: string;
  try {
    memo =
      accessCode && accessCode.length > 0
        ? buildCodedClaimRequest(accessCode, n, claimTerm, ua)
        : buildClaimRequest(n, claimTerm, ua);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid claim." };
  }

  if (!accessCode && !mint.allowOpenClaims) {
    return { ok: false, error: "Open claims are not enabled on this network." };
  }

  let zats: number;
  try {
    zats = await quoteClaimZats(n, claimTerm);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Pricing unavailable." };
  }

  return payment(memo, mint.treasuryUa!, zats);
}

// ── UPDATE ─────────────────────────────────────────────────────────────
//
// Step 1 of the authorization procedure: `ZNS:update:<term>:<name>:<ua>`
// plus the $1 request fee. term is "none" (carry the current expiration
// forward), "<N>y" (extension), or "forever" (upgrade a fixed-term
// registration). The Mint Relays the OTP to the currently bound address.

export async function updateRequestAction(
  name: string,
  address: string,
  term: string,
  network: Network,
): Promise<PaymentReply | ErrorReply> {
  const guard = guardNetwork(network);
  if (guard) return guard;

  const nameCheck = guardName(name);
  if (!("name" in nameCheck)) return nameCheck;
  const n = nameCheck.name;

  const uaGuard = guardUa(address);
  if (uaGuard) return uaGuard;
  const ua = address.trim();

  if (!isValidTerm(term) && term !== "none") {
    return { ok: false, error: "Choose a term: none, forever, or 1-99 years." };
  }
  const updateTerm = term as UpdateTerm;

  try {
    const current = await getZns(network).resolveName(n);
    if (!current) return { ok: false, error: `Name "${n}" is not registered.` };
    if (current.expiresAt === "none" && updateTerm === "forever") {
      return { ok: false, error: "This registration has no fixed expiration to upgrade." };
    }
    if (updateTerm !== "none" && current.expiresAt === "none") {
      return { ok: false, error: "Registrations without fixed expiration cannot be extended." };
    }
  } catch {
    return { ok: false, error: "Resolver unavailable — try again shortly." };
  }

  let memo: string;
  try {
    memo = buildUpdateRequest(n, updateTerm, ua);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid update." };
  }

  let feeZats: number;
  try {
    feeZats = await quoteRequestFeeZats();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Pricing unavailable." };
  }

  return payment(memo, treasury(network)!, feeZats);
}

// ── RELEASE (controller-requested) ─────────────────────────────────────
//
// Step 1: `ZNS:release:<name>:<ua>` where <ua> is the address of the binding
// being released, plus the $1 request fee. The Mint Relays the OTP.

export async function releaseRequestAction(
  name: string,
  network: Network,
): Promise<PaymentReply | ErrorReply> {
  const guard = guardNetwork(network);
  if (guard) return guard;

  const nameCheck = guardName(name);
  if (!("name" in nameCheck)) return nameCheck;
  const n = nameCheck.name;

  let boundUa: string | null = null;
  try {
    const current = await getZns(network).resolveName(n);
    if (!current) return { ok: false, error: `Name "${n}" is not registered.` };
    boundUa = current.address;
  } catch {
    return { ok: false, error: "Resolver unavailable — try again shortly." };
  }

  let memo: string;
  try {
    memo = buildReleaseRequest(n, boundUa);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid release." };
  }

  let feeZats: number;
  try {
    feeZats = await quoteRequestFeeZats();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Pricing unavailable." };
  }

  return payment(memo, treasury(network)!, feeZats);
}

// ── OTP RESPOND ────────────────────────────────────────────────────────
//
// Step 3: the controller enters the six-digit code from the Mint's Relay
// memo. The Respond copies the Relay encoding exactly and carries the name
// payment for updates (extension/upgrade price; zero for carry-forward and
// for releases).

export async function otpRespondAction(
  otp: string,
  name: string,
  verb: ProtocolVerb,
  ua: string,
  term: string,
  network: Network,
): Promise<PaymentReply | ErrorReply> {
  const guard = guardNetwork(network);
  if (guard) return guard;

  if (verb !== "update" && verb !== "release") {
    return { ok: false, error: "Invalid action." };
  }
  if (!isValidSixDigitCode(otp)) {
    return { ok: false, error: "Enter the six-digit passcode from your wallet." };
  }

  const nameCheck = guardName(name);
  if (!("name" in nameCheck)) return nameCheck;
  const n = nameCheck.name;

  const uaGuard = guardUa(ua);
  if (uaGuard) return uaGuard;

  let memo: string;
  try {
    memo = buildOtpRespond(otp, n, verb, ua.trim());
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid passcode." };
  }

  let paymentZats = 0;
  if (verb === "update" && term !== "none") {
    if (!isValidTerm(term)) {
      return { ok: false, error: "Invalid update term." };
    }
    try {
      paymentZats = await quoteUpdateRespondZats(n, term as UpdateTerm);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Pricing unavailable." };
    }
  }

  return payment(memo, treasury(network)!, paymentZats);
}
