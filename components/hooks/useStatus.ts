"use client";

import { createContext, useContext } from "react";
import type { Network } from "@/lib/zns/name";

export type StatusState = "mainnet" | "testnet" | "waitlist";

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

export type StatusData =
  | { mode: "waitlist"; stats: WaitlistStatsData }
  | { mode: "search"; network: Network; stats: HomeStatsData };

export interface StatusContextValue {
  status: StatusState;
  setStatus: (s: StatusState) => void;
  networkPassword: string;
  setNetworkPassword: (v: string) => void;
  network: Network;
  data: StatusData | null;
  loading: boolean;
  refresh: () => void;
}

export const StatusContext = createContext<StatusContextValue>({
  status: "waitlist",
  setStatus: () => {},
  networkPassword: "",
  setNetworkPassword: () => {},
  network: "testnet",
  data: null,
  loading: true,
  refresh: () => {},
});

export function useStatus() {
  return useContext(StatusContext);
}