"use client";

import NameForSaleShareButton from "@/components/purchases/NameForSaleShareButton";
import type { NameAvailabilityState, Network } from "@/lib/types";

type NameActionFeatureChipsProps = {
  chips: string[];
  placement: "inline" | "hero";
  name: string;
  network: Network;
  availability: NameAvailabilityState;
  /** When true, hide the top-of-form for-sale Share (footer Share is showing). */
  hideShare?: boolean;
};

export default function NameActionFeatureChips({
  chips,
  placement,
  name,
  network,
  availability,
  hideShare = false,
}: NameActionFeatureChipsProps) {
  const showForSaleShare = availability === "forsale" && !hideShare;
  if (chips.length === 0 && !showForSaleShare) return null;

  return (
    <div className={`name-action-chips name-action-chips--${placement}`}>
      {showForSaleShare ? (
        <NameForSaleShareButton
          name={name}
          network={network}
          variant="trust-pill"
          menuAlign={placement === "hero" ? "left" : "right"}
          menuDirection="down"
        />
      ) : null}
      {chips.map((chip) => (
        <span key={`${placement}-${chip}`} className="home-result-trust-pill">
          {chip}
        </span>
      ))}
    </div>
  );
}
