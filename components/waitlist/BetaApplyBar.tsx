"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { useState } from "react";

export default function BetaApplyBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);

  const onWaitlist = pathname === "/waitlist";
  const onMainnetHome = pathname === "/";

  function handleDismiss() {
    setVisible(false);
  }

  if ((!onWaitlist && !onMainnetHome) || !visible) return null;

  const href = onWaitlist ? "/beta/apply" : "/beta/refund";
  const badgeLabel = onWaitlist ? "Earn ZEC" : "Refund";
  const ctaLabel = onWaitlist
    ? "Apply for the ZcashNames beta \u2192"
    : " Names are temporary during beta testing. \u2192";
  const barStyle: CSSProperties = onWaitlist
    ? {
        background: "var(--announce-bar-bg)",
        color: "var(--announce-bar-fg)",
        textDecoration: "none",
      }
    : {
        background: "var(--refund-bar-bg)",
        color: "var(--refund-bar-fg)",
        textDecoration: "none",
      };
  const badgeStyle: CSSProperties = onWaitlist
    ? {
        background: "var(--announce-bar-pill-bg)",
        color: "var(--announce-bar-pill-fg)",
      }
    : {
        background: "var(--refund-bar-pill-bg)",
        color: "var(--refund-bar-pill-fg)",
      };

  return (
    <div
      className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_1.5rem] items-center gap-2 px-3 py-1.5 text-[0.72rem] font-semibold sm:text-sm"
      style={barStyle}
    >
      <span className="h-6 w-6" aria-hidden="true" />
      <Link
        href={href}
        className="col-start-2 flex min-w-0 items-center justify-center gap-2 whitespace-nowrap text-center transition-opacity hover:opacity-90"
      >
        <span
          className="inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider sm:text-[0.65rem]"
          style={badgeStyle}
        >
          {badgeLabel}
        </span>
        <span className="truncate">{ctaLabel}</span>
      </Link>
      <button
        type="button"
        onClick={handleDismiss}
        className="site-announcement-dismiss justify-self-end"
        aria-label={`Dismiss ${onWaitlist ? "beta application" : "refund"} banner`}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
