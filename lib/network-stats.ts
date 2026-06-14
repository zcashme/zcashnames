"use server";

import { NETWORKS } from "zcashname-sdk";
import { getZns } from "@/lib/zns/utils";
import { getWaitlistStats } from "@/lib/leaders/leaders";

export type WaitlistStats = {
  mode: "waitlist";
  waitlist: number;
  referred: number;
  rewardsPot: number;
  deltas: {
    waitlist: { day: number | null; week: number | null; month: number | null };
    referred: { day: number | null; week: number | null; month: number | null };
    rewardsPot: { day: number | null; week: number | null; month: number | null };
  };
};

export type ChainStats = {
  mode: "mainnet" | "testnet";
  claimed: number;
  forSale: number;
  syncedHeight: number;
  uivk: string;
  uivkVerified: boolean;
};

export type NetworkStats = WaitlistStats | ChainStats;

export async function getChainStats(mode: "mainnet" | "testnet"): Promise<ChainStats> {
  try {
    const s = await getZns(mode).status();
    return {
      mode,
      claimed: s.registered,
      forSale: s.listed,
      syncedHeight: s.syncedHeight,
      uivk: s.uivk,
      uivkVerified: s.uivk === NETWORKS[mode].uivk,
    };
  } catch {
    return { mode, claimed: 0, forSale: 0, syncedHeight: 0, uivk: "", uivkVerified: false };
  }
}

// Claim cost for a name of length `nameLen` on `network`. Owned by the
// network module because pricing is a property of the network, not of any
// individual name. Callers (resolveName, claimAction) ask the network for
// "what does a name of this length cost right now" — they don't reach into
// indexer status themselves.
export async function getNamePricing(network: keyof typeof NETWORKS, nameLen: number): Promise<number> {
  const zns = getZns(network);
  const s = await zns.status();
  if (!s.pricing) throw new Error("Pricing unavailable - indexer may be down.");
  const cost = zns.claimCost(nameLen, s.pricing);
  if (cost == null) throw new Error("Pricing unavailable - indexer may be down.");
  return cost;
}

export async function getNetworkStats(mode: "waitlist" | "mainnet" | "testnet"): Promise<NetworkStats> {
  if (mode === "waitlist") {
    const { waitlist, referred, rewardsPot, deltas } = await getWaitlistStats();
    return { mode: "waitlist", waitlist, referred, rewardsPot, deltas };
  }

  return getChainStats(mode);
}
