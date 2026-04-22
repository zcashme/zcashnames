import { ZNS } from "zcashname-sdk";

const validationZns = new ZNS();

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(name: string): boolean {
  return validationZns.isValidName(name);
}

/* ── Address validation ─────────────────────────────────────────────── */

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

  if (validationZns.isValidUnifiedAddress(t))
    return { status: "unified", warning: "" };

  if (/^(zs1|ztestsapling1)/i.test(t))
    return { status: "sapling", warning: "Sapling address - Unified preferred." };

  if (/^[tT](1|3|m|2)[A-Za-z0-9]{20,}$/.test(t))
    return { status: "transparent", warning: "Transparent addresses leak metadata." };

  return { status: "invalid", warning: "Invalid address format." };
}

/* ── Pricing ─────────────────────────────────────────────────────────── */

export type Network = "testnet" | "mainnet";

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