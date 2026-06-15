"use client";

import FeedbackModal from "@/components/closedbeta/FeedbackModal";
import HomePage from "@/components/landing/HomePage";
import LandingActionLink from "@/components/landing/LandingActionLink";
import HomeSearchResults from "@/components/landing/HomeSearchResults";
import type { ChainStats } from "@/lib/network-stats";

function ExplorerLink({ network }: { network: "mainnet" | "testnet" }) {
  return (
    <LandingActionLink
      proximityId="explorer-link"
      href={network === "testnet" ? "/explorer?env=testnet" : "/explorer"}
      label="Explorer"
      showArrow={false}
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
          <circle cx="12" cy="12" r="1.15" fill="currentColor" />
          <path d="M12 2.4v3.2M12 18.4v3.2M2.4 12h3.2M18.4 12h3.2M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M18.4 5.6l-2.2 2.2M7.8 16.2l-2.2 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="8.85" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      }
    />
  );
}

type Props = {
  network: "mainnet" | "testnet";
  stats: ChainStats;
  feedbackEnabled: boolean;
};

export default function NetworkPageClient({ network, stats, feedbackEnabled }: Props) {
  return (
    <>
      <HomePage
        form={<HomeSearchResults network={network} />}
        actionLink={<ExplorerLink network={network} />}
        actionLinkPosition="belowStats"
        stats={stats}
        subtitle="Powered by Zcash. Claim your name"
      />
      {feedbackEnabled ? <FeedbackModal network={network} /> : null}
    </>
  );
}
