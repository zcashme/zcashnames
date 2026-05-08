"use server";

import crypto from "node:crypto";
import type { Network } from "@/lib/types";
import { getZns, getVerifiedZns, fetchClaimCost, normalizeUsername, isValidUsername, validateAddress } from "@/lib/zns/utils";
import { MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import { getReservedName, verifyUnlockCode } from "@/lib/zns/reserved";
import { verifyProof, verifyProofKind, issueProof, parseProofSubject } from "@/lib/zns/proof";
import { verifyOtp as _verifyOtp } from "@/lib/purchases/otp";

interface CompletedAction {
  memo: string;
  uri: string;
}

interface PreparedAction {
  readonly payload: string;
  complete(signature: string, userPubkey?: string): CompletedAction;
}

export async function verifyOtp(
  memo: string,
  code: string,
  expectedAddress: string,
): Promise<{ ok: true; proof: string } | { ok: false; error: string }> {
  return _verifyOtp(memo, code, expectedAddress);
}

/* ── Admin signing (server-only, Ed25519 via Node crypto) ───────────── */

let cachedKeyPair: crypto.KeyObject | null = null;

function getSigningKey(): crypto.KeyObject {
  if (cachedKeyPair) return cachedKeyPair;

  const hex = process.env.ZNS_SIGNING_KEY_PATH;
  if (!hex) throw new Error("ZNS_SIGNING_KEY_PATH environment variable is required");

  const seed = Buffer.from(hex, "hex");
  cachedKeyPair = crypto.createPrivateKey({
    key: Buffer.concat([
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed,
    ]),
    format: "der",
    type: "pkcs8",
  });

  return cachedKeyPair;
}

function adminSign(payload: string): string {
  const key = getSigningKey();
  const sig = crypto.sign(null, Buffer.from(payload, "utf-8"), key);
  return sig.toString("base64");
}

function completeWithAdmin(prepared: PreparedAction): CompletedAction {
  return prepared.complete(adminSign(prepared.payload));
}

/* ── Signed action builders ──────────────────────────────────────────── */

async function buildSignedClaimAction(
  name: string,
  userUa: string,
  network: Network = "testnet",
): Promise<CompletedAction> {
  const zns = await getVerifiedZns(network);
  const reg = await zns.resolveName(name);
  if (reg) throw new Error(`Name "${name}" is already registered.`);
  const cost = await fetchClaimCost(name, network);
  if (cost == null) throw new Error("Pricing unavailable - indexer may be down.");
  return completeWithAdmin(zns.prepareClaim(name, userUa, cost));
}

async function buildSignedBuyAction(
  name: string,
  buyerUa: string,
  listingPriceZats?: number,
  network: Network = "testnet",
): Promise<CompletedAction> {
  const zns = await getVerifiedZns(network);
  const reg = await zns.resolveName(name);
  if (!reg?.listing) throw new Error(`Name "${name}" is not listed for sale.`);
  return completeWithAdmin(zns.prepareBuy(name, buyerUa, listingPriceZats ?? reg?.listing?.price ?? 0));
}

async function buildSignedListAction(
  name: string,
  priceZats: number,
  payTaddr: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = await getVerifiedZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareList(name, priceZats, payTaddr, nonce)), nonce };
}

async function buildSignedDelistAction(
  name: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = await getVerifiedZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareDelist(name, nonce)), nonce };
}

async function buildSignedReleaseAction(
  name: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = await getVerifiedZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareRelease(name, nonce)), nonce };
}

async function buildSignedUpdateAction(
  name: string,
  newUa: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = await getVerifiedZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareUpdate(name, newUa, nonce)), nonce };
}

/* ── Input validation helpers ────────────────────────────────────────── */

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

/* ── Public action builders ──────────────────────────────────────────── */

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

export interface BuyInput {
  name: string;
  address: string;
  network: Network;
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

export interface ListInput {
  name: string;
  priceZats: number;
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

  const zns = getZns(input.network);
  if (!zns.isValidTransparentAddress(input.payTaddr.trim())) {
    return { ok: false, error: "Enter a valid transparent Zcash address (t1, t3, tm, or tn)." };
  }
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
