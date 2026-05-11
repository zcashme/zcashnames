/**
 * Generates unsigned ZNS payloads for each action type via the ZNS SDK.
 * Used for debugging and testing (e.g. inspecting raw payload bytes).
 * The production action flow signs payloads server-side in `lib/zns/proof.ts`
 * — this module is NOT part of the production action pipeline.
 */
import { ZNS } from "zcashname-sdk";
import type { Action, Network } from "@/lib/types";

export function generatePayload(
  action: Action,
  name: string,
  network: Network,
  params: { address?: string; priceZats?: number; payTaddr?: string; nonce?: number },
): string {
  const zns = new ZNS({ network });
  const { address = "", priceZats = 0, payTaddr = "", nonce = 0 } = params;
  try {
    switch (action) {
      case "CLAIM":   return zns.prepareClaim(name, address, 0).payload;
      case "BUY":     return zns.prepareBuy(name, address, priceZats).payload;
      case "UPDATE":  return zns.prepareUpdate(name, address, nonce).payload;
      case "LIST":    return zns.prepareList(name, priceZats, payTaddr, nonce).payload;
      case "DELIST":  return zns.prepareDelist(name, nonce).payload;
      case "RELEASE": return zns.prepareRelease(name, nonce).payload;
    }
  } catch {
    return "";
  }
}
