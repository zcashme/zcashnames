"use client";

import type { NameAvailabilityState, Network } from "@/lib/types";

type NameActionFeatureChipsProps = {
  chips: string[];
  placement: "inline" | "hero";
  name: string;
  network: Network;
  availability: NameAvailabilityState;
};

export default function NameActionFeatureChips({
  chips,
  placement,
}: NameActionFeatureChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={`name-action-chips name-action-chips--${placement}`}>
      {chips.map((chip) => (
        <span key={`${placement}-${chip}`} className="home-result-trust-pill">
          {chip}
        </span>
      ))}
    </div>
  );
}
