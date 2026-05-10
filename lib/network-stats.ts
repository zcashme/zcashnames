"use server";

import { getZns } from "@/lib/zns/utils";
import { db } from "@/lib/db";

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
    };
  } catch {
    return { mode, claimed: 0, forSale: 0, syncedHeight: 0, uivk: "" };
  }
}

export async function getNetworkStats(mode: "waitlist" | "mainnet" | "testnet"): Promise<NetworkStats> {
  if (mode === "waitlist") {
    try {
      const { count: waitlistCount } = await db
        .from("zn_waitlist")
        .select("*", { count: "exact", head: true });

      const { count: referredCount } = await db
        .from("zn_waitlist")
        .select("*", { count: "exact", head: true })
        .not("referred_by", "is", null);

      const waitlist = waitlistCount ?? 0;
      const referred = referredCount ?? 0;

      return {
        mode: "waitlist",
        waitlist,
        referred,
        rewardsPot: Math.round(referred * 0.05 * 1000) / 1000,
      };
    } catch {
      return { mode: "waitlist", waitlist: 0, referred: 0, rewardsPot: 0 };
    }
  }

  return getChainStats(mode);
}
