"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { checkScannerState } from "@/lib/zns/resolve";
import { checkMempool, type MempoolEntry } from "@/lib/zns/mempool";
import type { PendingTransactionState } from "@/lib/types";
import { useLocalStorage } from "@/components/hooks/useLocalStorage";

const STORAGE_KEY = "zns-pending-transaction-v1";

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
    if (!pendingTransaction || pendingTransaction.phase !== "scanning" || pendingTransaction.scanState === "mined") {
      return;
    }

    const current = pendingTransaction;
    let cancelled = false;
    const expected = {
      address: current.addressInput.trim() || undefined,
      priceZats: current.priceInput.trim()
        ? Math.round(Number(current.priceInput.replace(/,/g, "").trim()) * 1e8)
        : undefined,
    };

    async function poll() {
const [mempoolResult, resolver] = await Promise.all([
          checkMempool(current.target.name, current.target.network),
          checkScannerState(
            current.target.name,
            current.target.network,
            current.target.action,
            expected,
          ),
        ]);
        if (cancelled) return;

        let nextScanState = current.scanState;
        let nextTxid: string | undefined = current.txid;
        let nextWarnings: string[] | undefined = current.warnings;

        if (resolver === "success") {
          nextScanState = "mined";
        } else if (mempoolResult.found && mempoolResult.response) {
          const { state, entry } = mempoolResult.response;
          if (state.state === "Confirmed") {
            nextScanState = "mined";
          } else if (state.state === "Pending") {
            nextScanState = "in_mempool";
            if (entry.txid) nextTxid = entry.txid;
            if (entry.warnings?.length) nextWarnings = entry.warnings;
          } else if (state.state === "Rejected") {
            nextScanState = "not_detected";
          }
        } else if (
          current.scanState === "in_mempool" ||
          current.scanState === "being_mined"
        ) {
          nextScanState = "being_mined";
        } else {
          nextScanState = "not_detected";
        }

      if (
        nextScanState !== current.scanState ||
        nextTxid !== current.txid ||
        JSON.stringify(nextWarnings) !== JSON.stringify(current.warnings)
      ) {
        setPendingTransaction({
          ...current,
          scanState: nextScanState,
          txid: nextTxid,
          warnings: nextWarnings,
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