import { bech32, bech32m } from "bech32";

export type AddressStatus = "unified" | "sapling" | "transparent" | "viewkey" | "tex" | "invalid";

export interface AddressValidationResult {
  status: AddressStatus;
  warning: string;
}

export type TransparentNetwork = "mainnet" | "testnet";

export type TransparentAddressKind = "p2pkh" | "p2sh";

export type TransparentAddressInfo = {
  network: TransparentNetwork;
  kind: TransparentAddressKind;
};

// Zcash transparent Base58Check version prefixes (2 bytes) → network/kind.
// Spec: Transparent Payment Addresses (Zcash protocol / ZIP-style docs).
const TADDR_VERSIONS: Record<string, TransparentAddressInfo> = {
  "1cb8": { network: "mainnet", kind: "p2pkh" }, // t1
  "1cbd": { network: "mainnet", kind: "p2sh" }, // t3
  "1d25": { network: "testnet", kind: "p2pkh" }, // tm
  "1cba": { network: "testnet", kind: "p2sh" }, // tn
};

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

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

/** Decode Base58 into raw bytes (null on invalid alphabet). */
function base58Decode(str: string): Uint8Array | null {
  if (!str) return null;
  for (let i = 0; i < str.length; i++) {
    if (BASE58_ALPHABET.indexOf(str[i]!) < 0) return null;
  }

  const bytes: number[] = [0];
  for (let i = 0; i < str.length; i++) {
    let carry = BASE58_ALPHABET.indexOf(str[i]!);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  // Preserve leading zero bytes encoded as leading '1's.
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    bytes.push(0);
  }

  bytes.reverse();
  return new Uint8Array(bytes);
}

/** Pure SHA-256 (sync, browser + Node safe). */
function sha256(data: Uint8Array): Uint8Array {
  // Minimal SHA-256 — only used for Base58Check address validation.
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  const len = data.length;
  const bitLenHi = Math.floor(len / 0x20000000);
  const bitLenLo = (len << 3) >>> 0;
  const withPad = len + 1;
  const padLen = (withPad % 64 <= 56 ? 56 : 120) - (withPad % 64);
  const total = withPad + padLen + 8;
  const buf = new Uint8Array(total);
  buf.set(data);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(total - 8, bitLenHi, false);
  view.setUint32(total - 4, bitLenLo, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let i = 0; i < total; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15]!, 7) ^ rotr(w[j - 15]!, 18) ^ (w[j - 15]! >>> 3);
      const s1 = rotr(w[j - 2]!, 17) ^ rotr(w[j - 2]!, 19) ^ (w[j - 2]! >>> 10);
      w[j] = (w[j - 16]! + s0 + w[j - 7]! + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[j]! + w[j]!) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function doubleSha256(data: Uint8Array): Uint8Array {
  return sha256(sha256(data));
}

/**
 * Decode a Zcash transparent address with full Base58Check verification.
 * Returns null if the alphabet, length, checksum, or version prefix is invalid.
 */
export function decodeTransparentAddress(address: string): TransparentAddressInfo | null {
  const value = String(address ?? "").trim();
  if (!value) return null;

  // Quick reject before base58 work.
  if (!/^[tT](1|3|m|n)/.test(value)) return null;
  if (value.length < 26 || value.length > 36) return null;

  const decoded = base58Decode(value);
  // version(2) + hash160(20) + checksum(4) = 26
  if (!decoded || decoded.length !== 26) return null;

  const payload = decoded.subarray(0, 22);
  const checksum = decoded.subarray(22);
  const hash = doubleSha256(payload);
  if (
    hash[0] !== checksum[0] ||
    hash[1] !== checksum[1] ||
    hash[2] !== checksum[2] ||
    hash[3] !== checksum[3]
  ) {
    return null;
  }

  const versionKey = `${payload[0]!.toString(16).padStart(2, "0")}${payload[1]!.toString(16).padStart(2, "0")}`;
  return TADDR_VERSIONS[versionKey] ?? null;
}

/**
 * True when `address` is a checksum-valid transparent Zcash address.
 * When `network` is set, only that network's prefixes are accepted
 * (mainnet: t1/t3, testnet: tm/tn).
 */
export function isValidTransparentAddress(
  address: string,
  network?: TransparentNetwork,
): boolean {
  const info = decodeTransparentAddress(address);
  if (!info) return false;
  if (network && info.network !== network) return false;
  return true;
}

function isTransparent(address: string): boolean {
  return decodeTransparentAddress(address) !== null;
}

export function validateAddress(address: string): AddressValidationResult {
  const value = String(address ?? "").trim();
  if (!value) return { status: "invalid", warning: "" };
  if (isViewingKey(value)) return { status: "viewkey", warning: "Viewing keys are not accepted." };
  if (isTex(value)) return { status: "tex", warning: "TEX addresses are not supported." };
  if (isUnified(value)) return { status: "unified", warning: "" };
  if (isSapling(value)) return { status: "sapling", warning: "Sapling address - Unified preferred." };
  if (isTransparent(value)) {
    return { status: "transparent", warning: "Transparent addresses leak metadata." };
  }
  // Prefix looks like a t-addr but failed Base58Check — surface a clear error.
  if (/^[tT](1|3|m|n)/.test(value)) {
    return {
      status: "invalid",
      warning: "Invalid transparent address checksum or format.",
    };
  }
  return { status: "invalid", warning: "Invalid address format." };
}
