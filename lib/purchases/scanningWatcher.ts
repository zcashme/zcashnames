"use client";

// Module-scoped scanning watcher. One poll per (name, network), shared by
// all subscribers (form + resume banner) via reference counting.
//
// The resolver is the source of truth: every tick re-resolves the name and
// emits the current Registration (or null once a release has landed).
// Subscribers compare against their own baseline to derive ScanState —
// "is this mined" depends on the per-subscriber expectation (claim appears,
// update txid changes, release disappears).

import type { Network, Registration, ScanState } from "@/lib/types";
import { resolveName } from "@/lib/zns/resolve";

export interface ScanTick {
  /** Latest resolver state for the name — null when no live registration. */
  registration: Registration | null;
}

type Listener = (tick: ScanTick) => void;

interface Entry {
  listeners: Set<Listener>;
  intervalId: number;
  lastTick: ScanTick | null;
}

const POLL_MS = 2500;
const entries = new Map<string, Entry>();

function key(name: string, network: Network): string {
  return `${network}:${name}`;
}

async function pollOnce(name: string, network: Network, k: string): Promise<void> {
  let registration: Registration | null = null;
  try {
    const result = await resolveName(name, network);
    if (result.status === "registered") registration = result.registration;
  } catch {
    // Resolver hiccup — emit the previous tick so listeners don't flap.
  }
  const entry = entries.get(k);
  if (!entry) return;
  const tick: ScanTick = { registration };
  entry.lastTick = tick;
  entry.listeners.forEach((fn) => fn(tick));
}

// Subscribe to scanning ticks for (name, network). Listener fires once
// with the cached tick (if any), then on every poll. Returns unsubscribe.
export function watchScanning(
  name: string,
  network: Network,
  listener: Listener,
): () => void {
  const k = key(name, network);
  let entry = entries.get(k);
  if (!entry) {
    entry = {
      listeners: new Set(),
      intervalId: 0,
      lastTick: null,
    };
    entry.intervalId = window.setInterval(() => {
      void pollOnce(name, network, k);
    }, POLL_MS);
    void pollOnce(name, network, k);
    entries.set(k, entry);
  }
  entry.listeners.add(listener);
  if (entry.lastTick) listener(entry.lastTick);

  return () => {
    const current = entries.get(k);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      window.clearInterval(current.intervalId);
      entries.delete(k);
    }
  };
}

// What "done" looks like, per action, against the flow's baseline:
//   CLAIM   a live registration exists (optionally matching the target UA)
//   UPDATE  the live registration's txid differs from the baseline
//   RELEASE no live registration remains
export function deriveScanState(
  tick: ScanTick,
  expected: {
    action: "CLAIM" | "UPDATE" | "RELEASE";
    targetAddress?: string;
    baselineTxid: string;
  },
): ScanState {
  const { registration } = tick;

  if (expected.action === "RELEASE") {
    return registration === null ? "mined" : "not_detected";
  }

  if (registration === null) return "not_detected";

  if (expected.action === "CLAIM") {
    if (expected.targetAddress && registration.address !== expected.targetAddress) {
      // Someone else's claim won the race; still "done" for this name.
      return "mined";
    }
    return "mined";
  }

  // UPDATE: any new Name Note for the name (txid moved off the baseline).
  if (expected.baselineTxid && registration.txid === expected.baselineTxid) {
    return "not_detected";
  }
  return "mined";
}
