"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getCurrentBetaStage, switchToNetwork, clearStageCookie } from "@/lib/beta/actions";
import { getWaitlistStats } from "@/lib/leaders/leaders";
import { getHomeStats } from "@/lib/zns/resolve";

export type WaitlistStatsData = {
  waitlist: number;
  referred: number;
  rewardsPot: number;
};

export type HomeStatsData = {
  claimed: number;
  forSale: number;
  verifiedOnZcashMe: number;
  syncedHeight: number;
  uivk: string;
};

export type ZnsMode =
  | { mode: "waitlist"; stats: WaitlistStatsData }
  | { mode: "mainnet"; stats: HomeStatsData }
  | { mode: "testnet"; stats: HomeStatsData };

type ZnsContextValue = {
  zns: ZnsMode;
  setMode: (m: ZnsMode["mode"]) => void;
};

export const NetworkContext = createContext<ZnsContextValue>({
  zns: { mode: "waitlist", stats: { waitlist: 0, referred: 0, rewardsPot: 0 } },
  setMode: () => {},
});

export function useZns() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [zns, setZns] = useState<ZnsMode>({
    mode: "waitlist",
    stats: { waitlist: 0, referred: 0, rewardsPot: 0 },
  });

  const setMode = useCallback((mode: ZnsMode["mode"]) => {
    const next: ZnsMode = mode === "waitlist"
      ? { mode: "waitlist", stats: { waitlist: 0, referred: 0, rewardsPot: 0 } }
      : { mode, stats: { claimed: 0, forSale: 0, verifiedOnZcashMe: 0, syncedHeight: 0, uivk: "" } };
    setZns(next);
    if (mode === "waitlist") clearStageCookie();
    else switchToNetwork(mode);
  }, []);

  useEffect(() => {
    getCurrentBetaStage().then((stage) => {
      if (!stage) return;
      const next: ZnsMode =
        stage === "mainnet"
          ? { mode: "mainnet", stats: { claimed: 0, forSale: 0, verifiedOnZcashMe: 0, syncedHeight: 0, uivk: "" } }
          : { mode: "testnet", stats: { claimed: 0, forSale: 0, verifiedOnZcashMe: 0, syncedHeight: 0, uivk: "" } };
      setZns(next);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = zns.mode === "waitlist"
          ? { mode: "waitlist" as const, stats: await getWaitlistStats() }
          : { mode: zns.mode, stats: await getHomeStats(zns.mode) };
        if (!cancelled) setZns(next);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [zns.mode]);

  return (
    <NetworkContext.Provider value={{ zns, setMode }}>
      {children}
    </NetworkContext.Provider>
  );
}