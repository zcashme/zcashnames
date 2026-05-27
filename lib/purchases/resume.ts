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
export const PURCHASE_MODAL_VISIBILITY_EVENT = "zns:purchase-modal-visibility";

export function notifyPurchaseModalVisibility(open: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PURCHASE_MODAL_VISIBILITY_EVENT, { detail: { open } }));
}

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

export interface ResumeTarget {
  action: Action;
  name: string;
  network: Network;
}

function sameResumeTarget(a: ResumeTarget, b: ResumeTarget): boolean {
  return (
    a.action === b.action &&
    a.network === b.network &&
    a.name.toLowerCase() === b.name.toLowerCase()
  );
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

// Product rule: one active minimized purchase action at a time. Starting a
// different action should be intentional instead of silently replacing it.
export function getResumeToReplace<S = unknown>(next: ResumeTarget): ResumeSnapshot<S> | null {
  const existing = readResume();
  if (!existing || sameResumeTarget(existing, next)) return null;
  return existing as ResumeSnapshot<S>;
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
