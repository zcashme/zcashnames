/**
 * ExplorerToolbar — search and network controls for the explorer page.
 * Search supports draft Contains/Exact modes and an inline Search action.
 */
"use client";

import { useState } from "react";
import { InlineSearchField } from "@/components/search/InlineSearchField";
import type { Network } from "@/lib/types";
import type { ExplorerSearchMode } from "./listConfig";

function EllipsisIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

function Dropdown({
  value,
  onChange,
  options,
  iconOnly = false,
  triggerAriaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  iconOnly?: boolean;
  triggerAriaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          iconOnly
            ? "zns-hover-accent inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition"
            : "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border py-2 pl-3 pr-2.5 text-[0.78rem] font-semibold transition-colors whitespace-nowrap"
        }
        style={{
          background: iconOnly ? "transparent" : "var(--color-raised)",
          borderColor: iconOnly ? "transparent" : "var(--leaders-card-border)",
          color: iconOnly ? "var(--fg-muted)" : "var(--fg-heading)",
        }}
        aria-label={triggerAriaLabel}
      >
        {iconOnly ? (
          <EllipsisIcon />
        ) : (
          <>
            {activeLabel}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-3.5 w-3.5 text-fg-muted"
              aria-hidden="true"
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>
      <div className={`fixed inset-0 z-20 ${open ? "block" : "hidden"}`} onClick={() => setOpen(false)} />
      <div
        className={`absolute right-0 top-full z-30 mt-2 min-w-full overflow-hidden rounded-2xl border py-1 transition-[opacity,transform] duration-150 ease-out ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        style={{
          background: "var(--leaders-card-bg-solid, var(--leaders-card-bg))",
          borderColor: "var(--leaders-card-border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className="zns-menu-hover flex w-full cursor-pointer items-center px-4 py-2 text-[0.78rem] font-semibold transition-colors whitespace-nowrap"
            style={{
              color: value === option.value ? "var(--fg-heading)" : "var(--fg-muted)",
              background:
                value === option.value ? "var(--market-stats-segment-active-bg)" : "transparent",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ExplorerToolbar({
  searchQuery,
  searchMode,
  onSearchChange,
  onSearchModeChange,
  onSearchSubmit,
  onClearSearch,
  network,
  onNetworkChange,
}: {
  searchQuery: string;
  searchMode: ExplorerSearchMode;
  onSearchChange: (q: string) => void;
  onSearchModeChange: (mode: ExplorerSearchMode) => void;
  onSearchSubmit: () => void;
  onClearSearch: () => void;
  network: Network;
  onNetworkChange: (n: Network) => void;
}) {
  const hasInput = !!searchQuery.trim();

  return (
    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <InlineSearchField
        value={searchQuery}
        onChange={onSearchChange}
        onSubmit={onSearchSubmit}
        variant="table"
        placeholder="Name, address, or transaction ID..."
        placeholderCompact="Name, addr, txid..."
        ariaLabel="Search explorer names"
        searchMode={searchMode}
        onSearchModeChange={(value) => onSearchModeChange(value as ExplorerSearchMode)}
        onClear={onClearSearch}
        submitDisabled={!hasInput}
        showClear={hasInput}
      />

      <Dropdown
        value={network}
        onChange={(value) => onNetworkChange(value as Network)}
        iconOnly
        triggerAriaLabel="Network options"
        options={[
          { value: "mainnet", label: "Mainnet" },
          { value: "testnet", label: "Testnet" },
        ]}
      />
    </div>
  );
}
