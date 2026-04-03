/**
 * Server-only: ZNS admin signing operations.
 * DO NOT IMPORT IN CLIENT COMPONENTS.
 *
 * Handles Ed25519 signing of name operations using the ZNS admin key.
 * Requires ZNS_SIGNING_KEY_PATH environment variable (server-side only).
 */

import crypto from "node:crypto";
import type { Network } from "./name";
import { resolve, buildListMemo, buildDelistMemo, buildReleaseMemo, buildUpdateMemo, buildClaimMemo, buildBuyMemo } from "./client";
import {
  listPayload,
  delistPayload,
  releasePayload,
  updatePayload,
  claimPayload,
  buyPayload,
} from "./client";

let cachedKeyPair: crypto.KeyObject | null = null;

function getSigningKey(): crypto.KeyObject {
  if (cachedKeyPair) return cachedKeyPair;

  const hex = process.env.ZNS_SIGNING_KEY_PATH;
  if (!hex) throw new Error("ZNS_SIGNING_KEY_PATH environment variable is required");

  const seed = Buffer.from(hex, "hex"); // 32-byte Ed25519 seed
  cachedKeyPair = crypto.createPrivateKey({
    key: Buffer.concat([
      // PKCS#8 DER prefix for Ed25519 (RFC 8410)
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed,
    ]),
    format: "der",
    type: "pkcs8",
  });

  return cachedKeyPair;
}

/** Sign a payload with the admin Ed25519 key. Returns base64 signature. */
export function adminSign(payload: string): string {
  const key = getSigningKey();
  const sig = crypto.sign(null, Buffer.from(payload, "utf-8"), key);
  return sig.toString("base64");
}

/**
 * Build a complete signed list memo with current nonce.
 * Resolves the name to get the current nonce, signs, and returns the memo.
 */
export async function buildSignedListMemo(
  name: string,
  priceZats: number,
  network: Network = "testnet"
): Promise<{ memo: string; nonce: number }> {
  const reg = await resolve(name, network);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  const payload = listPayload(name, priceZats, nonce);
  const sig = adminSign(payload);
  return { memo: buildListMemo(name, priceZats, nonce, sig), nonce };
}

/**
 * Build a complete signed delist memo with current nonce.
 */
export async function buildSignedDelistMemo(
  name: string,
  network: Network = "testnet"
): Promise<{ memo: string; nonce: number }> {
  const reg = await resolve(name, network);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  const payload = delistPayload(name, nonce);
  const sig = adminSign(payload);
  return { memo: buildDelistMemo(name, nonce, sig), nonce };
}

/**
 * Build a complete signed release memo with current nonce.
 * Permanently removes a name registration from the indexer.
 */
export async function buildSignedReleaseMemo(
  name: string,
  network: Network = "testnet"
): Promise<{ memo: string; nonce: number }> {
  const reg = await resolve(name, network);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  const payload = releasePayload(name, nonce);
  const sig = adminSign(payload);
  return { memo: buildReleaseMemo(name, nonce, sig), nonce };
}

/**
 * Build a complete signed update memo with current nonce.
 */
export async function buildSignedUpdateMemo(
  name: string,
  newUa: string,
  network: Network = "testnet"
): Promise<{ memo: string; nonce: number }> {
  const reg = await resolve(name, network);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  const payload = updatePayload(name, newUa, nonce);
  const sig = adminSign(payload);
  return { memo: buildUpdateMemo(name, newUa, nonce, sig), nonce };
}

/**
 * Build a complete signed claim memo for an available name.
 */
export async function buildSignedClaimMemo(
  name: string,
  userUa: string,
  network: Network = "testnet"
): Promise<string> {
  const reg = await resolve(name, network);
  if (reg) throw new Error(`Name "${name}" is already registered.`);
  const payload = claimPayload(name, userUa);
  const sig = adminSign(payload);
  return buildClaimMemo(name, userUa, sig);
}

/**
 * Build a complete signed buy memo for a listed name.
 */
export async function buildSignedBuyMemo(
  name: string,
  buyerUa: string,
  network: Network = "testnet"
): Promise<string> {
  const reg = await resolve(name, network);
  if (!reg?.listing) throw new Error(`Name "${name}" is not listed for sale.`);
  const payload = buyPayload(name, buyerUa);
  const sig = adminSign(payload);
  return buildBuyMemo(name, buyerUa, sig);
}
