import { ZNS } from "zcashname-sdk";
import type { Network } from "./name";
import type { Registration } from "zcashname-sdk";

export type {
  Registration,
  Listing,
  Event,
  EventsFilter,
  CompletedAction,
} from "zcashname-sdk";

const ZNS_RPC_URLS: Record<Network, string> = {
  testnet: process.env.ZNS_TESTNET_RPC_URL ?? "https://light.zcash.me/zns-testnet",
  mainnet: process.env.ZNS_MAINNET_RPC_URL ?? "https://light.zcash.me/zns-mainnet-test",
};

const instances = new Map<Network, ZNS>();

export function getZns(network: Network): ZNS {
  const cached = instances.get(network);
  if (cached) return cached;
  const zns = new ZNS({ network, url: ZNS_RPC_URLS[network] });
  instances.set(network, zns);
  return zns;
}

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

export function registrationStatus(
  reg: Registration | null,
): "available" | "registered" | "forsale" {
  if (!reg) return "available";
  if (reg.listing) return "forsale";
  return "registered";
}

export {
  toBase64Url,
  buildZcashUri,
  decodeBase64UrlToUtf8,
  parseZip321Uri,
} from "../payment/zip321";
