"use server";

import {
  getZns,
  normalizeUsername,
  isValidUsername,
  zatsToZec,
} from "@/lib/zns/utils";
import type { Network, Registration, ResolveName, ZnsEvent } from "@/lib/types";
import { quoteClaimZats } from "@/lib/zns/pricing";

//
// Server-side name resolution. These functions are the read path for the
// explorer and search — every name lookup in the app flows through here.
//
// resolveName() normalises the input, queries the network's Name Note
// resolver, and returns a typed ResolveName union the UI can switch on.
// Claim pricing is the site's display mirror of the Mint's published
// schedule (see lib/zns/pricing.ts); the Mint is the pricing authority.
//
// The other exports (getCurrentRegistrations, getNamesForAddress, getEvents)
// power the explorer — they fetch paginated data from the resolver and
// return it to the server component.
//

export async function getCurrentRegistrations(
  network: Network = "testnet",
  limit?: number,
  offset?: number,
): Promise<Registration[]> {
  try {
    const registrations = await getZns(network).listAllRegistrations(limit, offset);
    return [...registrations].sort((a, b) => b.height - a.height || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function resolveName(
  rawName: string,
  network: Network = "testnet"
): Promise<ResolveName> {
  const normalized = normalizeUsername(rawName);

  if (!isValidUsername(normalized)) {
    throw new Error("Use 1-63 characters: lowercase letters and numbers only.");
  }

  let registration: Registration | null = null;
  try {
    registration = await getZns(network).resolveName(normalized);
  } catch {
    throw new Error("Resolver unavailable — try again shortly.");
  }

  if (!registration) {
    const zats = await quoteClaimZats(normalized, "1y");
    return {
      status: "available",
      query: normalized,
      claimCost: { zats, zec: zatsToZec(zats) },
    };
  }

  return {
    status: "registered",
    query: normalized,
    registration,
  };
}

// Reverse lookup: every name currently pointing at a unified address. This is
// the read primitive behind Collections — a UA is the only thing that clusters
// a person's names, since the chain never links one human's addresses together.
// Returns [] on any failure (invalid address, resolver down) to keep callers simple.
export async function getNamesForAddress(
  address: string,
  network: Network = "testnet",
  limit?: number,
  offset?: number,
): Promise<Registration[]> {
  try {
    const regs = await getZns(network).resolveAddress(address, limit, offset);
    return [...regs].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function getEvents(
  params: { name?: string; action?: ZnsEvent["action"]; limit?: number; offset?: number } = {},
  network: Network = "testnet",
) {
  try {
    return await getZns(network).events(params);
  } catch {
    return { events: [], total: 0, limit: 0, offset: 0 };
  }
}
