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
import { useZns } from "@/components/hooks/useZns";
import { useSearchState } from "@/components/hooks/useSearchState";
import { usePendingTransaction } from "@/components/hooks/usePendingTransaction";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import PendingTransactionBanner from "@/components/landing/PendingTransactionBanner";
import type { Action, ResolveName } from "@/lib/types";

const POPULAR_NAMES = new Set([
  "adam", "alex", "alice", "anna", "bob", "chris", "david", "emma", "ethan",
  "jack", "james", "john", "leo", "lucas", "maria", "max", "mike", "noah",
  "olivia", "satoshi",
]);

const PhoneStage = dynamic(() => import("@/components/landing/PhoneStage"), {
  ssr: false,
  loading: () => (
    <div className="phone-stage w-full overflow-visible relative z-20">
      <div className="relative isolate w-full overflow-visible">
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
        <div className="relative z-20 flex justify-center items-start h-[620px] md:h-[680px] pt-6 md:pt-8">
          <div className="absolute left-1/2 animate-pulse opacity-25 hidden md:block" style={{ width: 288, height: 596, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", transform: "translateX(calc(-50% - 170px)) translateY(15px) rotate(-12deg)", zIndex: 1 }} />
          <div className="absolute left-1/2 animate-pulse opacity-40" style={{ width: 288, height: 596, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", transform: "translateX(-50%)", zIndex: 3 }} />
          <div className="absolute left-1/2 animate-pulse opacity-25 hidden md:block" style={{ width: 288, height: 596, borderRadius: 52, background: "linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 40%, #111113 100%)", transform: "translateX(calc(-50% + 170px)) translateY(15px) rotate(12deg)", zIndex: 1 }} />
        </div>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const { zns } = useZns();
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [modalState, setModalState] = useState<{ action: Action; resolveResult: ResolveName } | null>(null);
  const hasAutoOpenedFeedback = useRef(false);

  const isWaitlistMode = zns.mode === "waitlist";
  const searchNetwork = isWaitlistMode ? "testnet" : zns.mode;

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
    buildCardProps,
  } = useSearchState(searchNetwork);

  const {
    hydrated: pendingHydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
  } = usePendingTransaction();

  useEffect(() => {
    resetSearch();
  }, [zns.mode, resetSearch]);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const shouldAutoOpenFeedback = zns.mode !== "waitlist" && !hasAutoOpenedFeedback.current;

  useEffect(() => {
    if (zns.mode === "waitlist" || hasAutoOpenedFeedback.current) return;
    hasAutoOpenedFeedback.current = true;
  }, [zns.mode]);

  const form = isWaitlistMode ? (
    <WaitlistEntryForm
      onConfirm={() => {}}
      onReset={() => {}}
    />
  ) : (
    <>
      <SearchForm
        value={input}
        onChange={setInput}
        onSubmit={handleSearch}
        claimLoading={searching}
      />
      {results.length > 0 && (
        <div className="mt-4 flex w-full max-w-4xl flex-col gap-3">
          {results.map((item) => {
            const props = buildCardProps(item);
            const displayName = `${item.query}.zcash`;
            const isPopular = POPULAR_NAMES.has(item.query);

            return (
              <HomeResultCard
                key={item.query}
                displayName={displayName}
                network={zns.mode}
                {...props}
                isPopularName={isPopular}
                onAction={(action) => setModalState({ action, resolveResult: item })}
                onDismiss={() => removeResult(item.query)}
              />
            );
          })}
        </div>
      )}
      {searchError && (
        <p className="home-search-error rounded-xl border px-4 py-3 text-sm font-semibold">
          {searchError}
        </p>
      )}
    </>
  );

  return (
    <div className="home-theme-scope">
      <section className="hero-stage-bg">
        <Hero
          searchForm={form}
          rightPanel={<PhoneStage embedded />}
          formExpanded={false}
          subtitle={
            isWaitlistMode ? (
              <>Be first to claim a name you can use, hold, or sell.</>
            ) : (
              <>Powered by Zcash. Claim your name</>
            )
          }
        />
      </section>

      {!isWaitlistMode && pendingHydrated && pendingTransaction && !modalState && (
        <PendingTransactionBanner
          pendingTransaction={pendingTransaction}
          onResume={() => {}}
          onDismiss={clearPendingTransaction}
        />
      )}

      <MarketStats />

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
        {isWaitlistMode ? (
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
        ) : (
          <Link
            href={zns.mode === "testnet" ? "/explorer?env=testnet" : "/explorer"}
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

      {isClientMounted && modalState && (
        <Zip321Modal
          action={modalState.action}
          name={modalState.resolveResult.query}
          network={zns.mode === "waitlist" ? "testnet" : zns.mode}
          resolveResult={modalState.resolveResult}
          onClose={() => setModalState(null)}
          onSuccess={(name) => {
            setModalState(null);
            refreshResult(name);
          }}
        />
      )}

      {isClientMounted && zns.mode !== "waitlist" && (
        <FeedbackModal defaultNetwork={zns.mode} />
      )}
    </div>
  );
}