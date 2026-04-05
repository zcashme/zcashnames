"use client";

import { useEffect, useRef, useState } from "react";

export type Environment = "all" | "mainnet" | "testnet";
export type SortBy = "height" | "name" | "type";

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
  const ref = useRef<HTMLDivElement>(null);
  const activeLabel = options.find((o) => o.value === value)?.label ?? value;

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
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
      )}
    </div>
  );
}

export default function ExplorerToolbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  environment,
  onEnvironmentChange,
  sortBy,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: () => void;
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[180px]">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
          aria-hidden="true"
        >
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSearchSubmit(); }}
          placeholder="Search..."
          className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
          style={{
            background: "var(--color-raised)",
            borderColor: "var(--leaders-card-border)",
            color: "var(--fg-heading)",
          }}
        />
      </div>
      <Dropdown
        value={environment}
        onChange={(v) => onEnvironmentChange(v as Environment)}
        options={[
          { value: "all", label: "All Environments" },
          { value: "mainnet", label: "Mainnet" },
          { value: "testnet", label: "Testnet" },
        ]}
      />
      <Dropdown
        value={sortBy}
        onChange={(v) => onSortChange(v as SortBy)}
        options={[
          { value: "height", label: "Last Updated" },
          { value: "name", label: "Name" },
          { value: "type", label: "Type" },
        ]}
      />
    </div>
  );
}
