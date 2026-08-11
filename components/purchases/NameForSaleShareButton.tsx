"use client";

import ShareDropdown from "@/components/ShareDropdown";
import type { Network } from "@/lib/types";

const SITE_ORIGIN = "https://www.zcashnames.com";

type NameForSaleShareButtonProps = {
  name: string;
  network?: Network;
  /** Visual style to match surrounding chips. Default: explorer feature chip. */
  variant?: "feature-chip" | "trust-pill";
  menuAlign?: "left" | "right";
  menuDirection?: "down" | "up";
  label?: string;
};

function buySharePath(name: string, network: Network): string {
  const path = `/buy/${encodeURIComponent(name)}`;
  return network === "testnet" ? `${path}?network=testnet` : path;
}

/**
 * Share dropdown used in place of the character-count chip when a name is for sale
 * (explorer detail + /buy action page).
 */
export default function NameForSaleShareButton({
  name,
  network = "mainnet",
  variant = "feature-chip",
  menuAlign = "right",
  menuDirection = "down",
  label = "Share",
}: NameForSaleShareButtonProps) {
  const shareUrl = `${SITE_ORIGIN}${buySharePath(name, network)}`;
  const message = `${name} is for sale on Zcash Names.`;
  const xMessage = `${name} is for sale on @ZcashNames.`;

  const chipClass =
    variant === "trust-pill" ? "home-result-trust-pill" : "home-result-feature-chip";

  return (
    <ShareDropdown
      label={label}
      message={message}
      xMessage={xMessage}
      shareUrl={shareUrl}
      emailSubject={`${name} is for sale on Zcash Names`}
      menuAlign={menuAlign}
      menuDirection={menuDirection}
      rootClassName="relative inline-flex w-fit max-w-full flex-col items-stretch gap-1"
      buttonClassName={`${chipClass} gap-1.5 cursor-pointer transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]`}
    />
  );
}
