import { ZNS } from "zcashname-sdk";

const validationZns = new ZNS();

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(name: string): boolean {
  return validationZns.isValidName(name);
}

export function getSigningPayload(
  action: "claim" | "buy" | "update" | "list" | "delist" | "release",
  name: string,
  params: { address?: string; priceZats?: number; nonce?: number },
): string {
  try {
    switch (action) {
      case "claim":
        return validationZns.prepareClaim(name, params.address ?? "", 0).payload;
      case "buy":
        return validationZns.prepareBuy(name, params.address ?? "").payload;
      case "update":
        return validationZns.prepareUpdate(name, params.address ?? "", params.nonce ?? 0).payload;
      case "list":
        return validationZns.prepareList(name, params.priceZats ?? 0, params.nonce ?? 0).payload;
      case "delist":
        return validationZns.prepareDelist(name, params.nonce ?? 0).payload;
      case "release":
        return validationZns.prepareRelease(name, params.nonce ?? 0).payload;
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