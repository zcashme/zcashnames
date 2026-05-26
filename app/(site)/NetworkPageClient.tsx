"use client";

import Link from "next/link";
import HomePage from "@/components/landing/HomePage";
import HomeSearchResults from "@/components/landing/HomeSearchResults";
import FeedbackModal from "@/components/closedbeta/FeedbackModal";
import type { ChainStats } from "@/lib/network-stats";

const explorerLink = (network: "mainnet" | "testnet") => (
  <Link
    href={network === "testnet" ? "/explorer?env=testnet" : "/explorer"}
    className="inline-flex items-center gap-2 rounded-full border border-[var(--home-result-link-border)] bg-[var(--home-result-link-bg)] px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform,background-color] duration-[140ms] hover:-translate-y-px hover:bg-[var(--home-result-link-hover-bg)]"
  >
    <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" />
      <path d="M12 2.4v3.2M12 18.4v3.2M2.4 12h3.2M18.4 12h3.2M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M18.4 5.6l-2.2 2.2M7.8 16.2l-2.2 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="8.85" stroke="currentColor" strokeWidth="1.4" />
    </svg>
    Explorer →
  </Link>
);

type Props = {
  network: "mainnet" | "testnet";
  stats: ChainStats;
};

export default function NetworkPageClient({ network, stats }: Props) {
  return (
    <>
      <HomePage
        form={<HomeSearchResults network={network} />}
        actionLink={explorerLink(network)}
        stats={stats}
        subtitle="Powered by Zcash. Claim your name"
      />
      <FeedbackModal network={network} />
    </>
  );
}
