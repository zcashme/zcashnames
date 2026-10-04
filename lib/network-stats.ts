"use server";

import { getVerifiedStatus } from "@/lib/zns/utils";
import { getMintConfig } from "@/lib/zns/mint-config";

export type ChainStats = {
  mode: "mainnet" | "testnet";
  /** True when the resolver responded and its viewing key matches the Mint registry UFVK. */
  online: boolean;
  claimed: number;
  syncedHeight: number;
  synced: boolean;
  /** The registry UFVK baked into this deployment (null for offline networks). */
  registryUfvk: string | null;
};

export type NetworkStats = ChainStats;

export async function getChainStats(mode: "mainnet" | "testnet"): Promise<ChainStats> {
  const verified = await getVerifiedStatus(mode);
  if (!verified) {
    return {
      mode,
      online: false,
      claimed: 0,
      syncedHeight: 0,
      synced: false,
      registryUfvk: getMintConfig(mode).registryUfvk,
    };
  }
  return {
    mode,
    online: true,
    claimed: verified.registered,
    syncedHeight: verified.syncedHeight,
    synced: verified.synced,
    registryUfvk: getMintConfig(mode).registryUfvk,
  };
}

export async function getNetworkStats(mode: "mainnet" | "testnet"): Promise<NetworkStats> {
  return getChainStats(mode);
}
