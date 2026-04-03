// Types
export type {
  Registration,
  Listing,
  ResolveResult,
  ListForSaleResult,
  StatusResult,
} from "./types.js";

// Errors
export { ZNSError, ErrorType } from "./errors.js";

// Protocol constants
export { DEFAULT_URL, UFVK, CLAIM_PRICES, DEFAULT_CLAIM_PRICE } from "./constants.js";

// Validation
export { isValidName } from "./validation.js";

// Pricing
export { claimCost } from "./pricing.js";

// Memo builders + signing payloads
export {
  claimPayload,
  buyPayload,
  listPayload,
  delistPayload,
  releasePayload,
  updatePayload,
  buildClaimMemo,
  buildBuyMemo,
  buildListMemo,
  buildDelistMemo,
  buildReleaseMemo,
  buildUpdateMemo,
} from "./memo.js";

// ZIP-321
export { toBase64Url, decodeBase64Url, buildZcashUri, parseZip321Uri } from "./zip321.js";
export type { Zip321Parts } from "./zip321.js";

// Client
export { createClient } from "./client.js";
export type { ZNSClient, ClientOptions } from "./client.js";

// ── Convenience functions (lazy default client) ─────────────────────────────

import type { ResolveResult, Listing, StatusResult } from "./types.js";
import type { ZNSClient } from "./client.js";
import { createClient } from "./client.js";
import { DEFAULT_URL } from "./constants.js";

let defaultClient: ZNSClient | null = null;
let defaultClientPromise: Promise<ZNSClient> | null = null;

function getDefaultClient(): Promise<ZNSClient> {
  if (defaultClient) return Promise.resolve(defaultClient);
  if (!defaultClientPromise) {
    defaultClientPromise = createClient(DEFAULT_URL).then((c) => {
      defaultClient = c;
      return c;
    });
  }
  return defaultClientPromise;
}

export async function resolve(query: string): Promise<ResolveResult | null> {
  return (await getDefaultClient()).resolve(query);
}

export async function listings(): Promise<Listing[]> {
  return (await getDefaultClient()).listings();
}

export async function status(): Promise<StatusResult> {
  return (await getDefaultClient()).status();
}

export async function isAvailable(name: string): Promise<boolean> {
  return (await getDefaultClient()).isAvailable(name);
}

export async function getNonce(name: string): Promise<number | null> {
  return (await getDefaultClient()).getNonce(name);
}
