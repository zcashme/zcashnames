"use client";

import { useCallback, useEffect, useRef } from "react";
import { checkMempool } from "@/lib/zns/mempool";
import type { PendingTransactionState } from "@/lib/types";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";

const STORAGE_KEY = "zns-pending-transaction-v1";

//
// Pending transaction tracker — persists transaction state to localStorage
// so the user can close the tab and come back. Once a transaction enters the
// "scanning" phase, it polls the mempool watcher every 2 seconds.
//
// The mempool watcher (light.zcash.me) tracks ZNS transactions through three
// stages: pending → resolving → confirmed. This hook maps those to ScanState
// values and fires onSuccess when a tx reaches "mined".
//
// Usage:
//   const { pendingTransaction, persistPendingTransaction, clearPendingTransaction } =
//     usePendingTransaction(() => router.refresh());
//
// Zip321Modal calls persistPendingTransaction() when the user sends a tx.
// PendingTransactionBanner renders the sticky bottom-left tracker.
//
export function usePendingTransaction(onSuccess?: (name: string) => void) {
  const [pendingTransaction, setPendingTransaction, removeStorage] =
    useLocalStorage<PendingTransactionState | null>(STORAGE_KEY, null);
  const notifiedSuccessRef = useRef<string | null>(null);

  const clearPendingTransaction = useCallback(() => {
    removeStorage();
    notifiedSuccessRef.current = null;
  }, [removeStorage]);

  const persistPendingTransaction = useCallback(
    (next: PendingTransactionState) => setPendingTransaction(next),
    [setPendingTransaction],
  );

  useEffect(() => {
    if (
      !pendingTransaction ||
      pendingTransaction.phase !== "scanning" ||
      pendingTransaction.scanState === "mined"
    ) {
      return;
    }

    const current = pendingTransaction;
    let cancelled = false;

    async function poll() {
      const result = await checkMempool(current.target.name, current.target.network);
      if (cancelled) return;

      let nextScanState = current.scanState;
      let nextTxid: string | undefined = current.txid;

      if (!result.found || !result.response) {
        nextScanState = "not_detected";
      } else {
        const { state, entry } = result.response;
        switch (state.status) {
          case "pending":
            nextScanState = "in_mempool";
            break;
          case "resolving":
            nextScanState = "confirming";
            break;
          case "confirmed":
            nextScanState = "mined";
            break;
        }
        if (entry.txid) nextTxid = entry.txid;
      }

      if (nextScanState !== current.scanState || nextTxid !== current.txid) {
        setPendingTransaction({
          ...current,
          scanState: nextScanState,
          txid: nextTxid,
          updatedAt: Date.now(),
        });
      }

      const successKey = `${current.target.network}:${current.target.action}:${current.target.name}`;
      if (nextScanState === "mined" && notifiedSuccessRef.current !== successKey) {
        notifiedSuccessRef.current = successKey;
        onSuccess?.(current.target.name);
      }
    }

    poll();
    const id = window.setInterval(poll, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [onSuccess, pendingTransaction, setPendingTransaction]);

  return {
    hydrated: true,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
  };
}