"use client";

import { useEffect, useState } from "react";
import { getHomeStats } from "@/lib/zns/resolve";
import type { Network } from "@/lib/zns/name";

export type ExplorerStats = {
  claimed: number;
  forSale: number;
  syncedHeight: number;
  uivk: string;
} | null;

export function useExplorerStats(network: Network) {
  const [stats, setStats] = useState<ExplorerStats>(null);

  useEffect(() => {
    let cancelled = false;
    getHomeStats(network).then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => { cancelled = true; };
  }, [network]);

  return stats;
}
