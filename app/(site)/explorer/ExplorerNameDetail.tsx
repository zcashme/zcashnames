"use client";

import type { ResolveName } from "@/lib/types";
import type { ZnsEvent } from "@/lib/zns/client";
import ActionBadge from "@/components/ActionBadge";

export default function ExplorerNameDetail({
  query,
  result,
  events,
  isPending,
  onClear,
}: {
  query: string;
  result: ResolveName | null;
  events: ZnsEvent[];
  isPending: boolean;
  onClear: () => void;
}) {
  if (!query) return null;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
    >
      {isPending ? (
        <div className="flex items-center gap-2 text-fg-muted text-sm">
          <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-fg-dim border-t-transparent" />
          Searching...
        </div>
      ) : result ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-fg-heading">{result.query}.zcash</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                style={{
                  background: result.status === "available"
                    ? "var(--color-accent-green)"
                    : result.status === "listed"
                    ? "var(--color-brand-blue, #3b82f6)"
                    : "var(--fg-dim)",
                  color: "var(--leaders-rank-text)",
                }}
              >
                {result.status === "listed" ? "For Sale" : result.status}
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

          {(result.status === "registered" || result.status === "listed") && (
            <div className="flex flex-col gap-1.5 text-sm">
              <div>
                <span className="text-fg-muted">Address: </span>
                <span className="font-mono text-fg-muted break-all">{result.registration.address}</span>
              </div>
              <div>
                <span className="text-fg-muted">Block: </span>
                <span className="text-fg-muted">{result.registration.height.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-fg-muted">Txid: </span>
                <span className="font-mono text-fg-muted break-all">{result.registration.txid}</span>
              </div>
              {result.status === "listed" && (
                <div>
                  <span className="text-fg-muted">Price: </span>
                  <span className="text-fg-muted">{result.listingPrice.zec} ZEC</span>
                </div>
              )}
            </div>
          )}

          {result.status === "available" && (
            <div className="text-sm">
              <span className="text-fg-muted">Claim cost: </span>
              <span className="text-fg-muted">{result.claimCost.zec} ZEC</span>
            </div>
          )}

          {events.length > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--leaders-card-border)" }}>
              <h3 className="text-sm font-semibold text-fg-heading">History</h3>
              {events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 text-sm">
                  <ActionBadge action={ev.action} />
                  <span className="text-fg-muted">block {ev.height.toLocaleString()}</span>
                  <span className="font-mono text-fg-muted text-xs truncate max-w-[12rem]">{ev.txid}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-fg-muted">No results for &ldquo;{query}&rdquo;</p>
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-fg-muted hover:text-fg-heading transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
