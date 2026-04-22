/**
 * Server-only: ZNS admin signing operations.
 * DO NOT IMPORT IN CLIENT COMPONENTS.
 *
 * Handles Ed25519 signing of name operations using the ZNS admin key.
 * Requires ZNS_SIGNING_KEY_PATH environment variable (server-side only).
 */

import crypto from "node:crypto";
import type { Network } from "./name";
import { getZns, fetchClaimCost } from "./client";
import type { CompletedAction } from "./client";

interface Signable {
  readonly payload: string;
  complete(signature: string, userPubkey?: string): CompletedAction;
}

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

function completeWithAdmin(prepared: Signable): CompletedAction {
  return prepared.complete(adminSign(prepared.payload));
}

export async function buildSignedClaimAction(
  name: string,
  userUa: string,
  network: Network = "testnet",
): Promise<CompletedAction> {
  const zns = getZns(network);
  const reg = await zns.resolveName(name);
  if (reg) throw new Error(`Name "${name}" is already registered.`);
  const cost = await fetchClaimCost(name, network);
  if (cost == null) throw new Error("Pricing unavailable - indexer may be down.");
  return completeWithAdmin(zns.prepareClaim(name, userUa, cost));
}

export async function buildSignedBuyAction(
  name: string,
  buyerUa: string,
  network: Network = "testnet",
): Promise<CompletedAction> {
  const zns = getZns(network);
  const reg = await zns.resolveName(name);
  if (!reg?.listing) throw new Error(`Name "${name}" is not listed for sale.`);
  return completeWithAdmin(zns.prepareBuy(name, buyerUa));
}

export async function buildSignedListAction(
  name: string,
  priceZats: number,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = getZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareList(name, priceZats, nonce)), nonce };
}

export async function buildSignedDelistAction(
  name: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = getZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareDelist(name, nonce)), nonce };
}

export async function buildSignedReleaseAction(
  name: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = getZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareRelease(name, nonce)), nonce };
}

export async function buildSignedUpdateAction(
  name: string,
  newUa: string,
  network: Network = "testnet",
): Promise<{ action: CompletedAction; nonce: number }> {
  const zns = getZns(network);
  const reg = await zns.resolveName(name);
  if (!reg) throw new Error(`Name "${name}" is not registered.`);
  const nonce = reg.nonce + 1;
  return { action: completeWithAdmin(zns.prepareUpdate(name, newUa, nonce)), nonce };
}
