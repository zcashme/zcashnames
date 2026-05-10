import { ZNS } from "zcashname-sdk";
import type { Network } from "@/lib/types";

//
// ZNS SDK instance cache.
//
// The SDK wraps the ZNS JSON-RPC indexer (light.zcash.me). Every call to
// getZns() returns the same singleton per network so we don't re-create
// connections. getVerifiedZns() additionally fetches and caches the indexer's
// admin public key — required before building any signed transaction.
//

const ZNS_RPC_URLS: Record<Network, string> = {
  testnet: process.env.ZNS_TESTNET_RPC_URL ?? "https://light.zcash.me/zns-testnet",
  mainnet: process.env.ZNS_MAINNET_RPC_URL ?? "https://light.zcash.me/zns-mainnet-test",
};

const instances = new Map<Network, ZNS>();
const verified = new Set<Network>();

export function getZns(network: Network): ZNS {
  const cached = instances.get(network);
  if (cached) return cached;
  const zns = new ZNS({ network, url: ZNS_RPC_URLS[network] });
  instances.set(network, zns);
  return zns;
}

// Signing transactions requires the admin public key, which we fetch once
// per network via zns.verify() and cache indefinitely.
export async function getVerifiedZns(network: Network): Promise<ZNS> {
  const zns = getZns(network);
  if (!verified.has(network)) {
    await zns.verify();
    verified.add(network);
  }
  return zns;
}

//
// Claim cost lookup. Pricing is based on name length — shorter names cost more.
// Fetches the indexer's current pricing table, then asks the SDK for the cost.
//
export async function fetchClaimCost(
  name: string,
  network: Network = "testnet",
): Promise<number | null> {
  try {
    const zns = getZns(network);
    const s = await zns.status();
    if (!s.pricing) return null;
    return zns.claimCost(name.length, s.pricing);
  } catch {
    return null;
  }
}

//
// Zcash address classification. Only unified addresses (u1… / utest1…) are
// accepted for name registrations — they support both transparent and shielded
// receivers. Everything else gets a warning explaining why.
//

export type AddressStatus = "unified" | "sapling" | "transparent" | "viewkey" | "tex" | "invalid";

export interface AddressValidationResult {
  status: AddressStatus;
  warning: string;
}

const VIEWKEY_RE = /^(uview1|utestview1|zsview1|ztestsaplingview1)/i;

export function validateAddress(address: string): AddressValidationResult {
  const t = String(address ?? "").trim();
  if (!t) return { status: "invalid", warning: "" };

  if (VIEWKEY_RE.test(t))
    return { status: "viewkey", warning: "Viewing keys are not accepted." };

  if (/^(tex1|textest1)/i.test(t))
    return { status: "tex", warning: "TEX addresses are not supported." };

  if (t.startsWith("utest1") || t.startsWith("u1"))
    return { status: "unified", warning: "" };

  if (/^(zs1|ztestsapling1)/i.test(t))
    return { status: "sapling", warning: "Sapling address - Unified preferred." };

  if (/^[tT](1|3|m|2)[A-Za-z0-9]{20,}$/.test(t))
    return { status: "transparent", warning: "Transparent addresses leak metadata." };

  return { status: "invalid", warning: "Invalid address format." };
}

//
// Pure name utilities — no side effects, no async. Used everywhere a name
// string needs to be validated, normalised, or priced.
//

const NAME_RE = /^[a-z0-9]{1,62}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(name: string): boolean {
  return NAME_RE.test(name);
}

// Quick tri-state check from the SDK registration object. Does NOT look up
// listings separately — callers that need listing data use resolveName().
export function registrationStatus(
  reg: { listing: unknown } | null,
): "available" | "registered" | "forsale" {
  if (!reg) return "available";
  if (reg.listing) return "forsale";
  return "registered";
}

export function zatsToZec(zats: number): number {
  return zats / 100_000_000;
}

export function roundZec(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function formatUsdEquivalent(
  zecAmount: number,
  usdPerZec: number | null
): string {
  if (usdPerZec == null) return "";
  const usd = zecAmount * usdPerZec;
  return `$${usd.toFixed(2)} USD`;
}
