/**
 * ExplorerToolbar — the filter bar for the explorer page.
 * Renders a search input (delegated to ToolbarSearchInput) and a network
 * selector (Mainnet / Testnet). All state is lifted to ExplorerView; this
 * component only receives callbacks.
 */
"use client";

import { useState } from "react";
import ToolbarSearchInput from "@/components/search/ToolbarSearchInput";
import type { Network } from "@/lib/types";

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border py-2 pl-3 pr-2.5 text-[0.78rem] font-semibold transition-colors whitespace-nowrap"
        style={{
          background: "var(--color-raised)",
          borderColor: "var(--leaders-card-border)",
          color: "var(--fg-heading)",
        }}
      >
        {activeLabel}
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-fg-muted" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        <div
          className="absolute right-0 top-full z-30 mt-1 min-w-full rounded-xl border py-1"
          style={{
            background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
            borderColor: "var(--leaders-card-border)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex w-full cursor-pointer items-center px-4 py-2 text-[0.78rem] font-semibold transition-colors whitespace-nowrap"
              style={{
                color: value === o.value ? "var(--fg-heading)" : "var(--fg-muted)",
                background: value === o.value ? "var(--market-stats-segment-active-bg)" : "transparent",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

export default function ExplorerToolbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  network,
  onNetworkChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  network: Network;
  onNetworkChange: (n: Network) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToolbarSearchInput
        value={searchQuery}
        onChange={onSearchChange}
        onSubmit={onSearchSubmit}
        onClear={onClearSearch}
      />
      <Dropdown
        value={network}
        onChange={(v) => onNetworkChange(v as Network)}
        options={[
          { value: "mainnet", label: "Mainnet" },
          { value: "testnet", label: "Testnet" },
        ]}
      />
    </div>
  );
}