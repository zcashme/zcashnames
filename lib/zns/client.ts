/**
 * ZNS JSON-RPC client for the Rust indexer.
 * Provides RPC transport, name queries, memo builders, and signing payload constructors.
 * For server-side admin signing operations, see admin.ts.
 */

import type { Network } from "./name";

const ZNS_RPC_URLS: Record<Network, string> = {
  testnet: process.env.ZNS_TESTNET_RPC_URL ?? "https://light.zcash.me/zns-testnet",
  mainnet: process.env.ZNS_MAINNET_RPC_URL ?? "https://light.zcash.me/zns-mainnet-test",
};
const RPC_TIMEOUT_MS = 6000;

/* ══════════════════════════════════════════════════════════════════════════
   Types (mirror the indexer's JSON-RPC response shapes - DO NOT CHANGE)
   ══════════════════════════════════════════════════════════════════════ */

export type ZnsListing = {
  name: string;
  price: number; // zatoshis
  nonce: number;
  txid: string;
  height: number;
  signature: string;
};

export type ZnsRegistration = {
  name: string;
  address: string;
  txid: string;
  height: number;
  nonce: number;
  signature: string | null;
  last_action?: "CLAIM" | "UPDATE" | "DELIST" | "BUY";
  pubkey?: string | null;
  listing: ZnsListing | null;
};

export type ZnsPricing = {
  nonce: number;
  height: number;
  tiers: number[]; // zatoshis, indexed by name length (0 = 1-char)
};

export type ZnsStatus = {
  synced_height: number;
  admin_pubkey: string;
  uivk: string;
  registered: number;
  listed: number;
  pricing: ZnsPricing | null;
};

export type ZnsEvent = {
  id: number;
  name: string; // empty string for SETPRICE events
  action: "CLAIM" | "BUY" | "LIST" | "DELIST" | "UPDATE" | "RELEASE" | "SETPRICE";
  ua: string | null;
  txid: string;
  height: number;
  nonce: number | null;
  price: number | null; // zatoshis, present on LIST events
  signature: string;
  pubkey?: string | null;
};

export type ZnsError = {
  code: number;
  message: string;
};

/* ══════════════════════════════════════════════════════════════════════════
   JSON-RPC transport
   ══════════════════════════════════════════════════════════════════════ */

let rpcId = 0;

export async function znsRpc<T>(
  method: string,
  params: Record<string, unknown> = {},
  network: Network = "testnet"
): Promise<T> {
  rpcId += 1;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const res = await fetch(ZNS_RPC_URLS[network], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: rpcId, method, params }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`ZNS RPC HTTP ${res.status}`);

    const envelope = (await res.json()) as {
      result?: T;
      error?: ZnsError;
    };

    if (envelope.error) {
      const err = new Error(envelope.error.message) as Error & { code: number };
      err.code = envelope.error.code;
      throw err;
    }

    return envelope.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   High-level queries
   ══════════════════════════════════════════════════════════════════════ */

export async function resolve(query: string, network: Network = "testnet"): Promise<ZnsRegistration | null> {
  return znsRpc<ZnsRegistration | null>("resolve", { query }, network);
}

export async function listForSale(network: Network = "testnet"): Promise<ZnsListing[]> {
  const result = await znsRpc<{ listings: ZnsListing[] }>("list_for_sale", {}, network);
  return result.listings;
}

export async function status(network: Network = "testnet"): Promise<ZnsStatus> {
  return znsRpc<ZnsStatus>("status", {}, network);
}

export async function events(
  params: { name?: string; action?: string; since_height?: number; limit?: number; offset?: number } = {},
  network: Network = "testnet"
): Promise<{ events: ZnsEvent[]; total: number }> {
  return znsRpc<{ events: ZnsEvent[]; total: number }>("events", params as Record<string, unknown>, network);
}

/**
 * Fetch claim cost (in zatoshis) from the indexer's dynamic pricing.
 * Falls back to null if pricing isn't set or the indexer is unreachable.
 */
export async function fetchClaimCost(
  name: string,
  network: Network = "testnet"
): Promise<number | null> {
  try {
    const s = await status(network);
    if (!s.pricing?.tiers?.length) return null;
    const tiers = s.pricing.tiers;
    const idx = Math.min(name.length - 1, tiers.length - 1);
    return tiers[idx];
  } catch {
    return null;
  }
}

/** Name status derived from a resolve result. */
export function registrationStatus(
  reg: ZnsRegistration | null
): "available" | "registered" | "forsale" {
  if (!reg) return "available";
  if (reg.listing) return "forsale";
  return "registered";
}

/* ══════════════════════════════════════════════════════════════════════════
   Memo builders - produce 512-byte Orchard memos for on-chain name operations
   ══════════════════════════════════════════════════════════════════════ */

export function buildClaimMemo(name: string, ua: string, signature: string): string {
  return `ZNS:CLAIM:${name}:${ua}:${signature}`;
}

export function buildBuyMemo(name: string, buyerUa: string, signature: string): string {
  return `ZNS:BUY:${name}:${buyerUa}:${signature}`;
}

export function buildListMemo(
  name: string,
  price: number,
  nonce: number,
  signature: string
): string {
  return `ZNS:LIST:${name}:${price}:${nonce}:${signature}`;
}

export function buildDelistMemo(
  name: string,
  nonce: number,
  signature: string
): string {
  return `ZNS:DELIST:${name}:${nonce}:${signature}`;
}

export function buildReleaseMemo(
  name: string,
  nonce: number,
  signature: string
): string {
  return `ZNS:RELEASE:${name}:${nonce}:${signature}`;
}

export function buildUpdateMemo(
  name: string,
  newUa: string,
  nonce: number,
  signature: string
): string {
  return `ZNS:UPDATE:${name}:${newUa}:${nonce}:${signature}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Signing payloads - canonical strings that get Ed25519-signed (server-side)
   ══════════════════════════════════════════════════════════════════════ */

export function claimPayload(name: string, ua: string): string {
  return `CLAIM:${name}:${ua}`;
}

export function buyPayload(name: string, buyerUa: string): string {
  return `BUY:${name}:${buyerUa}`;
}

export function listPayload(name: string, price: number, nonce: number): string {
  return `LIST:${name}:${price}:${nonce}`;
}

export function delistPayload(name: string, nonce: number): string {
  return `DELIST:${name}:${nonce}`;
}

export function releasePayload(name: string, nonce: number): string {
  return `RELEASE:${name}:${nonce}`;
}

export function updatePayload(name: string, newUa: string, nonce: number): string {
  return `UPDATE:${name}:${newUa}:${nonce}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   ZIP-321 payment URI helpers - re-exported from lib/payment/zip321.ts
   ══════════════════════════════════════════════════════════════════════ */

export {
  toBase64Url,
  buildZcashUri,
  decodeBase64UrlToUtf8,
  parseZip321Uri,
} from "../payment/zip321";
