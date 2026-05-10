/*
 * HomePageClient — the main client component that assembles the full
 * marketing‑site homepage.  It conditionally displays different action
 * links depending on `zns.mode` (waitlist vs. live/testnet) and wires
 * up the FeedbackModal for beta testers in non‑waitlist mode.
 */
"use client";

import dynamic from "next/dynamic";
import Hero from "@/components/landing/Hero";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import HomeSearchResults from "@/components/landing/HomeSearchResults";
import FeedbackModal from "@/components/closedbeta/FeedbackModal";
import FAQ from "@/components/landing/FAQ";
import HowItWorks from "@/components/landing/HowItWorks";
import NetworkStats from "@/components/landing/NetworkStats";
import Link from "next/link";
import { useZns } from "@/components/hooks/useZns";

// Lazy‑loaded with ssr:false to avoid hydration mismatches on the 3D phone
// carousel (it depends on browser‑only APIs and viewport measurements).
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

  return (
    <div className="home-theme-scope">
      <Hero rightPanel={<PhoneStage embedded />} />

      <WaitlistEntryForm />
      <HomeSearchResults />

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
        {/* Mode‑dependent action link: leaderboard during waitlist, explorer otherwise. */}
        {zns.mode === "waitlist" ? (
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

      <NetworkStats />
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

      {/* Auto‑opens a feedback survey in non‑waitlist mode to collect beta‑tester
           impressions.  No‑op when mode === "waitlist". */}
      <FeedbackModal />
    </div>
  );
}