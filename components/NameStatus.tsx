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

// Pure predicate: does this status have an associated price/listing?
// Used to conditionally show price info in search results and explorer rows.
export function statusSupportsPrice(status: NameAvailabilityState): boolean {
  return status === "available" || status === "forsale" || status === "reserved";
}

// Renders the correct set of action buttons for a given name status.
// Each status maps to a specific set of Actions that bubble up via onAction,
// which the parent (typically a search result card) dispatches to Zip321Modal.
// hasPendingBuy disables the DELIST button to prevent double-spend races.
export function NameStatusButtons({
  status,
  onAction,
  align = "start",
  hasPendingBuy = false,
}: {
  status: NameAvailabilityState;
  onAction: (action: Action) => void;
  align?: "start" | "center";
  hasPendingBuy?: boolean;
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

  if (status === "forsale") {
    return (
      <div
        className={`relative z-[1] mt-3 flex items-center gap-2 ${justifyClass} max-[700px]:flex-wrap`}
        onPointerMove={proximity.handlePointerMove}
        onPointerLeave={proximity.handlePointerLeave}
      >
        <button
          ref={(node) => proximity.register("buy", node)}
          type="button"
          className="home-result-action is-primary"
          onClick={() => onAction("BUY")}
          style={buttonStyle}
        >
          Buy Now
        </button>
        <button
          ref={(node) => proximity.register("delist", node)}
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("DELIST")}
          disabled={hasPendingBuy}
          title={hasPendingBuy ? "Cannot delist while a purchase is pending" : "Remove this name from the marketplace"}
          style={buttonStyle}
        >
          Delist from Sale
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

  if (status === "unavailable") {
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
          ref={(node) => proximity.register("list", node)}
          type="button"
          className="home-result-action is-secondary"
          onClick={() => onAction("LIST")}
          style={buttonStyle}
        >
          List for Sale
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

  if (status === "reserved") {
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

  return (
    <div className={`relative z-[1] mt-3 flex ${justifyClass}`}>
      <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
        This name cannot be registered.
      </p>
    </div>
  );
}
