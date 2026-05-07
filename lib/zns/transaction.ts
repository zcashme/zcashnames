"use server";

import {
  buildSignedClaimAction,
  buildSignedBuyAction,
  buildSignedListAction,
  buildSignedDelistAction,
  buildSignedReleaseAction,
  buildSignedUpdateAction,
} from "@/lib/zns/admin";
import { normalizeUsername, isValidUsername, validateAddress, type Network, fetchClaimCost, getZns } from "@/lib/zns/client";
import { MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import { getReservedName, verifyUnlockCode } from "@/lib/zns/reserved";
import { verifyProof, verifyProofKind, issueProof, parseProofSubject } from "@/lib/zns/proof";
import { verifyOtp as _verifyOtp } from "@/lib/payment/otp";

export async function verifyOtp(
  memo: string,
  code: string,
  expectedAddress: string,
): Promise<{ ok: true; proof: string } | { ok: false; error: string }> {
  return _verifyOtp(memo, code, expectedAddress);
}


type ActionResult =
  | { ok: true; uri: string }
  | { ok: false; error: string };



function requireUnifiedAddress(address: string | undefined): ActionResult | { address: string } {
  const addr = address?.trim();
  if (!addr) return { ok: false, error: "Address is required." };
  const check = validateAddress(addr);
  if (check.status !== "unified") return { ok: false, error: check.warning || "A unified address is required." };
  return { address: addr };
}

function requireOtpProof(otpProof: string | undefined, expectedAddress: string): ActionResult | undefined {
  if (!otpProof) return { ok: false, error: "Verification required." };
  if (!verifyProofKind(otpProof, "otp")) {
    return { ok: false, error: "Verification invalid. Please start over." };
  }
  const parsed = parseProofSubject(otpProof);
  if (!parsed || parsed.kind !== "otp") {
    return { ok: false, error: "Verification invalid. Please start over." };
  }
  const [_sessionId, proofAddress] = parsed.subject.split(":");
  if (proofAddress !== expectedAddress) {
    return { ok: false, error: "Verification invalid. Please start over." };
  }
  return undefined;
}

/** Validate a transparent Zcash address (t1, t3, tm, t2 prefixes). */
function isValidTaddr(addr: string): boolean {
  return /^[tT][1-3mM][A-Za-z0-9]{20,}$/.test(addr.trim());
}

/* ── checkUnlockCode ──────────────────────────────────────────────────── */

export async function checkUnlockCode(
  name: string,
  code: string,
): Promise<{ ok: true; proof: string } | { ok: false; error: string }> {
  const normalized = normalizeUsername(name);
  const reserved = await getReservedName(normalized);
  if (!reserved || reserved.redeemed) return { ok: false, error: "This name is not reserved." };
  if (reserved.category === "offensive") return { ok: false, error: "This name is not available." };
  if (!verifyUnlockCode(normalized, code)) return { ok: false, error: "Invalid unlock code." };
  return { ok: true, proof: issueProof("unlock", normalized) };
}

/* ── claim ────────────────────────────────────────────────────────────── */

export interface ClaimInput {
  name: string;
  address: string;
  network: Network;
  unlockProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildClaim(input: ClaimInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const addrResult = requireUnifiedAddress(input.address);
  if (!("address" in addrResult)) return addrResult;

  const reserved = await getReservedName(name);
  if (reserved && !reserved.redeemed) {
    if (reserved.category === "offensive") return { ok: false, error: "This name is not available." };
    if (!input.unlockProof || !verifyProof(input.unlockProof, "unlock", name)) {
      return { ok: false, error: "Unlock code required for this name." };
    }
  }

  const costZats = await fetchClaimCost(name, input.network);
  if (costZats == null) return { ok: false, error: "Pricing unavailable - indexer may be down." };

  try {
    return { ok: true, uri: (await buildSignedClaimAction(name, addrResult.address, input.network)).uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── buy ──────────────────────────────────────────────────────────────── */

export interface BuyInput {
  name: string;
  address: string;
  network: Network;
  /** Listing price in zats, for inclusion in the BUY memo. */
  listingPriceZats?: number;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildBuy(input: BuyInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const addrResult = requireUnifiedAddress(input.address);
  if (!("address" in addrResult)) return addrResult;

  try {
    return { ok: true, uri: (await buildSignedBuyAction(name, addrResult.address, input.listingPriceZats ?? 0, input.network)).uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── update ───────────────────────────────────────────────────────────── */

export interface UpdateInput {
  name: string;
  address: string;
  network: Network;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildUpdate(input: UpdateInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  const addrResult = requireUnifiedAddress(input.address);
  if (!("address" in addrResult)) return addrResult;

  try {
    return { ok: true, uri: (await buildSignedUpdateAction(name, addrResult.address, input.network)).action.uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── list ─────────────────────────────────────────────────────────────── */

export interface ListInput {
  name: string;
  priceZats: number;
  /** Transparent address where the seller will receive the buyer's payment. */
  payTaddr: string;
  network: Network;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildList(input: ListInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const maxZats = MAX_LIST_FOR_SALE_AMOUNT * 100_000_000;
  if (input.priceZats < 0 || input.priceZats > maxZats) {
    return { ok: false, error: "Price must be between 0 and 21,000,000 ZEC." };
  }

  if (!isValidTaddr(input.payTaddr)) {
    return { ok: false, error: "Enter a valid transparent Zcash address (t1, t3, tm, or t2)." };
  }

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  try {
    return { ok: true, uri: (await buildSignedListAction(name, input.priceZats, input.payTaddr, input.network)).action.uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── delist ────────────────────────────────────────────────────────────── */

export interface DelistInput {
  name: string;
  network: Network;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildDelist(input: DelistInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  try {
    return { ok: true, uri: (await buildSignedDelistAction(name, input.network)).action.uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── release ──────────────────────────────────────────────────────────── */

export interface ReleaseInput {
  name: string;
  network: Network;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildRelease(input: ReleaseInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  try {
    return { ok: true, uri: (await buildSignedReleaseAction(name, input.network)).action.uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}
