"use client";

import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type SharedSearchMode = "contains" | "exact";
export type InlineSearchFieldVariant = "table";
const TABLE_ACTION_INSET_PX = 4;

function ClearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function SearchModeDropdown({
  value,
  onChange,
  borderless = false,
}: {
  value: SharedSearchMode;
  onChange: (value: SharedSearchMode) => void;
  borderless?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const options: Array<{ value: SharedSearchMode; label: string }> = [
    { value: "contains", label: "Contains" },
    { value: "exact", label: "Exact" },
  ];
  const activeLabel = options.find((option) => option.value === value)?.label ?? "Contains";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--fg-muted)] transition-colors hover:text-[var(--color-accent-interactive)]"
        style={{
          background: borderless
            ? "transparent"
            : "color-mix(in srgb, var(--color-bg-elevated, transparent) 82%, transparent)",
          border: borderless ? "none" : "1px solid var(--faq-border)",
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Search mode: ${activeLabel}`}
      >
        <ChevronDownIcon />
      </button>
      <div
        className={`absolute left-0 top-full z-30 mt-2 min-w-[10rem] overflow-hidden rounded-2xl border transition-[opacity,transform] duration-150 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
        style={{
          borderColor: "var(--faq-border)",
          background: "var(--color-raised)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        }}
        role="menu"
        aria-label="Search mode options"
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={
                selected
                  ? "flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-[var(--color-accent-interactive)] transition-colors"
                  : "flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-[var(--fg-body)] transition-colors hover:text-[var(--color-accent-interactive)]"
              }
              style={{
                background: selected
                  ? "color-mix(in srgb, var(--color-accent-interactive) 14%, transparent)"
                  : "transparent",
                borderTop:
                  index === 0
                    ? "none"
                    : "1px solid color-mix(in srgb, var(--faq-border) 72%, transparent)",
              }}
              role="menuitemradio"
              aria-checked={selected}
            >
              <span>{option.label}</span>
              {selected ? <span aria-hidden="true">•</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type InlineSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  /** Shorter placeholder used when the full one cannot fit in the input. */
  placeholderCompact?: string;
  ariaLabel: string;
  searchMode: SharedSearchMode;
  onSearchModeChange: (value: SharedSearchMode) => void;
  onClear: () => void;
  submitDisabled?: boolean;
  showClear?: boolean;
  variant?: InlineSearchFieldVariant;
  className?: string;
  submitLabel?: string;
  borderlessModeTrigger?: boolean;
  clearAriaLabel?: string;
};

export function InlineSearchField({
  value,
  onChange,
  onSubmit,
  placeholder,
  placeholderCompact,
  ariaLabel,
  searchMode,
  onSearchModeChange,
  onClear,
  submitDisabled = false,
  showClear = false,
  variant = "table",
  className,
  submitLabel = "Search",
  borderlessModeTrigger = false,
  clearAriaLabel = "Clear search input",
}: InlineSearchFieldProps) {
  const hasInput = value.trim().length > 0;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const placeholderMeasureRef = useRef<HTMLSpanElement | null>(null);
  const [useCompactPlaceholder, setUseCompactPlaceholder] = useState(false);
  const resolvedPlaceholder =
    useCompactPlaceholder && placeholderCompact ? placeholderCompact : placeholder;
  const resolvedClassName =
    variant === "table"
      ? `relative min-w-0 max-w-full flex-1 sm:min-w-[240px] ${className ?? ""}`.trim()
      : className;
  const inputClassName = variant === "table" ? "pr-[8.75rem] text-sm" : "";
  const inputStyle: CSSProperties | undefined =
    variant === "table"
      ? {
          background: "var(--input-fill, transparent)",
          borderColor: "var(--faq-border)",
          color: "var(--fg-body)",
        }
      : undefined;
  const submitButtonClassName =
    variant === "table"
      ? "px-4 hover:opacity-85 disabled:cursor-not-allowed disabled:hover:opacity-100"
      : "";
  const submitButtonStyle: CSSProperties | undefined =
    variant === "table"
      ? {
          background: hasInput
            ? "var(--home-result-primary-bg)"
            : "color-mix(in srgb, var(--leaders-card-border) 22%, transparent)",
          color: hasInput ? "var(--home-result-primary-fg)" : "var(--fg-muted)",
          boxShadow: hasInput ? "var(--home-result-primary-shadow)" : "none",
        }
      : undefined;
  const resolvedBorderlessModeTrigger = variant === "table" || borderlessModeTrigger;

  useLayoutEffect(() => {
    if (!placeholderCompact) {
      setUseCompactPlaceholder(false);
      return;
    }

    const input = inputRef.current;
    const measure = placeholderMeasureRef.current;
    if (!input || !measure) return;

    function recompute() {
      const el = inputRef.current;
      const label = placeholderMeasureRef.current;
      if (!el || !label) return;

      const styles = window.getComputedStyle(el);
      label.style.font = styles.font;
      label.style.letterSpacing = styles.letterSpacing;
      label.style.textTransform = styles.textTransform;
      label.textContent = placeholder;

      const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
      // Small safety margin so the placeholder does not sit flush against the Search control.
      const available = Math.max(0, el.clientWidth - paddingLeft - paddingRight - 8);
      const needsCompact = label.offsetWidth > available;
      setUseCompactPlaceholder((current) => (current === needsCompact ? current : needsCompact));
    }

    recompute();
    const observer = new ResizeObserver(() => recompute());
    observer.observe(input);
    return () => observer.disconnect();
  }, [placeholder, placeholderCompact, showClear, submitLabel]);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={resolvedClassName}
    >
      <label className="block min-w-0 flex-1">
        <span className="relative flex items-center">
          {/* Zero-size host so placeholder measure text never expands page width. */}
          {placeholderCompact ? (
            <span
              className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden"
              aria-hidden="true"
            >
              <span ref={placeholderMeasureRef} className="whitespace-nowrap opacity-0" />
            </span>
          ) : null}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={resolvedPlaceholder}
            aria-label={ariaLabel}
            className={`w-full rounded-2xl border py-3 pl-[5.75rem] outline-none transition ${inputClassName ?? ""}`.trim()}
            style={inputStyle}
          />
          <span className="absolute inset-y-0 left-3 flex items-center gap-1">
            <SearchModeDropdown
              value={searchMode}
              onChange={onSearchModeChange}
              borderless={resolvedBorderlessModeTrigger}
            />
            <span
              className="pointer-events-none flex items-center"
              style={{ color: "var(--fg-muted)" }}
              aria-hidden="true"
            >
              <SearchIcon />
            </span>
          </span>
          <span
            className="absolute flex items-center gap-1.5"
            style={{
              top: TABLE_ACTION_INSET_PX,
              right: TABLE_ACTION_INSET_PX,
              bottom: TABLE_ACTION_INSET_PX,
            }}
          >
            {showClear ? (
              <button
                type="button"
                onClick={onClear}
                className="inline-flex h-[calc(100%-2px)] w-9 items-center justify-center rounded-[13px] text-[color:var(--fg-muted)] leading-none transition-colors hover:text-[var(--color-accent-interactive)]"
                aria-label={clearAriaLabel}
              >
                <ClearIcon />
              </button>
            ) : null}
            <button
              type="submit"
              disabled={submitDisabled}
              className={`inline-flex h-[calc(100%-2px)] shrink-0 items-center justify-center rounded-[13px] text-sm font-semibold leading-none transition ${submitButtonClassName ?? ""}`.trim()}
              style={submitButtonStyle}
            >
              {submitLabel}
            </button>
          </span>
        </span>
      </label>
    </form>
  );
}
