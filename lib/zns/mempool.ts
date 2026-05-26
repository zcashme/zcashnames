/**
 * Mempool watcher — polls light.zcash.me's mempool API to track ZNS
 * transactions through their lifecycle.
 *
 * After the user sends a ZNS transaction (claim, list, buy, etc.), the client
 * enters a scanning phase where it polls the mempool watcher endpoints every
 * few seconds. The watcher has already decoded the Orchard notes and ZNS memos
 * server-side, so the client gets back rich structured data (action, name,
 * amounts, addresses) without doing any crypto work.
 *
 * Lifecycle: pending → resolving → confirmed
 *   - pending:    tx seen in mempool
 *   - resolving:  tx has left the mempool, watcher is polling LWD for height
 *   - confirmed:  LWD reports a non-zero block height
 *
 * There is no terminal failure status — a tx that never confirms stays in
 * resolving indefinitely. Clients decide their own "waited too long" UX.
 *
 * Endpoints:
 *   GET /mempool-mainnet/name/:name  → TxStatusResponse (primary lookup)
 *   GET /mempool-mainnet/utxo/:taddr → UtxoResponse (BUY payment detection)
 *   GET /mempool-mainnet/tx/:txid    → TxStatusResponse (by txid)
 *
 * Consumed by usePurchaseResume.ts to drive the resume-banner scanning UX.
 */
import type { Network } from "@/lib/types";

/**
 * Result from the mempool watcher for a ZNS transaction.
 * The watcher decodes every Orchard note it can trial-decrypt, parses the
 * ZNS memo, extracts the transparent output ZEC amount and pay_taddr,
 * and returns everything the frontend needs for engagement UX.
 *
 * Mempool watcher endpoints:
 *   GET https://light.zcash.me/mempool-mainnet/tx/:txid
 *   GET https://light.zcash.me/mempool-mainnet/name/:name
 *   GET https://light.zcash.me/mempool-mainnet/utxo/:taddr
 */
export interface MempoolEntry {
  /** Hex txid of the transaction. */
  txid: string;
  /** Action kind: "claim" | "list" | "delist" | "release" | "update" | "buy" */
  action: string;
  /** Name from the memo. */
  name: string;
  /** Destination unified address (CLAIM). */
  ua?: string;
  /** New address (UPDATE). */
  new_ua?: string;
  /** Buyer unified address (BUY). */
  buyer_ua?: string;
  /** Price in zats (LIST / BUY). */
  price?: number;
  /** Seller payout transparent address (LIST). */
  pay_taddr?: string;
  /** Nonce (LIST/DELIST/RELEASE/UPDATE). */
  nonce?: number;
  /** Base64 Ed25519 pubkey if sovereign, otherwise undefined. */
  user_pubkey?: string;
  /** Orchard note value in zatoshis. */
  value_zats: number;
  /** Unix timestamp when first seen in mempool. */
  seen_at: number;
}

/**
 * Transaction state from the mempool watcher's state machine.
 * Flattened for direct frontend consumption — status maps 1:1 to ScanState.
 */
export interface MempoolTxState {
  /** One of: "pending" | "resolving" | "confirmed" */
  status: string;
  /** Unix timestamp when first seen in mempool. (pending/resolving only) */
  seen_at?: number;
  /** Block height when confirmed. (confirmed only) */
  height?: number;
  /** Unix timestamp when confirmed. (confirmed only) */
  confirmed_at?: number;
}

/** Full response from /tx/:txid or /name/:name */
export interface TxStatusResponse {
  txid: string;
  name: string;
  action: string;
  state: MempoolTxState;
  entry: MempoolEntry;
}

/**
 * UTXO response for a transparent t-address.
 * Tracked from the mempool stream — not a full UTXO query, just what the
 * watcher has seen go to this address from mempool txs.
 */
export interface UtxoResponse {
  address: string;
  /** Total ZEC in zats received at this address from tracked UTXOs. */
  total_received_zats: number;
  utxos: TrackedUtxo[];
}

export interface TrackedUtxo {
  txid: string;
  value_zats: number;
}

/**
 * Check the mempool watcher's cache for a ZNS transaction.
 *
 * - Mainnet: GET https://light.zcash.me/mempool-mainnet/name/:name
 *   - 200 → TxStatusResponse (found: true, check state for Pending/Confirmed/Rejected)
 *   - 404 (or anything else) → found: false
 * - Testnet: no public mempool endpoint → always returns { found: false }
 *
 * Network errors are swallowed so the polling loop doesn't get stuck.
 */
export async function checkMempool(
  name: string,
  network: Network,
): Promise<{ found: boolean; response?: TxStatusResponse }> {
  if (network !== "mainnet") return { found: false };

  try {
    const res = await fetch(
      `https://light.zcash.me/mempool-mainnet/name/${encodeURIComponent(name)}`,
      { cache: "no-store" },
    );
    if (res.status !== 200) return { found: false };
    const response = await res.json() as TxStatusResponse;
    return { found: true, response };
  } catch {
    return { found: false };
  }
}

/**
 * Check tracked UTXOs for a transparent t-address.
 * Used for BUY payment detection — the seller can see incoming transparent
 * payments to their pay_taddr from the mempool stream.
 *
 * - Mainnet: GET https://light.zcash.me/mempool-mainnet/utxo/:taddr
 *   - 200 → UtxoResponse
 *   - 404 → no tracked UTXOs for this address
 */
export async function checkUtxo(
  taddr: string,
  network: Network,
): Promise<{ found: boolean; response?: UtxoResponse }> {
  if (network !== "mainnet") return { found: false };

  try {
    const res = await fetch(
      `https://light.zcash.me/mempool-mainnet/utxo/${encodeURIComponent(taddr)}`,
      { cache: "no-store" },
    );
    if (res.status !== 200) return { found: false };
    const response = await res.json() as UtxoResponse;
    return { found: true, response };
  } catch {
    return { found: false };
  }
}