"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNetwork } from "@/components/hooks/useNetwork";

export default function BetaApplyBar() {
  const pathname = usePathname();
  const { network } = useNetwork();

  if (pathname !== "/") return null;
  if (network !== null) return null;

  return (
    <Link
      href="/indexerbb"
      className="flex w-full items-center justify-center gap-2 px-3 py-2 text-[0.72rem] sm:text-sm font-semibold transition-opacity hover:opacity-90 whitespace-nowrap"
      style={{
        background: "var(--announce-bar-bg)",
        color: "var(--announce-bar-fg)",
        textDecoration: "none",
      }}
    >
      <span
        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[0.55rem] sm:text-[0.65rem] font-bold uppercase tracking-wider shrink-0"
        style={{
          background: "var(--announce-bar-pill-bg)",
          color: "var(--announce-bar-pill-fg)",
        }}
      >
        Bounty
      </span>
      <span className="truncate">
        Find bugs in our indexer to earn ZEC.{" "}
        <span className="font-bold underline">Learn more &rarr;</span>
      </span>
    </Link>
  );
}