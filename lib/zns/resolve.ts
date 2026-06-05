"use server";

import {
  getZns,
  registrationStatus,
  normalizeUsername,
  isValidUsername,
  zatsToZec,
} from "@/lib/zns/utils";
import type { Network, Action, ResolveName, Registration } from "@/lib/types";
import { getReservedName } from "@/lib/zns/reserved";
import { getNamePricing } from "@/lib/network-stats";

//
// Server-side name resolution. These functions are the read path for the
// explorer and search — every name lookup in the app flows through here.
//
// resolveName() is the central dispatch: it normalises the input, queries
// the ZNS indexer, checks the reserved-names table (Supabase), computes
// the claim cost, and returns a typed ResolveName union the UI can switch on.
//
// The other exports (getCurrentRegistrations, getListings, getEvents,
// getHomeStats) power the explorer page — they fetch paginated / filtered
// data from the indexer and return it to the server component.
//

export async function getCurrentRegistrations(
  network: Network = "testnet",
  limit?: number,
  offset?: number,
) {
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
    throw new Error("Use 1-62 characters: lowercase letters and numbers only.");
  }

  const zns = getZns(network);
  const registration = await zns.resolveName(normalized);
  const nameStatus = registrationStatus(registration);

  // Name is unregistered — check if it's reserved or blocked, then compute cost
  if (nameStatus === "available") {
    const reserved = await getReservedName(normalized);

    // Some names (slurs, impersonation targets) are permanently blocked
    if (reserved && !reserved.redeemed && reserved.category === "offensive") {
      return { status: "blocked", query: normalized };
    }

    const claimCostZats = await getNamePricing(network, normalized.length);

    // Reserved names (brands, protocol terms, community) need an unlock code
    if (reserved && !reserved.redeemed) {
      return {
        status: "reserved",
        query: normalized,
        claimCost: { zats: claimCostZats, zec: zatsToZec(claimCostZats) },
      };
    }

    return {
      status: "available",
      query: normalized,
      claimCost: { zats: claimCostZats, zec: zatsToZec(claimCostZats) },
    };
  }

  // Name is registered — check whether it also has an active listing.
  const reg = {
    name: registration!.name,
    address: registration!.address,
    txid: registration!.txid,
    height: registration!.height,
    nonce: registration!.nonce,
    pubkey: registration!.pubkey ?? null,
  };

  if (registration!.listing) {
    return {
      status: "listed",
      query: normalized,
      registration: reg,
      listingPrice: {
        zats: registration!.listing.price,
        zec: zatsToZec(registration!.listing.price),
      },
      payTaddr: registration!.listing.payTaddr,
      pendingBuy: registration!.listing.pendingBuy,
    };
  }

  return {
    status: "registered",
    query: normalized,
    registration: reg,
  };
}


// Reverse lookup: every name currently pointing at a unified address. This is
// the read primitive behind Collections — a UA is the only thing that clusters
// a person's names, since the chain never links one human's addresses together.
// Returns [] on any failure (invalid address, indexer down) to keep callers simple.
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

export async function getListings(
  network: Network = "testnet",
  limit?: number,
  offset?: number,
) {
  try {
    return await getZns(network).listings(limit, offset);
  } catch {
    return { listings: [], total: 0 };
  }
}

export async function getEvents(
  params: Record<string, unknown> = {},
  network: Network = "testnet",
) {
  try {
    // The SDK's events() method accepts camelCase filter keys and converts them
    // to the snake_case JSON-RPC params the indexer expects. Query parameters
    // like { name, action, limit, offset } all get passed through transparently.
    return await getZns(network).events(params);
  } catch {
    return { events: [], total: 0 };
  }
}
