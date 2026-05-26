"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import AnimatedHeadline from "@/components/landing/AnimatedHeadline";
import MarketStats from "@/components/landing/MarketStats";
import HowItWorks from "@/components/landing/HowItWorks";
import FAQ from "@/components/landing/FAQ";
import type { NetworkStats as Stats } from "@/lib/network-stats";

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

type Props = {
  form: React.ReactNode;
  actionLink: React.ReactNode;
  stats: Stats;
  subtitle?: React.ReactNode;
  collapsed?: boolean;
};

export default function HomePage({ form, actionLink, stats, subtitle, collapsed = false }: Props) {
  const phonePanelRef = useRef<HTMLDivElement>(null);

  return (
    <div className="home-theme-scope">
      <section className="landing-top w-full flex flex-col items-center px-4 relative -mt-[92px]">
        <div className="landing-top-grid w-full max-w-[1320px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(560px,640px)] items-start xl:items-center overflow-visible">
          <AnimatedHeadline triggerRef={phonePanelRef} collapsed={collapsed}>
            <div className="w-full max-w-2xl sm:max-w-3xl xl:max-w-4xl self-center xl:self-start flex flex-col items-center gap-3">
              {form}
              {subtitle && (
                <p
                  className="type-section-subtitle text-center"
                  style={{ color: "var(--fg-body)", letterSpacing: "-0.01em" }}
                >
                  {subtitle}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      verticalAlign: "0.25em",
                      width: "1.2em",
                      height: "1.2em",
                      marginLeft: "0.25em",
                    }}
                  >
                    <path d="M1 16 C10 16 14 10 14 2 M8 8 L14 2 L20 8" />
                  </svg>
                </p>
              )}
            </div>
          </AnimatedHeadline>

          <div
            ref={phonePanelRef}
            className="order-2 xl:order-none w-full flex justify-center xl:justify-end items-start overflow-visible"
          >
            <PhoneStage embedded />
          </div>
        </div>
      </section>

      <MarketStats stats={stats} />

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
        {actionLink}
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
    </div>
  );
}
