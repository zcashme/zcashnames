"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { writeLocalStorage } from "@/components/hooks/useLocalStorage";
import {
  watchScanning, deriveScanState, type Expected,
} from "@/lib/purchases/scanningWatcher";
import {
  RESUME_EVENT, RESUME_KEY, clearResume, readResume, notifyResumeChanged,
  type ResumeSnapshot,
} from "@/lib/purchases/resume";

// All phases get a resume banner — closing the modal anywhere should behave
// like "minimize", not "abandon". The banner restores the modal at the same
// step; only the explicit "Done" / "Abandon" controls clear the snapshot.
const BANNER_PHASES = new Set([
  "unlock", "input", "otp",
  "confirm", "fund", "scanning", "settling",
]);

// Pull the `expected` post-action shape out of the modal's saved reducer
// state. The shape mirrors what Zip321Modal builds at scanning-phase entry.
function expectedFromSnapshot(snap: ResumeSnapshot): Expected | null {
  const state = snap.state as { address?: string; priceInput?: string } | null;
  if (!state) return null;
  const address = state.address?.trim() || undefined;
  let priceZats: number | undefined;
  if (state.priceInput) {
    const num = Number(state.priceInput.replace(/,/g, "").trim());
    if (Number.isFinite(num) && num >= 0) priceZats = Math.round(num * 1e8);
  }
  return { action: snap.action, address, priceZats };
}

// Read + watch the resume snapshot. Subscribes to the shared scanning watcher
// while in scanning phase so the snapshot's scanState stays current — this
// lets the banner reflect mined/in_mempool/etc even when the modal is closed,
// and lets a reopened modal rehydrate to the latest known state.
//
// The modal subscribes to the same watcher independently, so closing the
// modal cleanly hands off polling responsibility to this hook (and vice
// versa) via subscriber reference counting.
export function usePurchaseResume() {
  const [snapshot, setSnapshot] = useState<ResumeSnapshot | null>(null);

  // Initial read + subscribe to cross-tab (storage) and same-tab (custom) updates.
  useEffect(() => {
    setSnapshot(readResume());
    const refresh = () => setSnapshot(readResume());
    const onStorage = (e: StorageEvent) => { if (e.key === RESUME_KEY) refresh(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(RESUME_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(RESUME_EVENT, refresh);
    };
  }, []);

  // Subscribe to the scanning watcher while in scanning phase. Writes the
  // derived scanState back into the snapshot (top-level + state mirror) so
  // the banner reflects it and a reopened modal rehydrates correctly.
  const sawMempoolRef = useRef(false);
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.phase !== "scanning") return;
    if (snapshot.scanState === "mined") return;
    const expected = expectedFromSnapshot(snapshot);
    if (!expected) return;
    const { name, network } = snapshot;
    sawMempoolRef.current = snapshot.scanState !== "not_detected";
    return watchScanning(name, network, (tick) => {
      const cur = readResume();
      if (!cur || cur.name !== name || cur.network !== network) return;
      const { scanState: next, sawMempool } = deriveScanState(
        tick, expected, { sawMempool: sawMempoolRef.current },
      );
      sawMempoolRef.current = sawMempool;
      if (next === cur.scanState) return;
      const updated: ResumeSnapshot = {
        ...cur,
        scanState: next,
        state: { ...(cur.state as Record<string, unknown>), scanState: next },
      };
      writeLocalStorage(RESUME_KEY, updated);
      notifyResumeChanged();
    });
  }, [snapshot?.phase, snapshot?.name, snapshot?.network, snapshot?.scanState, snapshot?.action]);

  const dismiss = useCallback(() => {
    clearResume();
    setSnapshot(null);
  }, []);

  const visible = snapshot !== null && BANNER_PHASES.has(snapshot.phase);
  return { snapshot, visible, dismiss };
}
