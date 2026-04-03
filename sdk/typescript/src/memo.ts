import { isValidName } from "./validation.js";

function requireName(name: string): void {
  if (!isValidName(name)) throw new Error(`Invalid name: ${name}`);
}

function requireAddress(address: string, label: string): void {
  if (!address || !address.trim()) throw new Error(`${label} must not be empty`);
}

// ── Signing payloads ────────────────────────────────────────────────────────

export function claimPayload(name: string, ua: string): string {
  return `CLAIM:${name}:${ua}`;
}

export function buyPayload(name: string, buyerUa: string): string {
  return `BUY:${name}:${buyerUa}`;
}

export function listPayload(name: string, price: number, nonce: number): string {
  return `LIST:${name}:${price}:${nonce}`;
}

export function delistPayload(name: string, nonce: number): string {
  return `DELIST:${name}:${nonce}`;
}

export function releasePayload(name: string, nonce: number): string {
  return `RELEASE:${name}:${nonce}`;
}

export function updatePayload(name: string, newUa: string, nonce: number): string {
  return `UPDATE:${name}:${newUa}:${nonce}`;
}

// ── Memo builders ───────────────────────────────────────────────────────────

export function buildClaimMemo(name: string, ua: string, signature: string): string {
  requireName(name);
  requireAddress(ua, "address");
  return `ZNS:CLAIM:${name}:${ua}:${signature}`;
}

export function buildBuyMemo(name: string, buyerUa: string, signature: string): string {
  requireName(name);
  requireAddress(buyerUa, "buyer address");
  return `ZNS:BUY:${name}:${buyerUa}:${signature}`;
}

export function buildListMemo(
  name: string,
  price: number,
  nonce: number,
  signature: string,
): string {
  requireName(name);
  return `ZNS:LIST:${name}:${price}:${nonce}:${signature}`;
}

export function buildDelistMemo(name: string, nonce: number, signature: string): string {
  requireName(name);
  return `ZNS:DELIST:${name}:${nonce}:${signature}`;
}

export function buildReleaseMemo(name: string, nonce: number, signature: string): string {
  requireName(name);
  return `ZNS:RELEASE:${name}:${nonce}:${signature}`;
}

export function buildUpdateMemo(
  name: string,
  newUa: string,
  nonce: number,
  signature: string,
): string {
  requireName(name);
  requireAddress(newUa, "new address");
  return `ZNS:UPDATE:${name}:${newUa}:${nonce}:${signature}`;
}
