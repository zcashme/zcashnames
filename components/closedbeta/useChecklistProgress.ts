"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BETA_CHECKLIST } from "@/lib/beta/checklist";
import { loadChecklistProgress, saveChecklistProgress } from "@/lib/beta/actions";

// Shared client-side state for the beta checklist.
//
// Design notes:
//   - React state is the source of truth for the active hook instance.
//     localStorage is a write-through cache, never re-read after mount inside
//     this same window.
//   - Multiple instances in the same window (e.g. modal header progress bar +
//     checklist tab body) stay in sync via a custom event whose detail carries
//     the new state — no localStorage round-trip, no race.
//   - Cross-tab/cross-window sync uses the native `storage` event; that path
//     does re-read localStorage because the new value arrived from outside this
//     JS realm.
//   - DB persistence is fire-and-forget. `toggle()` returns immediately; the
//     server upsert is debounced ~300ms per item so rapid double-clicks coalesce
//     into a single network call carrying the latest value.
//   - On first mount with a real tester, server state is loaded once. If the
//     user hasn't toggled anything yet, the server snapshot replaces local
//     state (DB wins over stale local). After any toggle, server hydration is
//     ignored to avoid stomping fresh clicks.
//   - Per-item save status is tracked: 'saving' (debounce in flight or upsert
//     in flight) → 'saved' (auto-clears after 1500ms) → idle.

const SYNC_EVENT = "zns:beta-checklist-change";
const SAVE_DEBOUNCE_MS = 300;
const SAVED_INDICATOR_MS = 1500;
const CHECKLIST_ITEM_IDS = new Set(BETA_CHECKLIST.map((item) => item.id));

export type ChecklistStage = "testnet" | "mainnet";
export type ItemSaveStatus = "saving" | "saved";

function storageKey(testerName: string | null, stage: ChecklistStage): string {
  return `beta:checklist:${testerName ?? "anonymous"}:${stage}`;
}

function loadState(testerName: string | null, stage: ChecklistStage): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(testerName, stage));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? sanitizeState(parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function sanitizeState(state: Record<string, boolean>): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(state).filter(([itemId]) => CHECKLIST_ITEM_IDS.has(itemId)),
  );
}

function persistState(
  testerName: string | null,
  stage: ChecklistStage,
  state: Record<string, boolean>,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(testerName, stage), JSON.stringify(state));
  } catch {
    // localStorage full / blocked — silent fallback
  }
}

interface SyncEventDetail {
  testerName: string | null;
  stage: ChecklistStage;
  state: Record<string, boolean>;
}

export interface ChecklistProgress {
  state: Record<string, boolean>;
  hydrated: boolean;
  completed: number;
  total: number;
  toggle: (itemId: string) => void;
  /** Per-item save status. Missing key = idle. */
  saveStatus: Record<string, ItemSaveStatus>;
}

export function useChecklistProgress(
  testerName: string | null,
  stage: ChecklistStage,
): ChecklistProgress {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<Record<string, ItemSaveStatus>>({});

  // Tracks whether the user has clicked something since mount. Used to gate
  // server hydration so an in-flight server response can't stomp a fresh click.
  const userTouchedRef = useRef(false);

  // Per-item debounce timers + the latest pending value waiting to be flushed.
  const flushTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pendingValuesRef = useRef<Map<string, boolean>>(new Map());
  // Auto-clear timers for the "saved" indicator.
  const savedTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Initial mount: hydrate from localStorage immediately, then optionally from
  // the server (real testers only).
  useEffect(() => {
    userTouchedRef.current = false;
    const local = loadState(testerName, stage);
    setState(local);
    setHydrated(true);

    if (!testerName) return;
    let cancelled = false;
    loadChecklistProgress(stage)
      .then((server) => {
        if (cancelled) return;
        if (userTouchedRef.current) return; // user already clicked — don't stomp
        // Only update if the server snapshot actually differs.
        const sanitizedServer = sanitizeState(server);
        const same =
          Object.keys(sanitizedServer).length === Object.keys(local).length &&
          Object.keys(sanitizedServer).every((k) => sanitizedServer[k] === local[k]);
        if (same) return;
        setState(sanitizedServer);
        persistState(testerName, stage, sanitizedServer);
        window.dispatchEvent(
          new CustomEvent<SyncEventDetail>(SYNC_EVENT, {
            detail: { testerName, stage, state: sanitizedServer },
          }),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [testerName, stage]);

  // Listen for changes from sibling instances of the hook (same window) and
  // from other tabs (storage event).
  useEffect(() => {
    function handleSync(e: Event) {
      const detail = (e as CustomEvent<SyncEventDetail>).detail;
      if (!detail) return;
      if (detail.testerName !== testerName || detail.stage !== stage) return;
      // Trust the payload directly — no localStorage round-trip.
      setState(detail.state);
    }
    function handleStorage(e: StorageEvent) {
      if (e.key !== storageKey(testerName, stage)) return;
      // Cross-realm change: re-read localStorage (it's the only signal we have).
      setState(loadState(testerName, stage));
    }
    window.addEventListener(SYNC_EVENT, handleSync as EventListener);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, [testerName, stage]);

  // Schedule a coalesced flush for an item. Each call resets the per-item
  // debounce timer; only the latest pending value will be sent.
  const scheduleFlush = useCallback(
    (itemId: string, value: boolean) => {
      pendingValuesRef.current.set(itemId, value);

      const existing = flushTimersRef.current.get(itemId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        flushTimersRef.current.delete(itemId);
        const completed = pendingValuesRef.current.get(itemId);
        pendingValuesRef.current.delete(itemId);
        if (completed === undefined) return;

        // Anonymous testers: action is a no-op, but we still want a brief
        // "saved" tick for feedback. Skip the call entirely to avoid the
        // round-trip and just flash the indicator.
        if (!testerName) {
          setSaveStatus((prev) => ({ ...prev, [itemId]: "saved" }));
          const t = setTimeout(() => {
            setSaveStatus((prev) => {
              const next = { ...prev };
              delete next[itemId];
              return next;
            });
            savedTimersRef.current.delete(itemId);
          }, SAVED_INDICATOR_MS);
          savedTimersRef.current.set(itemId, t);
          return;
        }

        saveChecklistProgress({ stage, itemId, completed })
          .then(() => {
            setSaveStatus((prev) => ({ ...prev, [itemId]: "saved" }));
            const existingSavedTimer = savedTimersRef.current.get(itemId);
            if (existingSavedTimer) clearTimeout(existingSavedTimer);
            const t = setTimeout(() => {
              setSaveStatus((prev) => {
                const next = { ...prev };
                delete next[itemId];
                return next;
              });
              savedTimersRef.current.delete(itemId);
            }, SAVED_INDICATOR_MS);
            savedTimersRef.current.set(itemId, t);
          })
          .catch(() => {
            // On failure: drop the saving indicator and let the user click
            // again. The localStorage value is still correct.
            setSaveStatus((prev) => {
              const next = { ...prev };
              delete next[itemId];
              return next;
            });
          });
      }, SAVE_DEBOUNCE_MS);

      flushTimersRef.current.set(itemId, timer);
    },
    [testerName, stage],
  );

  const toggle = useCallback(
    (itemId: string) => {
      userTouchedRef.current = true;
      setState((prev) => {
        const next = { ...prev, [itemId]: !prev[itemId] };
        persistState(testerName, stage, next);
        // Notify in-window siblings with the new state directly — no
        // localStorage re-read, no race.
        window.dispatchEvent(
          new CustomEvent<SyncEventDetail>(SYNC_EVENT, {
            detail: { testerName, stage, state: next },
          }),
        );
        // Mark the item as saving and schedule the debounced flush.
        // Cancel any pending "saved" indicator clear, since we're starting a
        // new save cycle.
        const savedTimer = savedTimersRef.current.get(itemId);
        if (savedTimer) {
          clearTimeout(savedTimer);
          savedTimersRef.current.delete(itemId);
        }
        scheduleFlush(itemId, next[itemId]);
        return next;
      });
      setSaveStatus((prev) => ({ ...prev, [itemId]: "saving" }));
    },
    [testerName, stage, scheduleFlush],
  );

  // Cleanup any pending timers on unmount.
  useEffect(() => {
    const flushTimers = flushTimersRef.current;
    const savedTimers = savedTimersRef.current;
    return () => {
      for (const t of flushTimers.values()) clearTimeout(t);
      for (const t of savedTimers.values()) clearTimeout(t);
      flushTimers.clear();
      savedTimers.clear();
    };
  }, []);

  const completed = BETA_CHECKLIST.filter((item) => state[item.id]).length;
  const total = BETA_CHECKLIST.length;

  return { state, hydrated, completed, total, toggle, saveStatus };
}
