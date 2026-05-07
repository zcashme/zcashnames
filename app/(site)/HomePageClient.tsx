"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Hero from "@/components/landing/Hero";
import SearchForm from "@/components/search/SearchForm";
import FeedbackModal from "@/components/closedbeta/FeedbackModal";
import HomeResultCard from "@/components/landing/HomeResultCard";
import MarketStats from "@/components/landing/MarketStats";
import FAQ from "@/components/landing/FAQ";
import HowItWorks from "@/components/landing/HowItWorks";
import Link from "next/link";
import { useNetwork } from "@/components/hooks/useNetwork";
import { useUsdPrice } from "@/components/hooks/useUsdPrice";

const POPULAR_NAMES = new Set([
  "adam", "alex", "alice", "anna", "bob", "chris", "david", "emma", "ethan",
  "jack", "james", "john", "leo", "lucas", "maria", "max", "mike", "noah",
  "olivia", "satoshi",
]);

import type { Action, ModalTarget } from "@/lib/types";
import Zip321Modal from "@/components/landing/Zip321Modal";
import { useSearchState } from "@/components/hooks/useSearchState";
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
  const { network, refresh } = useNetwork();
  const usdPerZec = useUsdPrice();
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);

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
    getModalTarget,
  } = useSearchState(network ?? "testnet");
  const {
    hydrated: pendingHydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
    resumeTarget,
  } = usePendingTransaction();

  // Mark client as mounted after first render.
  useEffect(() => { setIsClientMounted(true); }, []);

  /* ── Render ────────────────────────────────────────────────────────── */

  const form = (
    <SearchForm
      value={input}
      onChange={setInput}
      onSubmit={handleSearch}
      claimLoading={searching}
    />
  );

  return (
    <div className="home-page">
      <section className="hero-stage-bg">
        <Hero
          searchForm={form}
          rightPanel={<PhoneStage embedded />}
          formExpanded={false}
          subtitle={<>Powered by Zcash. Claim your name</>}
        />
      </section>

      {searchError && (
        <div className="mx-auto mb-3 flex max-w-[600px] items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold backdrop-blur-md"
          style={{
            background: "var(--home-result-status-negative-bg)",
            color: "var(--home-result-status-negative-fg)",
            border: "1px solid var(--home-result-status-negative-border)",
          }}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="flex-1">{searchError}</span>
          <button
            type="button"
            onClick={resetSearch}
            className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-opacity hover:opacity-70"
            style={{ background: "transparent", border: "1.5px solid currentColor" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {results.length === 0 && !searching && (
        <div className="mx-auto mb-4 flex max-w-[580px] items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold backdrop-blur-md"
          style={{
            background: "var(--home-result-status-neutral-bg, var(--feature-card-bg))",
            color: "var(--home-result-link-fg, var(--fg-muted))",
            border: "1px solid var(--home-result-link-border, var(--faq-border))",
          }}
        >
          <span>Enter a name above to check availability.</span>
        </div>
      )}

      {results.map((result) => {
        const props = buildCardProps(result);
        const displayName = `${result.query}.zcash`;
        const isPopular = POPULAR_NAMES.has(result.query);

        return (
          <HomeResultCard
            key={result.query}
            displayName={displayName}
            network={network ?? "testnet"}
            {...props}
            isPopularName={isPopular}
            onAction={(action) => {
              const target = getModalTarget(result, action);
              if (target) setModalTarget(target);
            }}
            onDismiss={() => removeResult(result.query)}
          />
        );
      })}

      <MarketStats />

      {network && pendingHydrated && pendingTransaction && !modalTarget && (
        <PendingTransactionBanner
          pendingTransaction={pendingTransaction}
          onResume={() => {
            if (resumeTarget) setModalTarget({ ...resumeTarget });
          }}
          onDismiss={clearPendingTransaction}
        />
      )}

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
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

      {isClientMounted && network && (
        <FeedbackModal defaultNetwork={network} />
      )}
    </div>
  );
}