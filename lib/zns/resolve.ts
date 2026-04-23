"use server";

import { getZns, registrationStatus, normalizeUsername, isValidUsername, zatsToZec, type Network, type Registration, type Listing, type EventsFilter } from "@/lib/zns/client";

import { getReservedName } from "@/lib/zns/reserved";
import { getListingMap, reconcileRegistrationListing } from "@/lib/zns/listing-reconciliation";
import type { Action, ResolveName } from "@/lib/types";

const FIRST_BUCKET_SIZE = 100;

function toFirstBucket(ordinal: number): number {
  return Math.max(FIRST_BUCKET_SIZE, Math.ceil(ordinal / FIRST_BUCKET_SIZE) * FIRST_BUCKET_SIZE);
}

async function findActiveListing(name: string, network: Network): Promise<Listing | null> {
  try {
    const { listings } = await getZns(network).listings();
    return listings.find((listing) => listing.name === name) ?? null;
  } catch {
    return null;
  }
}

async function getClaimOrdinal(name: string, network: Network): Promise<number | null> {
  const zns = getZns(network);
  const byName = await zns.events({ name, action: "CLAIM", limit: 1 });
  const claim = byName.events[0];
  if (!claim) return null;

  const [allClaims, claimsAfterBlock] = await Promise.all([
    zns.events({ action: "CLAIM", limit: 1 }),
    zns.events({ action: "CLAIM", since_height: claim.height, limit: 1 }),
  ]);

  if (allClaims.total <= 0) return null;

  // Events are newest-first. Start from the boundary where claims at this block begin.
  let positionFromNewest = claimsAfterBlock.total;
  let offset = claimsAfterBlock.total;
  const pageSize = 200;

  while (offset < allClaims.total) {
    const page = await zns.events({ action: "CLAIM", limit: pageSize, offset });
    if (page.events.length === 0) break;

    let stop = false;
    for (let i = 0; i < page.events.length; i += 1) {
      const ev = page.events[i];
      if (ev.height < claim.height) {
        stop = true;
        break;
      }
      if (ev.txid === claim.txid) {
        positionFromNewest = offset + i;
        stop = true;
        break;
      }
    }

    if (stop) break;

    const oldest = page.events[page.events.length - 1];
    if (oldest.height < claim.height) break;
    offset += page.events.length;
  }

  // Convert "newest-first position" to "chronological claim number".
  return Math.max(1, allClaims.total - positionFromNewest);
}

async function getFirstBucketForClaim(name: string, network: Network): Promise<number | null> {
  try {
    const ordinal = await getClaimOrdinal(name, network);
    return ordinal ? toFirstBucket(ordinal) : null;
  } catch {
    return null;
  }
}

export async function getCurrentRegistrations(network: Network = "testnet"): Promise<Registration[]> {
  try {
    const zns = getZns(network);
    const [registrations, listingsMap] = await Promise.all([
      zns.listAllRegistrations(),
      zns.listings().then((r) => getListingMap(r.listings)).catch(() => new Map()),
    ]);

    return registrations
      .map((reg) => reconcileRegistrationListing(reg, listingsMap))
      .sort((a, b) => b.height - a.height || a.name.localeCompare(b.name));
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
  let registration = await zns.resolveName(normalized);
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
    const firstBucket = toFirstBucket(s.registered + 1);

    if (reserved && !reserved.redeemed) {
      return {
        status: "reserved",
        query: normalized,
        claimCost: { zats: claimCostZats, zec: zatsToZec(claimCostZats) },
        firstBucket,
      };
    }

    return {
      status: "available",
      query: normalized,
      claimCost: { zats: claimCostZats, zec: zatsToZec(claimCostZats) },
      firstBucket,
    };
  }

  if (registration && !registration.listing) {
    const listing = await findActiveListing(normalized, network);
    if (listing) registration = { ...registration, listing };
  }

  const reg = {
    name: registration!.name,
    address: registration!.address,
    txid: registration!.txid,
    height: registration!.height,
    nonce: registration!.nonce,
    pubkey: registration!.pubkey ?? null,
  };

  if (registration!.listing) {
    const firstBucket = await getFirstBucketForClaim(normalized, network);
    return {
      status: "listed",
      query: normalized,
      registration: reg,
      listingPrice: {
        zats: registration!.listing!.price,
        zec: zatsToZec(registration!.listing!.price),
      },
      firstBucket: firstBucket ?? undefined,
    };
  }

  const firstBucket = await getFirstBucketForClaim(normalized, network);
  return {
    status: "registered",
    query: normalized,
    registration: reg,
    firstBucket: firstBucket ?? undefined,
  };
}

/**
 * Check whether the resolver reflects the expected post-action state for `name`.
 * Used by the scanner phase of Zip321Modal to know when an action has been mined.
 *
 * Returns "success" once the resolver matches the expected state, "empty" otherwise.
 * Network/parsing errors are reported as "empty" so the polling loop keeps going.
 */
export async function checkScannerState(
  name: string,
  network: Network,
  action: Action,
  expected: { address?: string; priceZats?: number },
): Promise<"empty" | "success"> {
  try {
    const reg = await getZns(network).resolveName(name);

    switch (action) {
      case "claim":
      case "buy":
      case "update": {
        if (!reg) return "empty";
        if (!expected.address) return "empty";
        return reg.address === expected.address ? "success" : "empty";
      }
      case "list": {
        if (!reg || !reg.listing) return "empty";
        if (expected.priceZats == null) return "empty";
        return reg.listing.price === expected.priceZats ? "success" : "empty";
      }
      case "delist": {
        if (!reg) return "empty";
        return reg.listing == null ? "success" : "empty";
      }
      case "release": {
        return reg == null ? "success" : "empty";
      }
    }
  } catch {
    return "empty";
  }
}

export async function getHomeStats(network: Network = "testnet"): Promise<{ claimed: number; forSale: number; verifiedOnZcashMe: number; syncedHeight: number; uivk: string }> {
  try {
    const s = await getZns(network).status();
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

export async function getListings(network: Network = "testnet"): Promise<Listing[]> {
  try {
    const { listings } = await getZns(network).listings();
    return listings;
  } catch {
    return [];
  }
}

export async function getEvents(
  params: EventsFilter = {},
  network: Network = "testnet",
) {
  try {
    return await getZns(network).events(params);
  } catch {
    return { events: [], total: 0 };
  }
}
