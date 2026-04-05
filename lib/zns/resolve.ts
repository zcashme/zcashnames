"use server";

import { resolve, registrationStatus, status, fetchClaimCost, events, listForSale, type ZnsListing } from "@/lib/zns/client";
import { normalizeUsername, isValidUsername, zatsToZec, type Network } from "@/lib/zns/name";
import { getExchangeRate } from "@/lib/exchange-rate";
import { getReservedName } from "@/lib/zns/reserved";
import type { ResolveName } from "@/lib/types";

export async function resolveName(
  rawName: string,
  network: Network = "testnet"
): Promise<ResolveName> {
  const normalized = normalizeUsername(rawName);

  if (!isValidUsername(normalized)) {
    throw new Error("Use 1-62 characters: lowercase letters and numbers only.");
  }

  const registration = await resolve(normalized, network);
  const nameStatus = registrationStatus(registration);

  if (nameStatus === "available") {
    const reserved = await getReservedName(normalized);

    if (reserved && !reserved.redeemed && reserved.category === "offensive") {
      return { status: "blocked", query: normalized };
    }

    const claimCostZats = await fetchClaimCost(normalized, network);
    if (claimCostZats == null) {
      throw new Error("Pricing unavailable — indexer may be down.");
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

  const reg = {
    name: registration!.name,
    address: registration!.address,
    txid: registration!.txid,
    height: registration!.height,
    nonce: registration!.nonce,
  };

  if (nameStatus === "forsale") {
    return {
      status: "listed",
      query: normalized,
      registration: reg,
      listingPrice: {
        zats: registration!.listing!.price,
        zec: zatsToZec(registration!.listing!.price),
      },
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
    const s = await status(network);
    return {
      claimed: s.registered,
      forSale: s.listed,
      verifiedOnZcashMe: 0,
      syncedHeight: s.synced_height,
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

export async function getUsdPerZec(): Promise<number | null> {
  return getExchangeRate();
}

export async function getListings(network: Network = "testnet"): Promise<ZnsListing[]> {
  try {
    return await listForSale(network);
  } catch {
    return [];
  }
}

export async function getEvents(
  params: { name?: string; action?: string; limit?: number; offset?: number } = {},
  network: Network = "testnet"
) {
  try {
    return await events(params, network);
  } catch {
    return { events: [], total: 0 };
  }
}
