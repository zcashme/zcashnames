"use client";

import type React from "react";
import type { Action, NameAvailabilityState } from "@/lib/types";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";

// Internal badge shell: maps a semantic variant (positive/negative/neutral) to
// CSS token classes consumed by the theme system.
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

// Maps NameAvailabilityState → visual badge with inline SVG icon.
// Rendered on name lookup results and the explorer table to show
// availability at a glance. Each variant uses the shared StatusBadge shell.
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

  if (status === "registered") {
    return (
      <StatusBadge
        variant="negative"
        label="Registered"
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

// Pure predicate: does this status have an associated price?
// Used to conditionally show price info in search results and explorer rows.
export function statusSupportsPrice(status: NameAvailabilityState): boolean {
  return status === "available";
}

// Renders the correct set of action buttons for a given name status.
// Each status maps to a specific set of Actions that bubble up via onAction,
// which the parent (typically a search result card) dispatches to the
// name-action form. Three verbs only: CLAIM / UPDATE / RELEASE.
export function NameStatusButtons({
  status,
  onAction,
  align = "start",
}: {
  status: NameAvailabilityState;
  onAction: (action: Action) => void;
  align?: "start" | "center";
}) {
  const justifyClass = align === "center" ? "justify-center" : "justify-start";
  const proximity = usePointerProximity<HTMLButtonElement>({
    radius: 145,
    maxScaleBoost: 0.05,
    maxShadowOpacity: 0.14,
  });

  const buttonStyle: React.CSSProperties = {
    transform: "translateZ(0) scale(var(--prox-scale, 1))",
    boxShadow: "0 14px 28px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
  };

  if (status === "available") {
    return (
      <div
        className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}
        onPointerMove={proximity.handlePointerMove}
        onPointerLeave={proximity.handlePointerLeave}
      >
        <button
          ref={(node) => proximity.register("claim", node)}
          type="button"
          className="home-result-action is-primary"
          onClick={() => onAction("CLAIM")}
          style={buttonStyle}
        >
          Claim Name
        </button>
      </div>
    );
  }

  if (status === "registered") {
    return (
      <div
        className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}
        onPointerMove={proximity.handlePointerMove}
        onPointerLeave={proximity.handlePointerLeave}
      >
        <button
          ref={(node) => proximity.register("update", node)}
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("UPDATE")}
          style={buttonStyle}
        >
          Update Address
        </button>
        <button
          ref={(node) => proximity.register("release", node)}
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("RELEASE")}
          style={buttonStyle}
        >
          Release Name
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
