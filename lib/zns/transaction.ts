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
import { readCurrentStage } from "@/lib/beta/gate";
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

const NETWORK_PASSWORDS: Record<Network, string | undefined> = {
  testnet: process.env.TESTNET_PASSWORD,
  mainnet: process.env.MAINNET_PASSWORD,
};

function verifyNetworkPassword(network: Network, password: string | undefined): boolean {
  const expected = NETWORK_PASSWORDS[network];
  if (!expected) return false;
  return password === expected;
}

async function verifyNetworkAccess(network: Network, password: string | undefined): Promise<boolean> {
  if (verifyNetworkPassword(network, password)) return true;
  const cookieStage = await readCurrentStage();
  return cookieStage === network;
}

async function requireNetworkAccess(network: Network, password: string | undefined): Promise<ActionResult | undefined> {
  if (await verifyNetworkAccess(network, password)) return undefined;
  return { ok: false, error: "Invalid network password." };
}

function requireUnifiedAddress(address: string | undefined, network: Network): ActionResult | { address: string } {
  const addr = address?.trim();
  if (!addr) return { ok: false, error: "Address is required." };
  const check = validateAddress(addr, network);
  if (check.status !== "unified") return { ok: false, error: check.warning || "A unified address is required." };
  return { address: addr };
}

function requireOtpProof(otpProof: string | undefined, expectedAddress: string): ActionResult | undefined {
  if (!otpProof) return { ok: false, error: "Verification required." };
  if (!verifyProofKind(otpProof, "otp")) {
    return { ok: false, error: "Verification expired. Please start over." };
  }
  const parsed = parseProofSubject(otpProof);
  if (!parsed || parsed.kind !== "otp") {
    return { ok: false, error: "Verification expired. Please start over." };
  }
  const [_sessionId, proofAddress] = parsed.subject.split(":");
  if (proofAddress !== expectedAddress) {
    return { ok: false, error: "Verification expired. Please start over." };
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

/* ── claim ────────────────────────────────────────────────────────────── */

export interface ClaimInput {
  name: string;
  address: string;
  network: Network;
  networkPassword?: string;
  unlockProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildClaim(input: ClaimInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const denied = await requireNetworkAccess(input.network, input.networkPassword);
  if (denied) return denied;

  const addrResult = requireUnifiedAddress(input.address, input.network);
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
    if (input.sovereignSig) {
      const sig = input.sovereignSig.trim();
      const pub = input.sovereignPub?.trim();
      if (!pub) throw new Error("Public key is required for sovereign claim.");
      return { ok: true, uri: getZns(input.network).prepareClaim(name, addrResult.address, costZats).complete(sig, pub).uri };
    }
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
  networkPassword?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildBuy(input: BuyInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const denied = await requireNetworkAccess(input.network, input.networkPassword);
  if (denied) return denied;

  const addrResult = requireUnifiedAddress(input.address, input.network);
  if (!("address" in addrResult)) return addrResult;

  try {
    if (input.sovereignSig) {
      const sig = input.sovereignSig.trim();
      const pub = input.sovereignPub?.trim();
      if (!pub) throw new Error("Public key is required for sovereign buy.");
      return { ok: true, uri: getZns(input.network).prepareBuy(name, addrResult.address).complete(sig, pub).uri };
    }
    return { ok: true, uri: (await buildSignedBuyAction(name, addrResult.address, input.network)).uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── update ───────────────────────────────────────────────────────────── */

export interface UpdateInput {
  name: string;
  address: string;
  network: Network;
  networkPassword?: string;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildUpdate(input: UpdateInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const denied = await requireNetworkAccess(input.network, input.networkPassword);
  if (denied) return denied;

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  if (reg.pubkey) {
    if (!input.sovereignSig) return { ok: false, error: "This name is controlled by a keypair. Use sovereign signing." };
    const sig = input.sovereignSig.trim();
    const pub = input.sovereignPub?.trim() || reg.pubkey;
    const addrResult = requireUnifiedAddress(input.address, input.network);
    if (!("address" in addrResult)) return addrResult;

    try {
      return { ok: true, uri: zns.prepareUpdate(name, addrResult.address, reg.nonce + 1).complete(sig, pub).uri };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
    }
  }

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  const addrResult = requireUnifiedAddress(input.address, input.network);
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
  network: Network;
  networkPassword?: string;
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

  const denied = await requireNetworkAccess(input.network, input.networkPassword);
  if (denied) return denied;

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  if (reg.pubkey) {
    if (!input.sovereignSig) return { ok: false, error: "This name is controlled by a keypair. Use sovereign signing." };
    const sig = input.sovereignSig.trim();
    const pub = input.sovereignPub?.trim() || reg.pubkey;

    try {
      return { ok: true, uri: zns.prepareList(name, input.priceZats, reg.nonce + 1).complete(sig, pub).uri };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
    }
  }

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  try {
    return { ok: true, uri: (await buildSignedListAction(name, input.priceZats, input.network)).action.uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

/* ── delist ────────────────────────────────────────────────────────────── */

export interface DelistInput {
  name: string;
  network: Network;
  networkPassword?: string;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildDelist(input: DelistInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const denied = await requireNetworkAccess(input.network, input.networkPassword);
  if (denied) return denied;

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  if (reg.pubkey) {
    if (!input.sovereignSig) return { ok: false, error: "This name is controlled by a keypair. Use sovereign signing." };
    const sig = input.sovereignSig.trim();
    const pub = input.sovereignPub?.trim() || reg.pubkey;

    try {
      return { ok: true, uri: zns.prepareDelist(name, reg.nonce + 1).complete(sig, pub).uri };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
    }
  }

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
  networkPassword?: string;
  otpProof?: string;
  sovereignSig?: string;
  sovereignPub?: string;
}

export async function buildRelease(input: ReleaseInput): Promise<ActionResult> {
  const name = normalizeUsername(input.name);
  if (!isValidUsername(name)) return { ok: false, error: "Invalid name." };

  const denied = await requireNetworkAccess(input.network, input.networkPassword);
  if (denied) return denied;

  const zns = getZns(input.network);
  const reg = await zns.resolveName(name);
  if (!reg) return { ok: false, error: "Name is not registered." };

  if (reg.pubkey) {
    if (!input.sovereignSig) return { ok: false, error: "This name is controlled by a keypair. Use sovereign signing." };
    const sig = input.sovereignSig.trim();
    const pub = input.sovereignPub?.trim() || reg.pubkey;

    try {
      return { ok: true, uri: zns.prepareRelease(name, reg.nonce + 1).complete(sig, pub).uri };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
    }
  }

  const otpDenied = requireOtpProof(input.otpProof, reg.address);
  if (otpDenied) return otpDenied;

  try {
    return { ok: true, uri: (await buildSignedReleaseAction(name, input.network)).action.uri };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}