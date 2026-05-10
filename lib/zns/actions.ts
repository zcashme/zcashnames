"use server";

import crypto from "node:crypto";
import { ZNS } from "zcashname-sdk";
import type { Network } from "@/lib/types";
import { getZns, getVerifiedZns, fetchClaimCost, normalizeUsername, isValidUsername, validateAddress } from "@/lib/zns/utils";
import { MAX_LIST_FOR_SALE_AMOUNT } from "@/lib/types";
import { getReservedName, verifyUnlockCode } from "@/lib/zns/reserved";
import { verifyProof, verifyProofKind, issueProof, parseProofSubject } from "@/lib/zns/proof";
import { verifyOtp as _verifyOtp } from "@/lib/purchases/otp";

//
// Write-path server actions for name operations.
//
// Every name mutation (claim, buy, update, list, delist, release) follows
// the same pattern:
//   1. Validate input (name format, address format, required proofs)
//   2. Look up current on-chain state via the ZNS indexer
//   3. Build a signed payload using the server's Ed25519 admin key
//   4. Return a ZIP-321 payment URI the user opens in their wallet
//
// The admin signing key is loaded once from ZNS_SIGNING_KEY_PATH (a 32-byte
// hex seed) and cached in-process. The DER wrapper prepended to the seed
// encodes the Ed25519 algorithm OID so Node's crypto.createPrivateKey() can
// parse it as a PKCS#8 key.

// ── Admin signing ───────────────────────────────────────────────────

let cachedKey: crypto.KeyObject | null = null;

function getSigningKey(): crypto.KeyObject {
  if (cachedKey) return cachedKey;
  const hex = process.env.ZNS_SIGNING_KEY_PATH;
  if (!hex) throw new Error("ZNS_SIGNING_KEY_PATH environment variable is required");
  const seed = Buffer.from(hex, "hex");
  if (seed.length !== 32) throw new Error("ZNS_SIGNING_KEY_PATH must be a 32-byte hex seed");
  cachedKey = crypto.createPrivateKey({
    key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]),
    format: "der",
    type: "pkcs8",
  });
  return cachedKey;
}

function sign(payload: string): string {
  return crypto.sign(null, Buffer.from(payload, "utf-8"), getSigningKey()).toString("base64");
}

interface Prepared {
  readonly payload: string;
  complete(signature: string, userPubkey?: string): { memo: string; uri: string };
}

// Every ZNS action produces a Prepared object (payload + a complete() method).
// We sign the payload with the server's admin key, then call complete() which
// embeds the signature and returns the ZIP-321 URI the wallet needs.
// Complete a prepared action. If sovereign sig+pubkey are provided, the
// client has already signed — embed them in the memo. Otherwise, admin-sign.
function completeAction(
  prepared: Prepared,
  sovereignSig?: string,
  sovereignPub?: string,
): { memo: string; uri: string } {
  if (sovereignSig && sovereignPub) {
    return prepared.complete(sovereignSig, sovereignPub);
  }
  return prepared.complete(sign(prepared.payload));
}

// ── Server actions ───────────────────────────────────────────────────
//
// Each action below corresponds to one of the six domain Action variants.
// The frontend (Zip321Modal) calls these directly as Server Actions —
// they run on the server, so the admin signing key never leaves the backend.
//

// CLAIM: register an unowned name. Requires only a unified address.
// Reserved names additionally need an unlock proof from checkUnlockCode().
export async function claimAction(
  name: string,
  address: string,
  network: Network,
  unlockProof?: string,
  sovereignSig?: string,
  sovereignPub?: string,
): Promise<{ ok: true; uri: string; memo: string } | { ok: false; error: string }> {
  const n = normalizeUsername(name);
  if (!isValidUsername(n)) return { ok: false, error: "Invalid name." };
  const addrResult = validateAddress(address.trim());
  if (addrResult.status !== "unified") return { ok: false, error: addrResult.warning || "Unified address required." };

  const reserved = await getReservedName(n);
  if (reserved && !reserved.redeemed) {
    if (reserved.category === "offensive") return { ok: false, error: "This name is not available." };
    if (!unlockProof || !verifyProof(unlockProof, "unlock", n)) {
      return { ok: false, error: "Unlock code required for this name." };
    }
  }

  try {
    const zns = await getVerifiedZns(network);
    if (await zns.resolveName(n)) return { ok: false, error: `Name "${n}" is already registered.` };
    const cost = await fetchClaimCost(n, network);
    if (cost == null) return { ok: false, error: "Pricing unavailable - indexer may be down." };
    const { memo, uri } = completeAction(zns.prepareClaim(n, address, cost), sovereignSig, sovereignPub);
    return { ok: true, uri, memo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

// BUY: purchase a name that is currently listed for sale. The price is
// determined by the seller's listing; we fall back to whatever is on-chain.
export async function buyAction(
  name: string,
  address: string,
  network: Network,
  listingPriceZats?: number,
  sovereignSig?: string,
  sovereignPub?: string,
): Promise<{ ok: true; uri: string; memo: string } | { ok: false; error: string }> {
  const n = normalizeUsername(name);
  if (!isValidUsername(n)) return { ok: false, error: "Invalid name." };
  const addrResult = validateAddress(address.trim());
  if (addrResult.status !== "unified") return { ok: false, error: addrResult.warning || "Unified address required." };

  try {
    const zns = await getVerifiedZns(network);
    const reg = await zns.resolveName(n);
    if (!reg?.listing) return { ok: false, error: `Name "${n}" is not listed for sale.` };
    const price = listingPriceZats ?? reg.listing.price;
    const { memo, uri } = completeAction(zns.prepareBuy(n, address, price), sovereignSig, sovereignPub);
    return { ok: true, uri, memo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

// UPDATE: change the unified address a registered name points to.
// Requires OTP proof that the caller owns the current address.
export async function updateAction(
  name: string,
  address: string,
  network: Network,
  otpProof?: string,
  sovereignSig?: string,
  sovereignPub?: string,
): Promise<{ ok: true; uri: string; memo: string } | { ok: false; error: string }> {
  const n = normalizeUsername(name);
  if (!isValidUsername(n)) return { ok: false, error: "Invalid name." };
  const addrResult = validateAddress(address.trim());
  if (addrResult.status !== "unified") return { ok: false, error: addrResult.warning || "Unified address required." };

  const zns = getZns(network);
  const reg = await zns.resolveName(n);
  if (!reg) return { ok: false, error: "Name is not registered." };

  if (!otpProof || !verifyProofKind(otpProof, "otp")) return { ok: false, error: "Verification required." };
  const parsed = parseProofSubject(otpProof);
  if (!parsed || parsed.kind !== "otp") return { ok: false, error: "Verification invalid." };
  const [, proofAddress] = parsed.subject.split(":");
  if (proofAddress !== reg.address) return { ok: false, error: "Verification invalid." };

  try {
    const { memo, uri } = completeAction(zns.prepareUpdate(n, address, reg.nonce + 1), sovereignSig, sovereignPub);
    return { ok: true, uri, memo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

// LIST: put a registered name up for sale at a given price (in zats).
// The seller provides a transparent payout address (t-addr) where proceeds go.
// Requires OTP proof of ownership.
export async function listAction(
  name: string,
  priceZats: number,
  payTaddr: string,
  network: Network,
  otpProof?: string,
  sovereignSig?: string,
  sovereignPub?: string,
): Promise<{ ok: true; uri: string; memo: string } | { ok: false; error: string }> {
  const n = normalizeUsername(name);
  if (!isValidUsername(n)) return { ok: false, error: "Invalid name." };

  const zns = getZns(network);
  const reg = await zns.resolveName(n);
  if (!reg) return { ok: false, error: `Name "${n}" is not registered.` };

  if (!otpProof || !verifyProofKind(otpProof, "otp")) return { ok: false, error: "Verification required." };
  const parsed = parseProofSubject(otpProof);
  if (!parsed || parsed.kind !== "otp") return { ok: false, error: "Verification invalid." };
  const [, proofAddress] = parsed.subject.split(":");
  if (proofAddress !== reg.address) return { ok: false, error: "Verification invalid." };

  const maxZats = MAX_LIST_FOR_SALE_AMOUNT * 100_000_000;
  const minZats = 100_000;
  if (priceZats < minZats || priceZats > maxZats) {
    return { ok: false, error: `Price must be between 0.001 and ${MAX_LIST_FOR_SALE_AMOUNT.toLocaleString()} ZEC.` };
  }
  if (!zns.isValidTransparentAddress(payTaddr.trim())) {
    return { ok: false, error: "Enter a valid transparent Zcash address (t1, t3, tm, or tn)." };
  }

  try {
    const { memo, uri } = completeAction(zns.prepareList(n, priceZats, payTaddr, reg.nonce + 1), sovereignSig, sovereignPub);
    return { ok: true, uri, memo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

// DELIST: remove an active listing, taking the name off the market.
// Requires OTP proof of ownership.
export async function delistAction(
  name: string,
  network: Network,
  otpProof?: string,
  sovereignSig?: string,
  sovereignPub?: string,
): Promise<{ ok: true; uri: string; memo: string } | { ok: false; error: string }> {
  const n = normalizeUsername(name);
  if (!isValidUsername(n)) return { ok: false, error: "Invalid name." };

  const zns = getZns(network);
  const reg = await zns.resolveName(n);
  if (!reg) return { ok: false, error: `Name "${n}" is not registered.` };

  if (!otpProof || !verifyProofKind(otpProof, "otp")) return { ok: false, error: "Verification required." };
  const parsed = parseProofSubject(otpProof);
  if (!parsed || parsed.kind !== "otp") return { ok: false, error: "Verification invalid." };
  const [, proofAddress] = parsed.subject.split(":");
  if (proofAddress !== reg.address) return { ok: false, error: "Verification invalid." };

  try {
    const { memo, uri } = completeAction(zns.prepareDelist(n, reg.nonce + 1), sovereignSig, sovereignPub);
    return { ok: true, uri, memo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

// RELEASE: relinquish ownership of a name, returning it to the available pool.
// Requires OTP proof of ownership.
export async function releaseAction(
  name: string,
  network: Network,
  otpProof?: string,
  sovereignSig?: string,
  sovereignPub?: string,
): Promise<{ ok: true; uri: string; memo: string } | { ok: false; error: string }> {
  const n = normalizeUsername(name);
  if (!isValidUsername(n)) return { ok: false, error: "Invalid name." };

  const zns = getZns(network);
  const reg = await zns.resolveName(n);
  if (!reg) return { ok: false, error: `Name "${n}" is not registered.` };

  if (!otpProof || !verifyProofKind(otpProof, "otp")) return { ok: false, error: "Verification required." };
  const parsed = parseProofSubject(otpProof);
  if (!parsed || parsed.kind !== "otp") return { ok: false, error: "Verification invalid." };
  const [, proofAddress] = parsed.subject.split(":");
  if (proofAddress !== reg.address) return { ok: false, error: "Verification invalid." };

  try {
    const { memo, uri } = completeAction(zns.prepareRelease(n, reg.nonce + 1), sovereignSig, sovereignPub);
    return { ok: true, uri, memo };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Transaction failed." };
  }
}

//
// OTP verification: the user sends a tiny amount of ZEC to the OTP sign-in
// address with a specific memo. The server derives the expected 6-digit code
// from the memo using HMAC and compares it to what the user entered.
// Returns a signed proof token that the write-path actions require.
//
export async function verifyOtp(
  memo: string,
  code: string,
  expectedAddress: string,
): Promise<{ ok: true; proof: string } | { ok: false; error: string }> {
  return _verifyOtp(memo, code, expectedAddress);
}

//
// Reserved name unlock: some names (brands, protocol terms) are set aside.
// The unlock code is an HMAC-derived 12-character code generated server-side.
// Verifying it returns a proof token that claimAction() requires.
//
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