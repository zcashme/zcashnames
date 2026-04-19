"use client";

import { useState } from "react";
import Image from "next/image";
import type { ResolveName } from "@/lib/types";
import type { Action } from "@/lib/types";
import type { Event } from "@/lib/zns/client";
import { formatUsdEquivalent } from "@/lib/zns/name";
import ActionBadge from "@/components/ActionBadge";
import CopyIconButton from "@/components/CopyIconButton";

export default function ExplorerNameDetail({
  query,
  result,
  events,
  isPending,
  usdPerZec,
  onAction,
}: {
  query: string;
  result: ResolveName | null;
  events: Event[];
  isPending: boolean;
  usdPerZec: number | null;
  onAction: (action: Action) => void;
}) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      window.setTimeout(() => setCopiedValue(null), 1600);
    } catch {
      setCopiedValue(null);
    }
  }

  if (!query) return null;

  const listed = result?.status === "listed" ? result : null;
  const isRegisteredName = result?.status === "registered" || result?.status === "listed";
  const encodedName = encodeURIComponent(result?.query ?? query);
  const zcashMeUrl = `https://zcash.me/${encodedName}`;
  const usdLabel = listed ? formatUsdEquivalent(listed.listingPrice.zec, usdPerZec) : "";

  return (
    <div
      data-testid="explorer-name-detail"
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
          {listed && (
            <div className="flex flex-col gap-3">
              <div className="home-result-trust-pills">
                <span className="home-result-feature-chip">
                  {listed.query.length} characters
                </span>
                {listed.firstBucket && (
                  <span className="home-result-feature-chip">
                    First {listed.firstBucket}
                  </span>
                )}
              </div>
              <div
                className="h-px w-full"
                style={{ background: "var(--leaders-card-border)" }}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold text-fg-heading">{result.query}</span>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                style={{
                  background:
                    result.status === "available"
                      ? "var(--color-accent-green)"
                      : result.status === "listed"
                        ? "var(--home-result-status-forsale-bg)"
                        : "var(--fg-dim)",
                  color:
                    result.status === "listed"
                      ? "var(--home-result-status-forsale-fg)"
                      : "var(--leaders-rank-text)",
                  border:
                    result.status === "listed"
                      ? "1px solid var(--home-result-status-forsale-border)"
                      : "1px solid transparent",
                }}
              >
                {result.status === "listed" ? "For Sale" : result.status}
              </span>
              {listed && (
                <div className="flex items-baseline gap-2">
                  <p className="m-0 text-[var(--home-result-price-color)] text-[clamp(1.02rem,1.85vw,1.3rem)] font-extrabold tracking-[-0.012em]">
                    {listed.listingPrice.zec} ZEC
                  </p>
                  {usdLabel && (
                    <span className="text-[0.82rem] font-medium text-[var(--fg-muted)]">
                      {usdLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {listed && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-start gap-2">
                <button
                  type="button"
                  className="home-result-action is-primary"
                  onClick={() => onAction("buy")}
                >
                  Buy Now
                </button>
                <button
                  type="button"
                  className="home-result-action is-secondary"
                  onClick={() => onAction("delist")}
                >
                  Delist from Sale
                </button>
                <button
                  type="button"
                  className="home-result-action is-secondary"
                  onClick={() => onAction("release")}
                >
                  Release Name
                </button>
              </div>
              <div
                className="h-px w-full"
                style={{ background: "var(--leaders-card-border)" }}
              />
            </div>
          )}

          {(result.status === "registered" || result.status === "listed") && (
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-start gap-2">
                <span className="text-fg-muted">Address:</span>
                <span className="min-w-0 flex-1 font-mono text-fg-muted break-all">
                  {result.registration.address}
                </span>
                <CopyIconButton
                  onClick={() => copyValue(result.registration.address)}
                  ariaLabel="Copy address"
                  title={copiedValue === result.registration.address ? "Copied!" : "Copy address"}
                  copied={copiedValue === result.registration.address}
                />
              </div>
              <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-start gap-2">
                <span className="text-fg-muted">Block:</span>
                <span className="text-fg-muted">{result.registration.height.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-start gap-2">
                <span className="text-fg-muted">Txid:</span>
                <span className="min-w-0 flex-1 font-mono text-fg-muted break-all">
                  {result.registration.txid}
                </span>
                <CopyIconButton
                  onClick={() => copyValue(result.registration.txid)}
                  ariaLabel="Copy registration txid"
                  title={copiedValue === result.registration.txid ? "Copied!" : "Copy registration txid"}
                  copied={copiedValue === result.registration.txid}
                />
              </div>
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
                <div
                  key={ev.id}
                  className="grid grid-cols-[5.75rem_6.75rem_minmax(0,1fr)_auto] items-start gap-3 text-sm"
                >
                  <ActionBadge action={ev.action} />
                  <span className="text-fg-muted">block {ev.height.toLocaleString()}</span>
                  <span className="min-w-[12rem] flex-1 font-mono text-fg-muted text-xs break-all">
                    {ev.txid}
                  </span>
                  <CopyIconButton
                    onClick={() => copyValue(ev.txid)}
                    ariaLabel={`Copy ${ev.action} txid`}
                    title={copiedValue === ev.txid ? "Copied!" : `Copy ${ev.action} txid`}
                    copied={copiedValue === ev.txid}
                  />
                </div>
              ))}
            </div>
          )}

          {isRegisteredName && (
            <div className="flex flex-col gap-3 pt-1">
              <div
                data-testid="listed-detail-divider"
                className="h-px w-full"
                style={{ background: "var(--leaders-card-border)" }}
              />
              <div className="home-result-links">
                <a
                  href={zcashMeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="home-result-link inline-flex items-center gap-1.5 whitespace-nowrap leading-none"
                >
                  <Image
                    src="/assets/icons/zcashme-favicon-64.png"
                    alt="ZcashMe logo"
                    width={18}
                    height={18}
                    className="theme-media-home scale-[1.35]"
                  />
                  <span className="inline-flex items-center leading-none">View on ZcashMe</span>
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-fg-muted">No results for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
