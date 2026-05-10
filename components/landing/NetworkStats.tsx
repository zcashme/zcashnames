"use client";

import { useEffect, useState } from "react";
import { useZns } from "@/components/hooks/useZns";
import { getNetworkStats, type NetworkStats as Stats } from "@/lib/network-stats";

function zeroStats(mode: "waitlist" | "mainnet" | "testnet"): Stats {
  if (mode === "waitlist") return { mode: "waitlist", waitlist: 0, referred: 0, rewardsPot: 0 };
  return { mode, claimed: 0, forSale: 0, syncedHeight: 0, uivk: "" };
}

export default function NetworkStats() {
  const { zns } = useZns();
  const [stats, setStats] = useState<Stats>(() => zeroStats(zns.mode));

  useEffect(() => {
    let cancelled = false;
    getNetworkStats(zns.mode).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => { cancelled = true; };
  }, [zns.mode]);

  if (stats.mode === "waitlist") {
    return (
      <div className="flex gap-6 justify-center text-sm text-[var(--home-result-link-fg)]">
        <span>{stats.waitlist.toLocaleString()} signed up</span>
        <span>{stats.referred.toLocaleString()} referred</span>
        <span>{stats.rewardsPot.toFixed(3)} ZEC pot</span>
      </div>
    );
  }

  return (
    <div className="flex gap-6 justify-center text-sm text-[var(--home-result-link-fg)]">
      <span>{stats.claimed.toLocaleString()} claimed</span>
      <span>{stats.forSale.toLocaleString()} for sale</span>
      <span>block {stats.syncedHeight.toLocaleString()}</span>
    </div>
  );
}
