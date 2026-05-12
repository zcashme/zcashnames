"use server";

import { NETWORKS } from "zcashname-sdk";
import { getZns } from "@/lib/zns/utils";
import { getWaitlistStats } from "@/lib/leaders/leaders";

export type WaitlistStats = {
  mode: "waitlist";
  waitlist: number;
  referred: number;
  rewardsPot: number;
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

export async function getNetworkStats(mode: "waitlist" | "mainnet" | "testnet"): Promise<NetworkStats> {
  if (mode === "waitlist") {
    const { waitlist, referred, rewardsPot } = await getWaitlistStats("all");
    return { mode: "waitlist", waitlist, referred, rewardsPot };
  }

  return getChainStats(mode);
}
