import { ZNS } from "zcashname-sdk";
import { bech32, bech32m } from "bech32";
import type { Network, Registration, ResolveName, NameAvailabilityState } from "@/lib/types";

const instances: Record<Network, ZNS> = {
  testnet: new ZNS({ network: "testnet", url: process.env.ZNS_TESTNET_RPC_URL }),
  mainnet: new ZNS({ network: "mainnet", url: process.env.ZNS_MAINNET_RPC_URL }),
};

export const getZns = (network: Network): ZNS => instances[network];

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

function isViewingKey(a: string): boolean {
  return /^(uview1|utestview1|zsview1|ztestsaplingview1)/i.test(a);
}

function isTex(a: string): boolean {
  const s = a.toLowerCase();
  if (!(s.startsWith("tex1") || s.startsWith("textest1"))) return false;
  try {
    const dec = bech32m.decode(s, 100);
    return dec.prefix === "tex" || dec.prefix === "textest";
  } catch { return false; }
}

function isUnified(a: string): boolean {
  const s = a.toLowerCase();
  if (!(s.startsWith("u1") || s.startsWith("utest1"))) return false;
  try {
    const dec = bech32m.decode(s, 300);
    return dec.prefix === "u" || dec.prefix === "utest";
  } catch { return false; }
}

function isSapling(a: string): boolean {
  const s = a.toLowerCase();
  if (!(s.startsWith("zs1") || s.startsWith("ztestsapling1"))) return false;
  try {
    const dec = bech32.decode(s, 200);
    return dec.prefix === "zs" || dec.prefix === "ztestsapling";
  } catch { return false; }
}

function isTransparent(a: string): boolean {
  return /^[tT](1|3|m|2)[A-Za-z0-9]{20,}$/.test(a);
}

export function validateAddress(address: string): AddressValidationResult {
  const t = String(address ?? "").trim();
  if (!t) return { status: "invalid", warning: "" };
  if (isViewingKey(t)) return { status: "viewkey", warning: "Viewing keys are not accepted." };
  if (isTex(t))         return { status: "tex", warning: "TEX addresses are not supported." };
  if (isUnified(t))     return { status: "unified", warning: "" };
  if (isSapling(t))     return { status: "sapling", warning: "Sapling address - Unified preferred." };
  if (isTransparent(t)) return { status: "transparent", warning: "Transparent addresses leak metadata." };
  return { status: "invalid", warning: "Invalid address format." };
}

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
