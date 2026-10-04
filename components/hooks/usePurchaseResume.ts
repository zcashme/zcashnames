"use client";

import { useCallback, useEffect, useState } from "react";
import { writeLocalStorage } from "@/components/hooks/useLocalStorage";
import {
  watchScanning, deriveScanState,
} from "@/lib/purchases/scanningWatcher";
import {
  RESUME_EVENT, RESUME_KEY, clearResume, readResume, notifyResumeChanged,
  type ResumeSnapshot,
} from "@/lib/purchases/resume";

// All phases get a resume banner — closing the form anywhere should behave
// like "minimize", not "abandon". The banner restores the form at the same
// step; only the explicit "Done" / "Abandon" controls clear the snapshot.
const BANNER_PHASES = new Set([
  "input", "confirm", "otp", "respond", "scanning",
]);

// Pull the scan expectation out of the saved flow state. Mirrors what
// usePurchaseFlow captures when entering the scanning phase.
function expectedFromSnapshot(snap: ResumeSnapshot) {
  const state = snap.state as {
    address?: string;
    baselineTxid?: string;
  } | null;
  if (!state) return null;
  return {
    action: snap.action,
    address: state.address?.trim() || undefined,
    baselineTxid: state.baselineTxid ?? "",
  };
}

// Read + watch the resume snapshot. Subscribes to the shared scanning watcher
// while in scanning phase so the snapshot's scanState stays current — this
// lets the banner reflect mined even when the form is closed, and lets a
// reopened form rehydrate to the latest known state.
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
  // the banner reflects it and a reopened form rehydrates correctly.
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.phase !== "scanning") return;
    if (snapshot.scanState === "mined") return;
    const expected = expectedFromSnapshot(snapshot);
    if (!expected) return;
    const { name, network } = snapshot;
    return watchScanning(name, network, (tick) => {
      const cur = readResume();
      if (!cur || cur.name !== name || cur.network !== network) return;
      const next = deriveScanState(tick, expected);
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
