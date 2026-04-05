"use client";

import { useEffect, useState } from "react";
import { resolveName, getEvents } from "@/lib/zns/resolve";
import type { Network } from "@/lib/zns/name";
import type { ResolveName } from "@/lib/types";
import type { ZnsEvent } from "@/lib/zns/client";
import ActionBadge from "@/components/ActionBadge";

export default function ExplorerNameDetail({
  query,
  network,
  onClear,
}: {
  query: string;
  network: Network;
  onClear: () => void;
}) {
  const [nameResult, setNameResult] = useState<ResolveName | null>(null);
  const [nameEvents, setNameEvents] = useState<ZnsEvent[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setSearching(true);
    setNameResult(null);
    setNameEvents([]);

    (async () => {
      try {
        const res = await resolveName(query, network);
        if (cancelled) return;
        setNameResult(res);
        const ev = await getEvents({ name: query, limit: 20 }, network);
        if (!cancelled) setNameEvents(ev.events);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => { cancelled = true; };
  }, [query, network]);

  if (!query) return null;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
    >
      {searching ? (
        <div className="flex items-center gap-2 text-fg-muted text-sm">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-fg-dim border-t-transparent" />
          Searching...
        </div>
      ) : nameResult && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-fg-heading">{nameResult.query}.zcash</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                style={{
                  background: nameResult.status === "available"
                    ? "var(--color-accent-green)"
                    : nameResult.status === "listed"
                    ? "var(--color-brand-blue, #3b82f6)"
                    : "var(--fg-dim)",
                  color: "var(--leaders-rank-text)",
                }}
              >
                {nameResult.status === "listed" ? "For Sale" : nameResult.status}
              </span>
            </div>
            <button
              type="button"
              onClick={onClear}
              className="text-sm text-fg-muted hover:text-fg-heading transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          {(nameResult.status === "registered" || nameResult.status === "listed") && (
            <div className="flex flex-col gap-1.5 text-sm">
              <div>
                <span className="text-fg-muted">Address: </span>
                <span className="font-mono text-fg-muted break-all">{nameResult.registration.address}</span>
              </div>
              <div>
                <span className="text-fg-muted">Block: </span>
                <span className="text-fg-muted">{nameResult.registration.height.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-fg-muted">Txid: </span>
                <span className="font-mono text-fg-muted break-all">{nameResult.registration.txid}</span>
              </div>
              {nameResult.status === "listed" && (
                <div>
                  <span className="text-fg-muted">Price: </span>
                  <span className="text-fg-muted">{nameResult.listingPrice.zec} ZEC</span>
                </div>
              )}
            </div>
          )}

          {nameResult.status === "available" && (
            <div className="text-sm">
              <span className="text-fg-muted">Claim cost: </span>
              <span className="text-fg-muted">{nameResult.claimCost.zec} ZEC</span>
            </div>
          )}

          {nameEvents.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--leaders-card-border)" }}>
              <h3 className="text-sm font-semibold text-fg-heading">History</h3>
              {nameEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 text-sm">
                  <ActionBadge action={ev.action} />
                  <span className="text-fg-muted">block {ev.height.toLocaleString()}</span>
                  <span className="font-mono text-fg-muted text-xs truncate max-w-[12rem]">{ev.txid}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
