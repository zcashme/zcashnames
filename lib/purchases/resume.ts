"use client";

// Resume contract between Zip321Modal (writer) and the homepage/explorer
// banner (reader). The modal persists its full reducer state on every
// dispatch; the banner reads a slim view of that state to render a pill.
//
// Two surfaces hit this storage key:
//   - Zip321Modal — writes the full snapshot, rehydrates the reducer.
//   - usePurchaseResume — reads + polls when the modal is closed.
//
// The serialized `phase` is what consumers without `resolveResult` use to
// decide whether to render the banner. The modal recomputes phase from
// `state.step` on read, so the serialized phase is only for outside readers.

import type { Action, Network, Phase, ScanState } from "@/lib/types";

export const RESUME_KEY = "zns-modal-resume-v1";

// Custom DOM event the modal fires after a localStorage write so same-tab
// listeners (the banner) update without polling storage. The browser's
// native `storage` event only fires in other tabs.
export const RESUME_EVENT = "zns:resume-changed";

// What the banner needs. The modal's full state is included as a black box
// (`state`) so the modal can rehydrate without a second migration path.
export interface ResumeSnapshot<S = unknown> {
  action: Action;
  name: string;
  network: Network;
  phase: Phase;
  phases?: Phase[];
  // Useful subset surfaced for the banner; redundant with state but typed.
  scanState: ScanState;
  state: S;
}

export function readResume<S = unknown>(): ResumeSnapshot<S> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResumeSnapshot<S>;
  } catch {
    return null;
  }
}

export function clearResume(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESUME_KEY);
    window.dispatchEvent(new CustomEvent(RESUME_EVENT));
  } catch {
    // blocked
  }
}

// Called by the modal after writing the snapshot — notifies same-tab readers.
export function notifyResumeChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RESUME_EVENT));
}
