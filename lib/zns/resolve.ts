"use server";

import { resolve, registrationStatus, status, events, listForSale, type ResolveResult, type VerifiedListing } from "@/lib/zns/client";
import { normalizeUsername, isValidUsername, zatsToZec, type Network } from "@/lib/zns/name";
import { getExchangeRate } from "@/lib/exchange-rate";
import { getReservedName } from "@/lib/zns/reserved";
import { getListingMap, reconcileRegistrationListing } from "@/lib/zns/listing-reconciliation";
import type { Action, ResolveName } from "@/lib/types";

const FIRST_BUCKET_SIZE = 100;
const REGISTRATION_EVENT_PAGE_SIZE = 200;
const REGISTRATION_RESOLVE_CONCURRENCY = 8;

function toFirstBucket(ordinal: number): number {
  return Math.max(FIRST_BUCKET_SIZE, Math.ceil(ordinal / FIRST_BUCKET_SIZE) * FIRST_BUCKET_SIZE);
}

async function findActiveListing(name: string, network: Network): Promise<VerifiedListing | null> {
  try {
    const listings = await listForSale(network);
    return listings.find((listing) => listing.name === name) ?? null;
  } catch {
    return null;
  }
}

async function getClaimOrdinal(name: string, network: Network): Promise<number | null> {
  const byName = await events({ name, action: "CLAIM", limit: 1 }, network);
  const claim = byName.events[0];
  if (!claim) return null;

  const [allClaims, claimsAfterBlock] = await Promise.all([
    events({ action: "CLAIM", limit: 1 }, network),
    events({ action: "CLAIM", since_height: claim.height, limit: 1 }, network),
  ]);

  if (allClaims.total <= 0) return null;

  // Events are newest-first. Start from the boundary where claims at this block begin.
  let positionFromNewest = claimsAfterBlock.total;
  let offset = claimsAfterBlock.total;
  const pageSize = 200;

  while (offset < allClaims.total) {
    const page = await events({ action: "CLAIM", limit: pageSize, offset }, network);
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

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await fn(items[index]);
      }
    }),
  );

  return results;
}

async function getEventNames(network: Network): Promise<string[]> {
  const names = new Set<string>();
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const page = await events({ limit: REGISTRATION_EVENT_PAGE_SIZE, offset }, network);
    total = page.total;
    for (const ev of page.events) {
      if (ev.name) names.add(ev.name);
    }
    if (page.events.length === 0) break;
    offset += page.events.length;
  }

  return [...names];
}

export async function getCurrentRegistrations(network: Network = "testnet"): Promise<ResolveResult[]> {
  try {
    const [names, listings] = await Promise.all([
      getEventNames(network),
      listForSale(network).catch(() => [] as VerifiedListing[]),
    ]);
    const listingsByName = getListingMap(listings);
    const registrations = await mapWithConcurrency(
      names,
      REGISTRATION_RESOLVE_CONCURRENCY,
      async (name) => {
        try {
          return await resolve(name, network);
        } catch {
          return null;
        }
      },
    );

    return registrations
      .filter((reg): reg is ResolveResult => reg != null)
      .map((reg) => reconcileRegistrationListing(reg, listingsByName))
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

  let registration = await resolve(normalized, network);
  const nameStatus = registrationStatus(registration);

  if (nameStatus === "available") {
    const reserved = await getReservedName(normalized);

    if (reserved && !reserved.redeemed && reserved.category === "offensive") {
      return { status: "blocked", query: normalized };
    }

    const s = await status(network);
    if (!s.pricing?.tiers?.length) {
      throw new Error("Pricing unavailable - indexer may be down.");
    }
    const tiers = s.pricing.tiers;
    const idx = Math.min(normalized.length - 1, tiers.length - 1);
    const claimCostZats = tiers[idx];
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
    const reg = await resolve(name, network);

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

export async function getListings(network: Network = "testnet"): Promise<VerifiedListing[]> {
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
