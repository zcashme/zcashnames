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

  if (nameStatus === "available") {
    const reserved = await getReservedName(normalized);

    if (reserved && !reserved.redeemed && reserved.category === "offensive") {
      return { status: "blocked", query: normalized };
    }

    const s = await zns.status();
    if (!s.pricing) {
      throw new Error("Pricing unavailable - indexer may be down.");
    }
    const claimCostZats = zns.claimCost(normalized.length, s.pricing);
    if (claimCostZats == null) {
      throw new Error("Pricing unavailable - indexer may be down.");
    }

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

export async function getHomeStats(network: Network = "testnet"): Promise<{ claimed: number; forSale: number; verifiedOnZcashMe: number; syncedHeight: number; uivk: string }> {
  try {
    const s = await getZns(network).status();
    return {
      claimed: s.registered,
      forSale: s.listed,
      verifiedOnZcashMe: 0,
      syncedHeight: s.syncedHeight,
      uivk: s.uivk,
    };
  } catch {
    return {
      claimed: 0,
      forSale: 0,
      verifiedOnZcashMe: 0,
      syncedHeight: 0,
      uivk: "",
    };
  }
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
    // SDK handles snake_case conversion internally
    return await getZns(network).events(params);
  } catch {
    return { events: [], total: 0 };
  }
}
