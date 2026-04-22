import { ZNS } from "zcashname-sdk";

export type {
  Registration,
  Listing,
  Event,
  EventsFilter,
  CompletedAction,
} from "zcashname-sdk";

/* ── Network type ───────────────────────────────────────────────────── */

export type Network = "testnet" | "mainnet";

const ZNS_RPC_URLS: Record<Network, string> = {
  testnet: process.env.ZNS_TESTNET_RPC_URL ?? "https://light.zcash.me/zns-testnet",
  mainnet: process.env.ZNS_MAINNET_RPC_URL ?? "https://light.zcash.me/zns-mainnet-test",
};

/* ── Single ZNS instance per network ────────────────────────────────── */

const instances = new Map<Network, ZNS>();

export function getZns(network: Network): ZNS {
  const cached = instances.get(network);
  if (cached) return cached;
  const zns = new ZNS({ network, url: ZNS_RPC_URLS[network] });
  instances.set(network, zns);
  return zns;
}

/* ── Claim cost (instance-dependent: needs RPC for pricing) ─────────── */

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

/* ── Signing payloads (instance-dependent: needs registry address) ──── */

export function getSigningPayload(
  action: "claim" | "buy" | "update" | "list" | "delist" | "release",
  name: string,
  params: { address?: string; priceZats?: number; nonce?: number },
  network: Network = "testnet",
): string {
  const zns = getZns(network);
  try {
    switch (action) {
      case "claim":
        return zns.prepareClaim(name, params.address ?? "", 0).payload;
      case "buy":
        return zns.prepareBuy(name, params.address ?? "").payload;
      case "update":
        return zns.prepareUpdate(name, params.address ?? "", params.nonce ?? 0).payload;
      case "list":
        return zns.prepareList(name, params.priceZats ?? 0, params.nonce ?? 0).payload;
      case "delist":
        return zns.prepareDelist(name, params.nonce ?? 0).payload;
      case "release":
        return zns.prepareRelease(name, params.nonce ?? 0).payload;
    }
  } catch {
    return buildRawPayload(action, name, params);
  }
}

function buildRawPayload(
  action: "claim" | "buy" | "update" | "list" | "delist" | "release",
  name: string,
  params: { address?: string; priceZats?: number; nonce?: number },
): string {
  switch (action) {
    case "claim":
      return `CLAIM:${name}:${params.address ?? ""}`;
    case "buy":
      return `BUY:${name}:${params.address ?? ""}`;
    case "update":
      return `UPDATE:${name}:${params.address ?? ""}:${params.nonce ?? ""}`;
    case "list":
      return `LIST:${name}:${params.priceZats ?? ""}:${params.nonce ?? ""}`;
    case "delist":
      return `DELIST:${name}:${params.nonce ?? ""}`;
    case "release":
      return `RELEASE:${name}:${params.nonce ?? ""}`;
  }
}

/* ── Address validation (instance-dependent: uses SDK bech32m check) ── */

export type AddressStatus = "unified" | "sapling" | "transparent" | "viewkey" | "tex" | "invalid";

export interface AddressValidationResult {
  status: AddressStatus;
  warning: string;
}

const VIEWKEY_RE = /^(uview1|utestview1|zsview1|ztestsaplingview1)/i;

export function validateAddress(address: string, network: Network = "testnet"): AddressValidationResult {
  const t = String(address ?? "").trim();
  if (!t) return { status: "invalid", warning: "" };

  if (VIEWKEY_RE.test(t))
    return { status: "viewkey", warning: "Viewing keys are not accepted." };

  if (/^(tex1|textest1)/i.test(t))
    return { status: "tex", warning: "TEX addresses are not supported." };

  if (getZns(network).isValidUnifiedAddress(t))
    return { status: "unified", warning: "" };

  if (/^(zs1|ztestsapling1)/i.test(t))
    return { status: "sapling", warning: "Sapling address - Unified preferred." };

  if (/^[tT](1|3|m|2)[A-Za-z0-9]{20,}$/.test(t))
    return { status: "transparent", warning: "Transparent addresses leak metadata." };

  return { status: "invalid", warning: "Invalid address format." };
}

/* ── Pure functions (no instance needed) ─────────────────────────────── */

const NAME_RE = /^[a-z0-9]{1,62}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(name: string): boolean {
  return NAME_RE.test(name);
}

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

export function formatUsdEquivalent(
  zecAmount: number,
  usdPerZec: number | null
): string {
  if (usdPerZec == null) return "";
  const usd = zecAmount * usdPerZec;
  return `$${usd.toFixed(2)} USD`;
}