"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

export default function BetaApplyBar() {
  const pathname = usePathname();

  const onWaitlist = pathname === "/waitlist";
  const onMainnetHome = pathname === "/";

  if (!onWaitlist && !onMainnetHome) return null;

  const href = onWaitlist ? "/beta/apply" : "/beta/rebate";
  const badgeLabel = onWaitlist ? "Earn ZEC" : "Rebate";
  const ctaLabel = onWaitlist
    ? "Apply for the ZcashNames beta \u2192"
    : "Names are temporary. Claim yours. \u2192";
  const barStyle: CSSProperties = onWaitlist
    ? {
        background: "var(--announce-bar-bg)",
        color: "var(--announce-bar-fg)",
        textDecoration: "none",
      }
    : {
        background:
          "linear-gradient(90deg, color-mix(in srgb, var(--color-brand-blue) 88%, #081428), color-mix(in srgb, var(--color-brand-blue-dark) 82%, #0f172a))",
        color: "var(--home-result-primary-fg)",
        textDecoration: "none",
      };
  const badgeStyle: CSSProperties = onWaitlist
    ? {
        background: "var(--announce-bar-pill-bg)",
        color: "var(--announce-bar-pill-fg)",
      }
    : {
        background: "var(--home-result-primary-fg)",
        color: "color-mix(in srgb, var(--color-brand-blue-dark) 82%, #0f172a)",
      };

  return (
    <Link
      href={href}
      className="flex w-full items-center justify-center gap-2 px-3 py-2 text-[0.72rem] sm:text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
      style={barStyle}
    >
      <span
        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.55rem] sm:text-[0.65rem] font-bold uppercase tracking-wider shrink-0"
        style={badgeStyle}
      >
        {badgeLabel}
      </span>
      <span className="truncate">
        {ctaLabel}
      </span>
    </Link>
  );
}
