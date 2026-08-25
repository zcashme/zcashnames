import { ZNS } from "zcashname-sdk";
import type { Listing, Network, Registration, ResolveName, NameAvailabilityState, ZnsEvent } from "@/lib/types";
import {
  validateAddress,
  isValidTransparentAddress,
  decodeTransparentAddress,
  type AddressStatus,
  type AddressValidationResult,
} from "@/lib/zns/address-validation";

const instances: Record<Network, ZNS> = {
  testnet: new ZNS({ network: "testnet", url: process.env.ZNS_TESTNET_RPC_URL }),
  mainnet: new ZNS({ network: "mainnet", url: process.env.ZNS_MAINNET_RPC_URL }),
};

export const getZns = (network: Network): ZNS => instances[network];
export { validateAddress, isValidTransparentAddress, decodeTransparentAddress };
export type { AddressStatus, AddressValidationResult };

//
// Pure name utilities — no side effects, no async. Used everywhere a name
// string needs to be validated, normalised, or priced.
//

// Must mirror SDK's isValidName regex — SDK exports it only as a ZNS instance
// method, not a free function, so we duplicate the regex here for client/hook use.
const NAME_RE = /^[a-z0-9]{1,62}$/;

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

export function filterRegistrations(
  registrations: Registration[],
  searchQuery: string,
): Registration[] {
  const index = buildExplorerSearchIndex(searchQuery);
  if (!index) return registrations;
  return registrations.filter((registration) =>
    matchesExplorerSearch(index, {
      names: [registration.name],
      txids: [
        registration.txid,
        registration.listing?.txid,
        registration.listing?.pendingBuy?.txid,
      ],
      addresses: [
        registration.address,
        registration.listing?.payTaddr,
        registration.listing?.pendingBuy?.buyer,
      ],
    }),
  );
}

export function filterListings(listings: Listing[], searchQuery: string): Listing[] {
  const index = buildExplorerSearchIndex(searchQuery);
  if (!index) return listings;
  return listings.filter((listing) =>
    matchesExplorerSearch(index, {
      names: [listing.name],
      txids: [listing.txid, listing.pendingBuy?.txid],
      addresses: [listing.payTaddr, listing.pendingBuy?.buyer],
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
      addresses: [event.ua],
    }),
  );
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

export interface CardProps {
  availabilityState: NameAvailabilityState;
  priceLabel?: string;
  usdLabel?: string;
}

export function buildCardProps(result: ResolveName): CardProps {
  switch (result.status) {
    case "available":
    case "protected": {
      const zec = result.claimCost.zec;
      return {
        availabilityState: result.status,
        priceLabel: `~${zec.toFixed(6)} ZEC`,
        usdLabel: formatUsdEquivalent(zec, null),
      };
    }
    case "listed":
      return {
        availabilityState: "forsale",
        priceLabel: `${result.listingPrice.zec} ZEC`,
        usdLabel: formatUsdEquivalent(result.listingPrice.zec, null),
      };
    case "registered":
      return { availabilityState: "unavailable" };
    case "blocked":
      return { availabilityState: "blocked" };
  }
}
