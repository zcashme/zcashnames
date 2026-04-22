"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkScannerState } from "@/lib/zns/resolve";
import { checkMempool } from "@/lib/zns/mempool";
import type { ModalTarget, PendingTransactionState } from "@/lib/types";

const STORAGE_KEY = "zns-pending-transaction-v1";

function loadPendingTransaction(): PendingTransactionState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingTransactionState;
  } catch {
    return null;
  }
}

export function usePendingTransaction(onSuccess?: (name: string) => void) {
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransactionState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const notifiedSuccessRef = useRef<string | null>(null);

  const clearPendingTransaction = useCallback(() => {
    setPendingTransaction(null);
    notifiedSuccessRef.current = null;
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore blocked storage.
    }
  }, []);

  const persistPendingTransaction = useCallback((next: PendingTransactionState) => {
    setPendingTransaction(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore blocked storage.
    }
  }, []);

  useEffect(() => {
    setPendingTransaction(loadPendingTransaction());
    setHydrated(true);
  }, []);

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
      const [mempool, resolver] = await Promise.all([
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
      if (resolver === "success") nextScanState = "mined";
      else if (mempool.found) nextScanState = "in_mempool";
      else if (
        current.scanState === "in_mempool" ||
        current.scanState === "being_mined"
      ) nextScanState = "being_mined";
      else nextScanState = "not_detected";

      if (nextScanState !== current.scanState) {
        persistPendingTransaction({
          ...current,
          scanState: nextScanState,
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
  }, [onSuccess, pendingTransaction, persistPendingTransaction]);

  const resumeTarget = useMemo<ModalTarget | null>(() => {
    if (!pendingTransaction) return null;
    return {
      ...pendingTransaction.target,
      networkPassword: "",
    };
  }, [pendingTransaction]);

  return {
    hydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
    resumeTarget,
  };
}
