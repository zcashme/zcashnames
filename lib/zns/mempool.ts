"use server";

import type { Network } from "@/lib/zns/client";

/**
 * Check whether a name is currently sitting in the indexer's mempool view.
 *
 * - Mainnet: GET https://light.zcash.me/mempool-mainnet/lookup/:name
 *   - 200 → tx is in the mempool (`found: true`)
 *   - 404 (or anything else) → not in the mempool (`found: false`)
 * - Testnet: no public mempool endpoint, so we always return `found: false`
 *   and let the caller fall back to the resolver.
 *
 * Network errors are swallowed and reported as `found: false` so the polling
 * loop in the scanner phase doesn't get stuck on transient failures.
 */
export async function checkMempool(
  name: string,
  network: Network,
): Promise<{ found: boolean }> {
  if (network !== "mainnet") return { found: false };

  try {
    const res = await fetch(
      `https://light.zcash.me/mempool-mainnet/lookup/${encodeURIComponent(name)}`,
      { cache: "no-store" },
    );
    return { found: res.status === 200 };
  } catch {
    return { found: false };
  }
}
