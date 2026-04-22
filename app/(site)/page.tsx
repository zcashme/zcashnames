"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Hero from "@/components/landing/Hero";
import SearchForm from "@/components/search/SearchForm";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import FeedbackModal from "@/components/closedbeta/FeedbackModal";
import HomeResultCard from "@/components/landing/HomeResultCard";
import MarketStats from "@/components/landing/MarketStats";
import FAQ from "@/components/landing/FAQ";
import HowItWorks from "@/components/landing/HowItWorks";
import Link from "next/link";
import { useNetwork } from "@/components/hooks/useNetwork";
import { formatUsdEquivalent } from "@/lib/zns/name";

const POPULAR_NAMES = new Set([
  "adam", "alex", "alice", "anna", "bob", "chris", "david", "emma", "ethan",
  "jack", "james", "john", "leo", "lucas", "maria", "max", "mike", "noah",
  "olivia", "satoshi",
]);

import type { ResolveName, Action } from "@/lib/types";
import Zip321Modal from "@/components/landing/Zip321Modal";
import type { ModalTarget } from "@/components/landing/Zip321Modal";
import { useSearchState } from "@/components/hooks/useSearchState";
import { useUsdPrice } from "@/components/hooks/useUsdPrice";
import { useWaitlistVerification } from "@/components/hooks/useWaitlistVerification";
import { VerifiedModal } from "@/components/landing/VerifiedModal";
import PendingTransactionBanner from "@/components/landing/PendingTransactionBanner";
import { usePendingTransaction } from "@/components/hooks/usePendingTransaction";

const PhoneStage = dynamic(() => import("@/components/landing/PhoneStage"), {
  ssr: false,
  loading: () => (
    <div className="phone-stage w-full overflow-visible relative z-20">
      <div className="relative isolate w-full overflow-visible">
        {/* Skeleton chips */}
        <div className="absolute -left-1 -top-[24px] z-30 sm:left-1 sm:top-[68px] md:left-4 md:-top-[24px] xl:-left-9 xl:-top-[14px] -rotate-[8deg]">
          <div className="h-[46px] w-[130px] rounded-[16px] sm:h-[52px] sm:w-[148px] sm:rounded-[18px] animate-pulse opacity-25 bg-[#2a2a2c]" />
        </div>
        <div className="absolute -right-4 top-[58px] z-30 sm:right-0 sm:top-[66px] md:right-2 md:-top-[26px] xl:-right-9 xl:-top-[16deg] rotate-[6deg]">
          <div className="h-[46px] w-[140px] rounded-[16px] sm:h-[52px] sm:w-[158px] sm:rounded-[18px] animate-pulse opacity-25 bg-[#2a2a2c]" />
        </div>
        <div className="absolute -left-1 top-[500px] z-30 sm:left-10 sm:top-auto sm:bottom-[44px] md:left-[56px] xl:left-[62px] xl:bottom-[24px] -rotate-[9deg]">
          <div className="h-[46px] w-[120px] rounded-[16px] sm:h-[52px] sm:w-[136px] sm:rounded-[18px] animate-pulse opacity-25 bg-[#2a2a2c]" />
        </div>
        <div className="absolute -right-4 top-[540px] z-30 sm:right-8 sm:top-auto sm:bottom-[44px] md:right-12 xl:right-[18px] xl:bottom-[24px] rotate-[8deg]">
          <div className="h-[46px] w-[148px] rounded-[16px] sm:h-[52px] sm:w-[164px] sm:rounded-[18px] animate-pulse opacity-25 bg-[#2a2a2c]" />
        </div>

        {/* Skeleton phones (fanned out on desktop, stacked on mobile) */}
        <div className="relative z-20 flex justify-center items-start h-[620px] md:h-[680px] pt-6 md:pt-8">
          {/* Left phone */}
          <div className="absolute left-1/2 animate-pulse opacity-25 hidden md:block" style={{ width: 288, height: 596, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", transform: "translateX(calc(-50% - 170px)) translateY(15px) rotate(-12deg)", zIndex: 1 }} />
          {/* Center phone */}
          <div className="absolute left-1/2 animate-pulse opacity-40" style={{ width: 288, height: 596, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", transform: "translateX(-50%)", zIndex: 3 }} />
          {/* Right phone */}
          <div className="absolute left-1/2 animate-pulse opacity-25 hidden md:block" style={{ width: 288, height: 596, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", transform: "translateX(calc(-50% + 170px)) translateY(15px) rotate(12deg)", zIndex: 1 }} />
        </div>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const { network, networkPassword, refresh } = useNetwork();
  const usdPerZec = useUsdPrice();
  const [waitlistConfirmed, setWaitlistConfirmed] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const hasAutoOpenedFeedback = useRef(false);

  const {
    input,
    results,
    searching,
    searchError,
    setInput,
    handleSearch,
    refreshResult,
    removeResult,
    reset: resetSearch,
  } = useSearchState(network ?? "testnet");
  const {
    hydrated: pendingHydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
    resumeTarget,
  } = usePendingTransaction(refreshResult);

  const { status: verificationStatus, banner, clearBanner, closeSuccessModal } = useWaitlistVerification();

  useEffect(() => {
    resetSearch();
  }, [network, resetSearch]);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const shouldAutoOpenFeedback = network !== null && !hasAutoOpenedFeedback.current;

  useEffect(() => {
    if (network === null || hasAutoOpenedFeedback.current) return;
    hasAutoOpenedFeedback.current = true;
  }, [network]);

  const form = network !== null ? (
    <>
      <SearchForm
        value={input}
        onChange={setInput}
        onSubmit={handleSearch}
        claimLoading={searching}
      />
      {results.length > 0 && (
        <div className="mt-4 flex w-full max-w-4xl flex-col gap-3">
          {results.map((item) => (
            <HomeResultCard
              key={item.query}
              displayName={`${item.query}.zcash`}
              network={network}
              firstBucket={"firstBucket" in item ? item.firstBucket : undefined}
              isPopularName={POPULAR_NAMES.has(item.query.toLowerCase())}
              availabilityState={
                item.status === "available"
                  ? "available"
                  : item.status === "reserved"
                  ? "reserved"
                  : item.status === "blocked"
                  ? "blocked"
                  : item.status === "listed"
                  ? "forsale"
                  : "unavailable"
              }
              priceLabel={
                item.status === "available"
                  ? `${item.claimCost.zec} ZEC`
                  : item.status === "reserved"
                  ? `${item.claimCost.zec} ZEC`
                  : item.status === "listed"
                  ? `${item.listingPrice.zec} ZEC`
                  : undefined
              }
              usdLabel={
                item.status === "available"
                  ? formatUsdEquivalent(item.claimCost.zec, usdPerZec)
                  : item.status === "reserved"
                  ? formatUsdEquivalent(item.claimCost.zec, usdPerZec)
                  : item.status === "listed"
                  ? formatUsdEquivalent(item.listingPrice.zec, usdPerZec)
                  : undefined
              }
              onAction={(action) => {
                const t: ModalTarget = {
                  name: item.query,
                  action,
                  network,
                  networkPassword,
                  isReserved: item.status === "reserved",
                };
                if (item.status === "registered" || item.status === "listed") {
                  t.registrationAddress = item.registration.address;
                  t.registrationNonce = item.registration.nonce;
                  t.registrationPubkey = item.registration.pubkey ?? null;
                }
                if (item.status === "listed") {
                  t.listingPriceZec = item.listingPrice.zec;
                }
                setModalTarget(t);
              }}
              onDismiss={() => removeResult(item.query)}
            />
          ))}
        </div>
      )}
      {searchError && (
        <p className="home-search-error rounded-xl border px-4 py-3 text-sm font-semibold">
          {searchError}
        </p>
      )}
    </>
  ) : (
    <WaitlistEntryForm
      usdPerZec={usdPerZec}
      onConfirm={() => {
        setWaitlistConfirmed(true);
        refresh();
      }}
      onReset={() => setWaitlistConfirmed(false)}
    />
  );

  const successModalData =
    verificationStatus.type === "success"
      ? { name: verificationStatus.name, ref: verificationStatus.ref }
      : null;

  return (
    <div className="home-theme-scope">
      {banner && (
        <div className="relative z-20 mx-auto max-w-xl px-4 pt-2">
          <div
            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{
              background: "var(--home-error-bg, rgba(255,116,116,0.12))",
              borderColor: "var(--home-error-border, rgba(255,116,116,0.4))",
              color: "var(--home-error-text, #ffc0c0)",
            }}
          >
            <span>{banner}</span>
            <button
              type="button"
              onClick={clearBanner}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {verificationStatus.type === "confirming" && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent"
              style={{ color: "var(--fg-heading)" }}
            />
            <p className="text-sm font-medium" style={{ color: "var(--fg-heading)" }}>
              Confirming your email…
            </p>
          </div>
        </div>
      )}

      <section className="hero-stage-bg">
        <Hero
          searchForm={form}
          rightPanel={<PhoneStage embedded />}
          formExpanded={network === null && waitlistConfirmed}
          subtitle={
            network !== null ? (
              <>Powered by Zcash. Claim your name</>
            ) : (
              <>Be first to claim a name you can use, hold, or sell.</>
            )
          }
        />
      </section>

      {network !== null && pendingHydrated && pendingTransaction && !modalTarget && (
        <PendingTransactionBanner
          pendingTransaction={pendingTransaction}
          onResume={() => {
            if (resumeTarget) setModalTarget({ ...resumeTarget, networkPassword });
          }}
          onDismiss={clearPendingTransaction}
        />
      )}

      <MarketStats />

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
        {network !== null ? (
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
        ) : (
          <Link
            href="/leaders"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--home-result-link-border)] bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform,background-color] duration-[140ms] hover:-translate-y-px hover:bg-[var(--home-result-link-hover-bg)]"
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
              <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M16 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 6.5L13.1 8.8L15.6 9.1L13.8 10.8L14.2 13.3L12 12.1L9.8 13.3L10.2 10.8L8.4 9.1L10.9 8.8L12 6.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            </svg>
            Leaderboard →
          </Link>
        )}
      </div>

      <HowItWorks />
      <FAQ />

      <div className="flex justify-center pb-10">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="inline-flex items-center gap-2 rounded-full bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform] duration-[140ms] hover:-translate-y-px cursor-pointer"
        >
          <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
            <path d="M12 19V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to top
        </button>
      </div>

      {isClientMounted && successModalData && (
        <VerifiedModal
          name={successModalData.name}
          ref={successModalData.ref}
          isOpen={true}
          onClose={closeSuccessModal}
        />
      )}

      {isClientMounted && modalTarget && (
        <Zip321Modal
          target={modalTarget}
          onClose={() => setModalTarget(null)}
          onSuccess={refreshResult}
          resumeState={pendingTransaction}
          onPersistState={persistPendingTransaction}
          onClearState={clearPendingTransaction}
        />
      )}

      {isClientMounted && network !== null && (
        <FeedbackModal defaultNetwork={network} openOnMount={shouldAutoOpenFeedback} />
      )}
    </div>
  );
}