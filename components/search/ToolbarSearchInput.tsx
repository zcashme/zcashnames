"use client";

import type { FormEvent, KeyboardEvent } from "react";

interface ToolbarSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear?: () => void;
  placeholder?: string;
  ariaLabel?: string;
}

export default function ToolbarSearchInput({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = "Search...",
  ariaLabel = "Search names",
}: ToolbarSearchInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 min-w-[180px]">
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border py-2 pl-9 pr-16 text-sm outline-none"
        style={{
          background: "var(--color-raised)",
          borderColor: "var(--leaders-card-border)",
          color: "var(--fg-heading)",
        }}
      />
      {value.trim() && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-2 py-1 text-[0.72rem] font-semibold text-fg-muted transition-colors hover:text-fg-heading"
        >
          Clear
        </button>
      )}
    </form>
  );
}