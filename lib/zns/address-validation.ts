import { bech32, bech32m } from "bech32";

export type AddressStatus = "unified" | "sapling" | "transparent" | "viewkey" | "tex" | "invalid";

export interface AddressValidationResult {
  status: AddressStatus;
  warning: string;
}

function isViewingKey(address: string): boolean {
  return /^(uview1|utestview1|zsview1|ztestsaplingview1)/i.test(address);
}

function isTex(address: string): boolean {
  const value = address.toLowerCase();
  if (!(value.startsWith("tex1") || value.startsWith("textest1"))) return false;
  try {
    const decoded = bech32m.decode(value, 100);
    return decoded.prefix === "tex" || decoded.prefix === "textest";
  } catch {
    return false;
  }
}

function isUnified(address: string): boolean {
  const value = address.toLowerCase();
  if (!(value.startsWith("u1") || value.startsWith("utest1"))) return false;
  try {
    const decoded = bech32m.decode(value, 300);
    return decoded.prefix === "u" || decoded.prefix === "utest";
  } catch {
    return false;
  }
}

function isSapling(address: string): boolean {
  const value = address.toLowerCase();
  if (!(value.startsWith("zs1") || value.startsWith("ztestsapling1"))) return false;
  try {
    const decoded = bech32.decode(value, 200);
    return decoded.prefix === "zs" || decoded.prefix === "ztestsapling";
  } catch {
    return false;
  }
}

function isTransparent(address: string): boolean {
  return /^[tT](1|3|m|2)[A-Za-z0-9]{20,}$/.test(address);
}

export function validateAddress(address: string): AddressValidationResult {
  const value = String(address ?? "").trim();
  if (!value) return { status: "invalid", warning: "" };
  if (isViewingKey(value)) return { status: "viewkey", warning: "Viewing keys are not accepted." };
  if (isTex(value)) return { status: "tex", warning: "TEX addresses are not supported." };
  if (isUnified(value)) return { status: "unified", warning: "" };
  if (isSapling(value)) return { status: "sapling", warning: "Sapling address - Unified preferred." };
  if (isTransparent(value)) return { status: "transparent", warning: "Transparent addresses leak metadata." };
  return { status: "invalid", warning: "Invalid address format." };
}
