import { ZNS } from "zcashname-sdk";
import type { Network, Registration, ResolveName, NameAvailabilityState } from "@/lib/types";
import {
  validateAddress,
  type AddressStatus,
  type AddressValidationResult,
} from "@/lib/zns/address-validation";

const instances: Record<Network, ZNS> = {
  testnet: new ZNS({ network: "testnet", url: process.env.ZNS_TESTNET_RPC_URL }),
  mainnet: new ZNS({ network: "mainnet", url: process.env.ZNS_MAINNET_RPC_URL }),
};

export const getZns = (network: Network): ZNS => instances[network];
export { validateAddress };
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

// Filter a registration list by name substring, or by exact-match for unified
// addresses (transparent/sapling substrings still match against the address
// column). Case-insensitive.
export function filterRegistrations(
  registrations: Registration[],
  searchQuery: string,
): Registration[] {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return registrations;
  const isUAddress = validateAddress(q).status === "unified";
  return registrations.filter((registration) =>
    registration.name.toLowerCase().includes(q) ||
    (!isUAddress && registration.address.toLowerCase().includes(q)) ||
    (isUAddress && registration.address.toLowerCase() === q)
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
    case "reserved": {
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
