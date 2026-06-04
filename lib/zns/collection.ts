"use server";

import { getNamesForAddress, resolveName } from "@/lib/zns/resolve";
import {
  normalizeUsername,
  isValidUsername,
  validateAddress,
} from "@/lib/zns/utils";
import type { Network, Registration } from "@/lib/types";

//
// Collection build logic — the read path for the /collections page.
//
// A "collection" has no account behind it. The unified address (UA) is the
// only thing that groups a person's names, because the chain deliberately
// keeps one human's addresses unlinkable. So a seed (a name *or* a UA) fans
// out through getNamesForAddress() into a cluster of co-owned names.
//
//   name seed → resolveName() → its UA → getNamesForAddress(UA) → siblings
//   UA seed   → getNamesForAddress(UA) directly
//
// The UI treats names as the nodes and the shared UA as invisible glue — we
// keep the address here for clustering/dedupe, never as a graph hub. This is,
// unavoidably, address clustering; it's scoped to seeds the user supplies, and
// every byte of it is already public on-chain.
//
// NOTE: only *current* ownership is followed here. A name's UPDATE history
// (lib/zns/resolve.ts getEvents) would bridge clusters by surfacing addresses a
// name used to live on — the "forgotten addresses" trick. Deliberately left out
// of the first pass: it's the most linkage-revealing step and earns its own toggle.
//

/** One name inside a cluster. The node the UI draws. */
export interface CollectionName {
  name: string;
  /** The UA this name resolves to. Glue, not a display node. */
  address: string;
  forSale: boolean;
  listingPriceZats: number | null;
  height: number;
  /** True when the user typed this exact name as a seed — the cluster's "star". */
  isSeed: boolean;
}

/** A group of names that share one unified address. */
export interface CollectionCluster {
  /** Stable React key + dedupe key, derived from the shared address. */
  key: string;
  /** The address gluing these names together. Kept for actions/dedupe, de-emphasised in UI. */
  address: string;
  names: CollectionName[];
}

/** Per-seed resolution outcome, so the UI can explain misses. */
export interface ResolvedSeed {
  /** The seed as normalised (name lower-cased, UA lower-cased). */
  seed: string;
  kind: "name" | "address" | "invalid";
  /**
   *  found        — resolved to a cluster of one or more names
   *  unregistered — a valid name that nobody owns yet (offer to watch/claim)
   *  empty        — a valid UA with no names pointing at it
   *  invalid      — neither a valid name nor a valid UA
   */
  status: "found" | "unregistered" | "empty" | "invalid";
}

export interface Collection {
  seeds: ResolvedSeed[];
  clusters: CollectionCluster[];
}

function toCollectionName(reg: Registration, seedNames: Set<string>): CollectionName {
  return {
    name: reg.name,
    address: reg.address,
    forSale: !!reg.listing,
    listingPriceZats: reg.listing ? reg.listing.price : null,
    height: reg.height,
    isSeed: seedNames.has(reg.name),
  };
}

// Resolve one seed to the address whose cluster it belongs to (or a non-found
// outcome). Returns the address plus the ResolvedSeed record; the caller does
// the actual reverse lookup so clusters can be deduped across seeds.
async function classifySeed(
  raw: string,
  network: Network,
): Promise<{ resolved: ResolvedSeed; address: string | null }> {
  const trimmed = raw.trim();

  // A unified address is an exact-match seed — look it up directly.
  if (validateAddress(trimmed).status === "unified") {
    const address = trimmed.toLowerCase();
    return { resolved: { seed: address, kind: "address", status: "found" }, address };
  }

  const name = normalizeUsername(trimmed);
  if (!isValidUsername(name)) {
    return { resolved: { seed: trimmed.toLowerCase(), kind: "invalid", status: "invalid" }, address: null };
  }

  const result = await resolveName(name, network);
  if (result.status === "registered" || result.status === "listed") {
    return {
      resolved: { seed: name, kind: "name", status: "found" },
      address: result.registration.address,
    };
  }
  // available / reserved / blocked → valid name, nobody owns it
  return { resolved: { seed: name, kind: "name", status: "unregistered" }, address: null };
}

/**
 * Build a collection from a list of seeds (names and/or unified addresses).
 *
 * Seeds that land on the same UA collapse into one cluster. The names the user
 * typed are flagged isSeed so the view can star them. Order of clusters follows
 * first appearance of their seed.
 */
export async function buildCollection(
  rawSeeds: string[],
  network: Network = "testnet",
): Promise<Collection> {
  // Normalise + de-duplicate seeds while preserving order.
  const seen = new Set<string>();
  const unique = rawSeeds
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));

  const classified = await Promise.all(unique.map((s) => classifySeed(s, network)));

  const seeds: ResolvedSeed[] = classified.map((c) => c.resolved);

  // Collect the seed *names* the user typed so we can mark stars in any cluster.
  const seedNames = new Set(
    seeds.filter((s) => s.kind === "name").map((s) => s.seed),
  );

  // Unique addresses to reverse-look-up, preserving first-seen order.
  const addresses: string[] = [];
  const addrSeen = new Set<string>();
  for (const c of classified) {
    if (c.address && !addrSeen.has(c.address.toLowerCase())) {
      addrSeen.add(c.address.toLowerCase());
      addresses.push(c.address);
    }
  }

  const lookups = await Promise.all(
    addresses.map((addr) => getNamesForAddress(addr, network, 500)),
  );

  const clusters: CollectionCluster[] = addresses
    .map((address, i) => ({
      key: address.toLowerCase(),
      address,
      names: lookups[i].map((reg) => toCollectionName(reg, seedNames)),
    }))
    // A UA seed can come back empty (no names point at it) — drop those clusters;
    // the seed's "empty" status is reported separately below.
    .filter((c) => c.names.length > 0);

  // Refine UA seeds that resolved to nothing → status "empty".
  const populatedAddrs = new Set(clusters.map((c) => c.key));
  for (const seed of seeds) {
    if (seed.kind === "address" && !populatedAddrs.has(seed.seed)) {
      seed.status = "empty";
    }
  }

  return { seeds, clusters };
}
