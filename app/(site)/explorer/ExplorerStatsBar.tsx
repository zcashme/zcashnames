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

export function useExplorerStats(network: Network, refreshKey = 0) {
  const [stats, setStats] = useState<ExplorerStats>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getHomeStats(network).then((s) => {
      if (!cancelled) {
        setStats(s);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [network, refreshKey]);

  return { stats, loading };
}
