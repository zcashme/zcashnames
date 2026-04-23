"use client";

import type React from "react";
import type { Action } from "@/lib/types";

export type NameAvailabilityState = "available" | "forsale" | "unavailable" | "reserved" | "blocked";

function StatusBadge({
  variant,
  label,
  icon,
}: {
  variant: "positive" | "negative" | "neutral";
  label: string;
  icon?: React.ReactNode;
}) {
  const toneClass =
    variant === "negative"
      ? "border border-[var(--feature-chip-border-color)] bg-[var(--feature-chip-bg)] text-[var(--home-result-status-negative-fg)]"
      : variant === "neutral"
        ? "border border-[var(--feature-chip-border-color)] bg-[var(--feature-chip-bg)] text-[var(--home-result-link-fg)]"
        : "border border-[var(--feature-chip-border-color)] bg-[var(--feature-chip-bg)] text-[var(--home-result-status-positive-fg)]";

  return (
    <span
      className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-[10px] px-3 text-[0.85rem] font-extrabold leading-none backdrop-blur-md ${toneClass}`}
    >
      {icon}
      {label}
    </span>
  );
}

export function NameStatusBadge({ status }: { status: NameAvailabilityState }) {
  if (status === "available") {
    return (
      <StatusBadge
        variant="positive"
        label="Available"
        icon={
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M4.6 8.1 7 10.4l4.5-4.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
    );
  }

  if (status === "forsale") {
    return (
      <span
        className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
        style={{
          background: "var(--home-result-status-forsale-bg)",
          color: "var(--home-result-status-forsale-fg)",
          border: "1px solid var(--home-result-status-forsale-border)",
        }}
      >
        For Sale
      </span>
    );
  }

  if (status === "unavailable") {
    return (
      <StatusBadge
        variant="negative"
        label="Unavailable"
        icon={
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6.3" />
            <path d="M5 8h6" />
          </svg>
        }
      />
    );
  }

  if (status === "reserved") {
    return (
      <StatusBadge
        variant="neutral"
        label="Reserved"
        icon={
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="7" width="10" height="7" rx="1.5" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
        }
      />
    );
  }

  return (
    <StatusBadge
      variant="negative"
      label="Not Available"
      icon={
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.3" />
          <path d="M5 5l6 6" />
        </svg>
      }
    />
  );
}

export function statusSupportsPrice(status: NameAvailabilityState): boolean {
  return status === "available" || status === "forsale" || status === "reserved";
}

export function NameStatusActionButtons({
  status,
  onAction,
  align = "start",
}: {
  status: NameAvailabilityState;
  onAction: (action: Action) => void;
  align?: "start" | "center";
}) {
  const justifyClass = align === "center" ? "justify-center" : "justify-start";

  if (status === "available") {
    return (
      <div className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}>
        <button
          type="button"
          className="home-result-action is-primary"
          onClick={() => onAction("claim")}
        >
          Claim Name
        </button>
      </div>
    );
  }

  if (status === "forsale") {
    return (
      <div className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}>
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
    );
  }

  if (status === "unavailable") {
    return (
      <div className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}>
        <button
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("update")}
        >
          Update Address
        </button>
        <button
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("list")}
        >
          List for Sale
        </button>
        <button
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("release")}
        >
          Release Name
        </button>
      </div>
    );
  }

  if (status === "reserved") {
    return (
      <div className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}>
        <button
          type="button"
          className="home-result-action is-primary"
          onClick={() => onAction("claim")}
        >
          Claim Name
        </button>
      </div>
    );
  }

  return (
    <div className={`relative z-[1] mt-3 flex ${justifyClass}`}>
      <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
        This name cannot be registered.
      </p>
    </div>
  );
}
