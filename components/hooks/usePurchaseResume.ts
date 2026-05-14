"use client";

import { useCallback, useEffect, useState } from "react";
import { checkMempool } from "@/lib/zns/mempool";
import { writeLocalStorage } from "@/components/hooks/useLocalStorage";
import {
  RESUME_EVENT, RESUME_KEY, clearResume, readResume, notifyResumeChanged,
  type ResumeSnapshot,
} from "@/lib/purchases/resume";
import type { ScanState } from "@/lib/types";

// Phases for which the banner should appear. Earlier phases (unlock, input,
// otp, sign) are still in-progress data collection — if the user closes the
// modal there, they start over rather than being offered a resume pill.
const BANNER_PHASES = new Set(["confirm", "fund", "scanning"]);

// Read + watch the resume snapshot, and poll the mempool while the user is
// in the scanning phase. This is the SOLE mempool poller for the scanning
// lifecycle — the modal subscribes to the snapshot it writes here and
// mirrors scanState into its own reducer. Returns a snapshot suitable for
// the banner plus a dismiss callback.
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

  // Poll mempool while scanning. `mined` is the only terminal state — it
  // holds until the user resumes or dismisses.
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.phase !== "scanning") return;
    if (snapshot.scanState === "mined") return;

    let cancelled = false;
    async function poll() {
      if (!snapshot) return;
      const result = await checkMempool(snapshot.name, snapshot.network);
      if (cancelled) return;
      let next: ScanState = "not_detected";
      if (result.found && result.response) {
        const { status } = result.response.state;
        if (status === "pending") next = "in_mempool";
        else if (status === "resolving") next = "confirming";
        else if (status === "confirmed") next = "mined";
      }
      if (next === snapshot.scanState) return;
      const updated: ResumeSnapshot = {
        ...snapshot,
        scanState: next,
        // Mirror into the inner reducer state so when the modal rehydrates
        // it picks up the latest scanState from the banner's polling.
        state: { ...(snapshot.state as Record<string, unknown>), scanState: next },
      };
      writeLocalStorage(RESUME_KEY, updated);
      notifyResumeChanged();
    }

    poll();
    const id = window.setInterval(poll, 2000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [snapshot]);

  const dismiss = useCallback(() => {
    clearResume();
    setSnapshot(null);
  }, []);

  const visible = snapshot !== null && BANNER_PHASES.has(snapshot.phase);
  return { snapshot, visible, dismiss };
}
