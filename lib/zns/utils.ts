import { ZNS } from "zcashname-sdk";
import type { Network, NameAvailabilityState, ResolveName, ZnsEvent } from "@/lib/types";
import { getMintConfig } from "@/lib/zns/mint-config";
import {
  validateAddress,
  isValidTransparentAddress,
  decodeTransparentAddress,
  type AddressStatus,
  type AddressValidationResult,
} from "@/lib/zns/address-validation";

//
// Resolver clients — one read-only zcashname-sdk (v0.13) instance per
// network, pointing at the network's Name Note resolver JSON-RPC endpoint.
//
// The SDK has no network option; the URL selects the deployment. Resolver
// URLs come from the environment:
//   ZNS_TESTNET_RESOLVER_URL / ZNS_MAINNET_RESOLVER_URL
//
const instances: Record<Network, ZNS> = {
  testnet: new ZNS({ url: process.env.ZNS_TESTNET_RESOLVER_URL ?? "" }),
  mainnet: new ZNS({ url: process.env.ZNS_MAINNET_RESOLVER_URL ?? "" }),
};

export const getZns = (network: Network): ZNS => instances[network];

/**
 * Verify the resolver is the one anchored to this deployment's Mint: the
 * viewing key it reports MUST equal the registry UFVK in mint-config.
 * Returns the status on success, null on any mismatch or error.
 */
export async function getVerifiedStatus(
  network: Network,
): Promise<{ syncedHeight: number; synced: boolean; registered: number } | null> {
  const { registryUfvk } = getMintConfig(network);
  if (!registryUfvk) return null;
  try {
    const status = await instances[network].status();
    if (status.viewingKey !== registryUfvk) return null;
    return {
      syncedHeight: status.syncedHeight,
      synced: status.synced,
      registered: status.registered,
    };
  } catch {
    return null;
  }
}

export { validateAddress, isValidTransparentAddress, decodeTransparentAddress };
export type { AddressStatus, AddressValidationResult };

//
// Pure name utilities — no side effects, no async. Used everywhere a name
// string needs to be validated, normalised, or priced.
//

// Must mirror SDK's isValidName regex — SDK exports it only as a ZNS instance
// method, not a free function, so we duplicate the regex here for client/hook use.
const NAME_RE = /^[a-z0-9]{1,63}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(name: string): boolean {
  return NAME_RE.test(name);
}

// Explorer / registration search. Name always uses a case-insensitive substring.
// Txids only participate when the query looks like hex (avoids "a" matching every
// hash). Addresses only participate when the query itself is a valid address:
// unified addresses exact-match, transparent/sapling still allow substrings.
const TXID_SEARCH_RE = /^(0x)?[0-9a-f]{8,64}$/i;
const FULL_TXID_RE = /^(0x)?[0-9a-f]{64}$/i;

export function isFullTxidQuery(value: string): boolean {
  return FULL_TXID_RE.test(value.trim());
}

export function isResolvedAddressQuery(value: string): boolean {
  const status = validateAddress(value.trim()).status;
  return status === "unified" || status === "sapling" || status === "transparent";
}

function txidSearchNeedle(query: string): string | null {
  const trimmed = query.trim();
  if (!TXID_SEARCH_RE.test(trimmed)) return null;
  return trimmed.toLowerCase().replace(/^0x/, "");
}

function matchesNameField(value: string | null | undefined, needle: string) {
  return (value ?? "").toLowerCase().includes(needle);
}

function matchesTxidField(value: string | null | undefined, needle: string | null) {
  if (!needle || !value) return false;
  return value.toLowerCase().includes(needle);
}

function matchesAddressField(
  value: string | null | undefined,
  addressNeedle: string,
  addressStatus: AddressStatus,
) {
  if (!value) return false;
  if (addressStatus === "unified") return value.toLowerCase() === addressNeedle;
  if (addressStatus === "sapling" || addressStatus === "transparent") {
    return value.toLowerCase().includes(addressNeedle);
  }
  return false;
}

type ExplorerSearchIndex = {
  nameNeedle: string;
  txidNeedle: string | null;
  addressNeedle: string;
  addressStatus: AddressStatus;
};

function buildExplorerSearchIndex(query: string): ExplorerSearchIndex | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return {
    nameNeedle: trimmed.toLowerCase(),
    txidNeedle: txidSearchNeedle(trimmed),
    addressNeedle: trimmed.toLowerCase(),
    addressStatus: validateAddress(trimmed).status,
  };
}

function matchesExplorerSearch(
  index: ExplorerSearchIndex,
  fields: {
    names?: Array<string | null | undefined>;
    txids?: Array<string | null | undefined>;
    addresses?: Array<string | null | undefined>;
  },
) {
  if (fields.names?.some((name) => matchesNameField(name, index.nameNeedle))) return true;
  if (fields.txids?.some((txid) => matchesTxidField(txid, index.txidNeedle))) return true;
  if (fields.addresses?.some((address) => matchesAddressField(address, index.addressNeedle, index.addressStatus))) {
    return true;
  }
  return false;
}

export function filterRegistrations<T extends { name: string; address: string; txid: string }>(
  registrations: T[],
  searchQuery: string,
): T[] {
  const index = buildExplorerSearchIndex(searchQuery);
  if (!index) return registrations;
  return registrations.filter((registration) =>
    matchesExplorerSearch(index, {
      names: [registration.name],
      txids: [registration.txid],
      addresses: [registration.address],
    }),
  );
}

export function filterEvents(events: ZnsEvent[], searchQuery: string): ZnsEvent[] {
  const index = buildExplorerSearchIndex(searchQuery);
  if (!index) return events;
  return events.filter((event) =>
    matchesExplorerSearch(index, {
      names: [event.name],
      txids: [event.txid],
      addresses: [event.address],
    }),
  );
}

/**
 * Tri-state availability from a resolver record. The Mint owns claim
 * eligibility (protected names, access codes); from the resolver's public
 * view a name is simply registered or not.
 */
export function registrationStatus(
  reg: { lastAction?: string } | null | undefined,
): NameAvailabilityState {
  return reg ? "registered" : "available";
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

export interface CardProps {
  availabilityState: NameAvailabilityState;
  priceLabel?: string;
  usdLabel?: string;
}

export function buildCardProps(result: ResolveName): CardProps {
  switch (result.status) {
    case "available":
      return {
        availabilityState: "available",
        priceLabel: `~${result.claimCost.zec.toFixed(6)} ZEC`,
        usdLabel: formatUsdEquivalent(result.claimCost.zec, null),
      };
    case "registered":
      return { availabilityState: "registered" };
    case "blocked":
      return { availabilityState: "blocked" };
  }
}
