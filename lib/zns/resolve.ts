"use server";

import {
  getZns,
  registrationStatus,
  normalizeUsername,
  isValidUsername,
  zatsToZec,
} from "@/lib/zns/utils";
import type { Network, Action, ResolveName } from "@/lib/types";
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

export async function getCurrentRegistrations(network: Network = "testnet") {
  try {
    const registrations = await getZns(network).listAllRegistrations();
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
  // The SDK's resolveName() sometimes omits the listing, so we do a
  // separate listings() query as a fallback.
  let regWithListing = registration;
  if (registration && !registration.listing) {
    const { listings } = await zns.listings();
    const listing = listings.find((l) => l.name === normalized);
    if (listing) {
      regWithListing = {
        ...registration,
        listing,
      };
    }
  }

  const reg = {
    name: regWithListing!.name,
    address: regWithListing!.address,
    txid: regWithListing!.txid,
    height: regWithListing!.height,
    nonce: regWithListing!.nonce,
    pubkey: regWithListing!.pubkey ?? null,
  };

  if (regWithListing!.listing) {
    return {
      status: "listed",
      query: normalized,
      registration: reg,
      listingPrice: {
        zats: regWithListing!.listing!.price,
        zec: zatsToZec(regWithListing!.listing!.price),
      },
      payTaddr: regWithListing!.listing.payTaddr,
      pendingBuy: regWithListing!.listing.pendingBuy,
    };
  }

  return {
    status: "registered",
    query: normalized,
    registration: reg,
  };
}


export async function getListings(network: Network = "testnet") {
  try {
    const { listings } = await getZns(network).listings();
    return listings;
  } catch {
    return [];
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
