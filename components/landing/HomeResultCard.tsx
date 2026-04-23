"use client";

import Image from "next/image";
import type { Action } from "@/lib/types";
import type { Network } from "@/lib/zns/name";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";
import {
  NameStatusActionButtons,
  NameStatusBadge,
  type NameAvailabilityState,
  statusSupportsPrice,
} from "@/components/NameStatusActions";

interface HomeResultCardProps {
  displayName: string;
  network: Network;
  firstBucket?: number;
  availabilityState: NameAvailabilityState;
  priceLabel?: string;
  usdLabel?: string;
  isPopularName?: boolean;
  onAction: (action: Action) => void;
  onDismiss?: () => void;
}

export default function HomeResultCard({
  displayName,
  network,
  firstBucket,
  availabilityState,
  priceLabel,
  usdLabel,
  isPopularName = false,
  onAction,
  onDismiss,
}: HomeResultCardProps) {
  const plainName = displayName.replace(/\.(zcash|zec)$/i, "");
  const encodedName = encodeURIComponent(plainName);
  const charCount = plainName.length;
  const firstBucketLabel = firstBucket ? `First ${firstBucket}` : null;
  const explorerUrl =
    network === "testnet"
      ? `/explorer?env=testnet&name=${encodedName}`
      : `/explorer?name=${encodedName}`;
  const zcashMeUrl = `https://zcash.me/${encodedName}`;

  const isAvailable = availabilityState === "available";
  const isForSale = availabilityState === "forsale";
  const isUnavailable = availabilityState === "unavailable";
  const showFeatureChips = isAvailable || isForSale;
  const footerChips = isAvailable
    ? [
        `${charCount} characters`,
        ...(firstBucketLabel ? [firstBucketLabel] : []),
        "No previous owners",
        ...(isPopularName ? ["Popular name"] : []),
      ]
    : isForSale
      ? [
          `${charCount} characters`,
          ...(firstBucketLabel ? [firstBucketLabel] : []),
          ...(isPopularName ? ["Popular name"] : []),
        ]
      : [];
  const showFooterLinks = isForSale || isUnavailable;

  return (
    <section
      className="home-result-card relative w-full overflow-hidden rounded-[20px] px-4 pt-[14px] pb-4 bg-[var(--home-result-bg)] shadow-[var(--home-result-shadow)] max-[700px]:rounded-2xl max-[700px]:p-3"
      aria-live="polite"
    >
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${displayName}`}
          className="absolute right-2 top-2 z-[2] inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border text-base font-semibold leading-none transition-opacity hover:opacity-80"
          style={{
            borderColor: "var(--home-result-secondary-border)",
            background: "var(--home-result-secondary-bg)",
            color: "var(--home-result-secondary-fg)",
          }}
        >
          &times;
        </button>
      )}

      <div className="relative z-[1] flex items-start justify-between gap-2.5 max-[700px]:flex-wrap">
        <div className="min-w-0 flex items-center gap-2.5 flex-wrap max-[700px]:w-full max-[700px]:gap-2">
          <p className="m-0 max-w-[min(50vw,360px)] overflow-hidden text-ellipsis whitespace-nowrap text-[var(--home-result-name-color)] text-[clamp(1.2rem,2.4vw,1.55rem)] font-black tracking-[-0.016em] max-[700px]:max-w-full">
            {displayName}
          </p>

          <NameStatusBadge status={availabilityState} />
          {statusSupportsPrice(availabilityState) && (
            <div className="flex items-baseline gap-2">
              <p className="m-0 text-[var(--home-result-price-color)] text-[clamp(1.02rem,1.85vw,1.3rem)] font-extrabold tracking-[-0.012em]">
                {priceLabel}
              </p>
              {usdLabel && (
                <span className="text-[0.82rem] font-medium text-[var(--fg-muted)]">
                  {usdLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <NameStatusActionButtons status={availabilityState} onAction={onAction} />

      {(showFeatureChips || showFooterLinks) && (
        <div className={`home-result-trust${showFeatureChips && showFooterLinks ? " has-inline-links" : ""}`}>
          {showFeatureChips && (
            <div className="home-result-trust-pills">
              {footerChips.map((chip) => (
                <span
                  key={chip}
                  className={isForSale ? "home-result-feature-chip" : "home-result-trust-pill"}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          {showFooterLinks && (
            <div className="home-result-links">
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="home-result-link inline-flex items-center gap-1.5 whitespace-nowrap leading-none"
              >
                <ZcashNamesLogoMark alt="Explorer logo" size={18} className="theme-media-home" />
                <span className="inline-flex items-center leading-none">View in Explorer</span>
              </a>
              <a
                href={zcashMeUrl}
                target="_blank"
                rel="noreferrer"
                className="home-result-link inline-flex items-center gap-1.5 whitespace-nowrap leading-none"
              >
                <Image
                  src="/assets/icons/zcashme-favicon-64.png"
                  alt="ZcashMe logo"
                  width={18}
                  height={18}
                  className="theme-media-home scale-[1.35]"
                />
                <span className="inline-flex items-center leading-none">View on ZcashMe</span>
              </a>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
