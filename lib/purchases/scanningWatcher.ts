"use client";

// Module-scoped scanning watcher. One poll per (name, network), shared by
// all subscribers (modal + resume banner) via reference counting. Each tick
// fires checkMempool and resolveName in parallel — the indexer is the source
// of truth for "mined", the mempool result is intermediate UX flavor.
//
// The watcher emits RAW signals only. Subscribers compute their own
// scanState via `deriveScanState`, because the "is this mined" check
// depends on per-subscriber `expected` post-action state (claim destination
// address, listing price, etc).

import type { Action, Network, ResolveName, ScanState } from "@/lib/types";
import { checkMempool } from "@/lib/zns/mempool";
import { resolveName } from "@/lib/zns/resolve";

export interface ScanTick {
  mempool: Awaited<ReturnType<typeof checkMempool>>;
  // null when resolveName threw (network/parsing). Subscribers treat as
  // "not yet observed" — never as "mined".
  registration: ResolveName | null;
}

type Listener = (tick: ScanTick) => void;

interface Entry {
  listeners: Set<Listener>;
  intervalId: number;
  lastTick: ScanTick | null;
}

const POLL_MS = 2000;
const entries = new Map<string, Entry>();

function key(name: string, network: Network): string {
  return `${network}:${name}`;
}

async function pollOnce(name: string, network: Network, k: string): Promise<void> {
  const [mempool, registration] = await Promise.all([
    checkMempool(name, network),
    resolveName(name, network).catch(() => null),
  ]);
  const entry = entries.get(k);
  if (!entry) return;
  const tick: ScanTick = { mempool, registration };
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
    entry = { listeners: new Set(), intervalId: 0, lastTick: null };
    entries.set(k, entry);
    const id = window.setInterval(() => pollOnce(name, network, k), POLL_MS);
    entry.intervalId = id;
    pollOnce(name, network, k);
  }
  entry.listeners.add(listener);
  if (entry.lastTick) listener(entry.lastTick);

  return () => {
    const e = entries.get(k);
    if (!e) return;
    e.listeners.delete(listener);
    if (e.listeners.size === 0) {
      window.clearInterval(e.intervalId);
      entries.delete(k);
    }
  };
}

// Subscriber-provided post-action state. Compared against the resolver
// registration to decide whether the action has been mined.
export interface Expected {
  action: Action;
  address?: string;   // CLAIM / BUY / UPDATE
  priceZats?: number; // LIST
}

// True if the resolver reflects `expected` — i.e. the action is mined per
// the registry, the source of truth.
export function isExpectedMined(reg: ResolveName | null, expected: Expected): boolean {
  if (!reg) return false;
  switch (expected.action) {
    case "CLAIM":
    case "BUY":
    case "UPDATE":
      if (!expected.address) return false;
      if (reg.status !== "registered" && reg.status !== "listed") return false;
      return reg.registration.address === expected.address;
    case "LIST":
      if (reg.status !== "listed") return false;
      if (expected.priceZats == null) return false;
      return reg.listingPrice.zats === expected.priceZats;
    case "DELIST":
      return reg.status === "registered";
    case "RELEASE":
      return reg.status === "available";
  }
}

// State machine: indexer is the source of truth for "mined"; mempool is
// only used for the in-mempool / confirming / not_detected UX flavor.
// `sawMempool` latches so we never regress to not_detected after a glimpse.
export function deriveScanState(
  tick: ScanTick,
  expected: Expected,
  prev: { sawMempool: boolean },
): { scanState: ScanState; sawMempool: boolean } {
  if (isExpectedMined(tick.registration, expected)) {
    return { scanState: "mined", sawMempool: prev.sawMempool };
  }
  if (tick.mempool.found) {
    return { scanState: "in_mempool", sawMempool: true };
  }
  if (prev.sawMempool) {
    return { scanState: "confirming", sawMempool: true };
  }
  return { scanState: "not_detected", sawMempool: false };
}
