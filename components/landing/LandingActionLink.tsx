"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";

type LandingActionLinkProps = {
  href: string;
  icon: ReactNode;
  label: string;
  proximityId: string;
  filled?: boolean;
  showArrow?: boolean;
  arrowDirection?: "left" | "right";
  arrowPosition?: "left" | "right";
  iconPosition?: "left" | "right";
  /** "text" matches homepage "See more →" under Blog (no pill chrome). */
  variant?: "pill" | "text";
};

export default function LandingActionLink({
  href,
  icon,
  label,
  proximityId,
  filled = false,
  showArrow = true,
  arrowDirection = "right",
  arrowPosition = "right",
  iconPosition = "left",
  variant = "pill",
}: LandingActionLinkProps) {
  const proximity = usePointerProximity<HTMLAnchorElement>({
    radius: 170,
    maxScaleBoost: 0.06,
    maxShadowOpacity: 0.14,
  });
  const arrow = arrowDirection === "left" ? "\u2190" : "\u2192";

  if (variant === "text") {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-sm font-semibold transition-[filter] duration-200 hover:brightness-110"
        style={{ color: "var(--color-accent-interactive, var(--fg-heading))" }}
        aria-label={label}
      >
        {showArrow && arrowPosition === "left" ? <span aria-hidden="true">{arrow}</span> : null}
        {iconPosition === "left" ? (
          <span aria-hidden="true" className="inline-flex" style={{ width: "1.08em", height: "1.08em" }}>
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
        {iconPosition === "right" ? (
          <span aria-hidden="true" className="inline-flex" style={{ width: "1.08em", height: "1.08em" }}>
            {icon}
          </span>
        ) : null}
        {showArrow && arrowPosition === "right" ? <span aria-hidden="true">{arrow}</span> : null}
      </Link>
    );
  }

  return (
    <div onPointerMove={proximity.handlePointerMove} onPointerLeave={proximity.handlePointerLeave}>
      <Link
        ref={(node) => proximity.register(proximityId, node)}
        href={href}
        className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--home-result-link-border)] px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform,background-color,filter,box-shadow] duration-[140ms] hover:bg-[var(--home-result-link-hover-bg)]"
        style={{
          background: filled ? "var(--home-result-link-bg)" : "transparent",
          transform: "translateZ(0) scale(var(--prox-scale, 1))",
          boxShadow: "0 14px 28px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
        }}
      >
        {showArrow && arrowPosition === "left" ? <span aria-hidden="true">{arrow}</span> : null}
        {iconPosition === "left" ? (
          <span aria-hidden="true" style={{ width: "1.08em", height: "1.08em", display: "inline-flex" }}>
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
        {iconPosition === "right" ? (
          <span aria-hidden="true" style={{ width: "1.08em", height: "1.08em", display: "inline-flex" }}>
            {icon}
          </span>
        ) : null}
        {showArrow && arrowPosition === "right" ? <span aria-hidden="true">{arrow}</span> : null}
      </Link>
    </div>
  );
}
