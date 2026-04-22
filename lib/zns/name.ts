/**
 * ZNS name helpers - normalization, validation, pricing, and formatting.
 * Name rules aligned with ZNS indexer (memo.rs validate_name):
 * - 1–62 characters, lowercase alphanumeric only (a-z, 0-9)
 */

const VALID_NAME_PATTERN = /^[a-z0-9]{1,62}$/;

function stripKnownSuffix(name: string): string {
  return String(name).replace(/\.(zcash|zec)$/i, "");
}

function applySuffix(name: string, suffix: string): string {
  return `${stripKnownSuffix(name)}${suffix}`;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isValidUsername(name: string): boolean {
  return VALID_NAME_PATTERN.test(name);
}

/* ── Address validation ─────────────────────────────────────────────── */

const BECH32_CHARS = /^[023456789acdefghjklmnpqrstuvwxyz]+$/i;

function getBech32Payload(address: string): string {
  const lo = address.toLowerCase();
  const i = lo.indexOf("1");
  if (i <= 0 || i === lo.length - 1) return "";
  return lo.slice(i + 1);
}

function isBech32Payload(value: string, minLength = 10): boolean {
  return BECH32_CHARS.test(value) && value.length >= minLength;
}

export interface AddressValidationResult {
  valid: boolean;
  warning: string;
  rejected: boolean;
}

export function validateAddress(address: string): AddressValidationResult {
  const t = String(address ?? "").trim();
  if (!t) return { valid: false, warning: "", rejected: false };
  const lo = t.toLowerCase();
  if (/^(uview1|utestview1|zsview1|ztestsaplingview1)/i.test(t))
    return { valid: false, warning: "Viewing keys are not accepted.", rejected: true };
  if ((lo.startsWith("tex1") || lo.startsWith("textest1")) && isBech32Payload(getBech32Payload(lo), 20))
    return { valid: false, warning: "TEX addresses are not supported.", rejected: true };
  if ((lo.startsWith("u1") || lo.startsWith("utest1")) && isBech32Payload(getBech32Payload(lo), 60))
    return { valid: true, warning: "", rejected: false };
  if ((lo.startsWith("zs1") || lo.startsWith("ztestsapling1")) && isBech32Payload(getBech32Payload(lo), 20))
    return { valid: true, warning: "Sapling address - Unified preferred.", rejected: false };
  if (/^[tT](1|3|m|2)[A-Za-z0-9]{20,}$/.test(t))
    return { valid: true, warning: "Transparent addresses leak metadata.", rejected: false };
  return { valid: false, warning: "Invalid address format.", rejected: true };
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
