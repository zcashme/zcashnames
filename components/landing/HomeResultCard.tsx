"use client";

import type React from "react";
import Image from "next/image";
import type { Action } from "@/lib/types";
import type { Network } from "@/lib/zns/client";
import ZcashNamesLogoMark from "@/components/ZcashNamesLogoMark";

type AvailabilityState = "available" | "forsale" | "unavailable" | "reserved" | "blocked";

interface HomeResultCardProps {
  displayName: string;
  network: Network;
  firstBucket?: number;
  availabilityState: AvailabilityState;
  priceLabel?: string;
  usdLabel?: string;
  isPopularName?: boolean;
  onAction: (action: Action) => void;
  onDismiss?: () => void;
}

function StatusBadge({
  variant,
  label,
  icon,
  style,
}: {
  variant: "positive" | "negative" | "neutral";
  label: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const toneClass =
    variant === "negative"
      ? "border border-[var(--feature-chip-border-color)] bg-[var(--feature-chip-bg)] text-[var(--home-result-status-negative-fg)]"
      : variant === "neutral"
        ? "border border-[var(--feature-chip-border-color)] bg-[var(--feature-chip-bg)] text-[var(--home-result-link-fg)]"
        : "border border-[var(--feature-chip-border-color)] bg-[var(--feature-chip-bg)] text-[var(--home-result-status-positive-fg)]";

  return (
    <span
      className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-[10px] px-3 text-[0.85rem] font-extrabold leading-none backdrop-blur-md ${toneClass}`}
      style={style}
    >
      {icon}
      {label}
    </span>
  );
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
  const isReserved = availabilityState === "reserved";
  const isBlocked = availabilityState === "blocked";
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
          className="absolute right-2 top-2 z-[2] inline-flex h-7 w-7 items-center justify-center rounded-full border text-base font-semibold leading-none transition-opacity hover:opacity-80"
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

          {isAvailable && (
            <StatusBadge
              variant="positive"
              label="Available"
              icon={
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M4.6 8.1 7 10.4l4.5-4.8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            />
          )}

          {isForSale && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
              style={{
                background: "var(--home-result-status-forsale-bg)",
                color: "var(--home-result-status-forsale-fg)",
                border: "1px solid var(--home-result-status-forsale-border)",
              }}
            >
              For Sale
            </span>
          )}

          {isUnavailable && (
            <StatusBadge
              variant="negative"
              label="Unavailable"
              icon={
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="6.3" />
                  <path d="M5 8h6" />
                </svg>
              }
            />
          )}

          {isReserved && (
            <StatusBadge
              variant="neutral"
              label="Reserved"
              icon={
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="7" width="10" height="7" rx="1.5" />
                  <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
                </svg>
              }
            />
          )}

          {isBlocked && (
            <StatusBadge
              variant="negative"
              label="Not Available"
              icon={
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="6.3" />
                  <path d="M5 5l6 6" />
                </svg>
              }
            />
          )}
          {(isAvailable || isForSale || isReserved) && (
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

      {(isAvailable || isForSale) && (
        <div className="relative z-[1] mt-3 flex items-center justify-start gap-2 max-[700px]:flex-wrap">
          <div className="flex flex-wrap justify-start gap-2">
            {isAvailable && (
              <button
                type="button"
                className="home-result-action is-primary"
                onClick={() => onAction("claim")}
              >
                Claim Name
              </button>
            )}
            {isForSale && (
              <>
                <button
                  type="button"
                  className="home-result-action is-primary"
                  onClick={() => onAction("buy")}
                >
                  Buy Now
                </button>
                <button
                  type="button"
                  className="home-result-action is-secondary"
                  onClick={() => onAction("delist")}
                >
                  Delist from Sale
                </button>
                <button
                  type="button"
                  className="home-result-action is-secondary"
                  onClick={() => onAction("release")}
                >
                  Release Name
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isUnavailable && (
        <div className="relative z-[1] mt-3 flex items-center justify-start gap-2 max-[700px]:flex-wrap">
          <button
            type="button"
            className="home-result-action is-secondary"
            onClick={() => onAction("update")}
          >
            Update Address
          </button>
          <button
            type="button"
            className="home-result-action is-secondary"
            onClick={() => onAction("list")}
          >
            List for Sale
          </button>
          <button
            type="button"
            className="home-result-action is-secondary"
            onClick={() => onAction("release")}
          >
            Release Name
          </button>
        </div>
      )}

      {isReserved && (
        <div className="relative z-[1] mt-3 flex items-center justify-start gap-2 max-[700px]:flex-wrap">
          <button
            type="button"
            className="home-result-action is-primary"
            onClick={() => onAction("claim")}
          >
            Claim Name
          </button>
        </div>
      )}

      {isBlocked && (
        <div className="relative z-[1] mt-3">
          <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
            This name cannot be registered.
          </p>
        </div>
      )}

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
