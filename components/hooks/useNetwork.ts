"use client";

import { createContext, useContext } from "react";
import type { Network } from "@/lib/zns/name";

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

export type NetworkData =
  | { network: null; stats: WaitlistStatsData }
  | { network: Network; stats: HomeStatsData };

export interface NetworkContextValue {
  network: Network | null;
  setNetwork: (n: Network | null) => void;
  networkPassword: string;
  setNetworkPassword: (v: string) => void;
  data: NetworkData | null;
  loading: boolean;
  refresh: () => void;
}

export const NetworkContext = createContext<NetworkContextValue>({
  network: null,
  setNetwork: () => {},
  networkPassword: "",
  setNetworkPassword: () => {},
  data: null,
  loading: true,
  refresh: () => {},
});

export function useNetwork() {
  return useContext(NetworkContext);
}