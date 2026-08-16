"use client";

import type { CSSProperties } from "react";

type PaginationItem = number | "ellipsis-left" | "ellipsis-right";

function buildPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 2) {
    start = 2;
    end = 3;
  } else if (currentPage >= totalPages - 1) {
    start = totalPages - 2;
    end = totalPages - 1;
  }

  const items: PaginationItem[] = [1];

  if (start > 2) {
    items.push("ellipsis-left");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);
  return items;
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export default function PaginationControls({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  className,
  style,
  testId,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  testId?: string;
}) {
  if (totalPages <= 1) return null;

  const canGoPrev = page > 1 && !disabled;
  const canGoNext = page < totalPages && !disabled;
  const items = buildPaginationItems(page, totalPages);

  const inactiveChromeStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--color-bg-elevated, transparent) 78%, transparent)",
    boxShadow: "none",
  };

  const activePillStyle: CSSProperties = {
    background: "color-mix(in srgb, var(--color-accent-interactive) 14%, transparent)",
    color: "var(--color-accent-interactive)",
    boxShadow: "none",
  };

  const containerClassName = ["flex flex-wrap items-center justify-center gap-2 px-6 py-3", className]
    .filter(Boolean)
    .join(" ");

  // Class-based borders so hover:border can override resting faq-border.
  const inactiveHoverClass =
    "border border-[var(--faq-border)] transition-colors duration-200 hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)] disabled:hover:border-[var(--faq-border)] disabled:hover:text-[color:var(--fg-body)]";

  return (
    <div className={containerClassName} style={style} data-testid={testId}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canGoPrev}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--fg-body)] disabled:cursor-not-allowed disabled:opacity-45 ${inactiveHoverClass}`}
        style={inactiveChromeStyle}
        aria-label="Previous page"
      >
        <ChevronLeftIcon />
      </button>

      {items.map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            disabled={disabled}
            className={[
              item === page
                ? "inline-flex h-9 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-accent-interactive)_24%,transparent)] text-sm font-semibold text-[var(--color-accent-interactive)] transition-colors disabled:cursor-not-allowed"
                : `inline-flex h-9 items-center justify-center rounded-full text-sm font-semibold text-[var(--fg-body)] disabled:cursor-not-allowed ${inactiveHoverClass}`,
              item < 10 ? "w-9" : "min-w-[2.25rem] px-3",
            ].join(" ")}
            style={item === page ? activePillStyle : inactiveChromeStyle}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </button>
        ) : (
          <span
            key={item}
            className="inline-flex h-9 min-w-[2rem] items-center justify-center text-sm font-semibold"
            style={{ color: "var(--fg-muted)" }}
            aria-hidden="true"
          >
            ...
          </span>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canGoNext}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--fg-body)] disabled:cursor-not-allowed disabled:opacity-45 ${inactiveHoverClass}`}
        style={inactiveChromeStyle}
        aria-label="Next page"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
