"use client";

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

export default function SearchResultsSummary({
  query,
  matchCount,
  onClear,
  clearLabel = "Clear results",
}: {
  query: string;
  matchCount: number | null;
  onClear: () => void;
  clearLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-base font-semibold" style={{ color: "var(--fg-heading)" }}>
          Results for "{query}"
        </span>
        {matchCount != null ? (
          <span className="text-sm" style={{ color: "var(--fg-muted)" }}>
            {matchCount} {matchCount === 1 ? "match" : "matches"}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-[var(--fg-heading)]"
        style={{ color: "var(--color-accent-interactive)" }}
      >
        <span>{clearLabel}</span>
        <span className="inline-flex items-center self-center leading-none" aria-hidden="true">
          <ClearIcon />
        </span>
      </button>
    </div>
  );
}
