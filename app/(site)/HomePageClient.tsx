"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Hero from "@/components/landing/Hero";
import HeroSearchForm from "@/components/search/HeroSearchForm";
import FeedbackModal from "@/components/closedbeta/FeedbackModal";
import HomeResultCard from "@/components/landing/HomeResultCard";
import MarketStats from "@/components/landing/MarketStats";
import FAQ from "@/components/landing/FAQ";
import HowItWorks from "@/components/landing/HowItWorks";
import Zip321Modal from "@/components/purchases/Zip321Modal";
import PendingTransactionBanner from "@/components/landing/PendingTransactionBanner";
import { useZns } from "@/components/hooks/useZns";
import { useSearchState } from "@/components/hooks/useSearchState";
import { usePendingTransaction } from "@/components/hooks/usePendingTransaction";
import { submitWaitlist } from "@/lib/waitlist/waitlist";
import { isValidUsername, normalizeUsername } from "@/lib/zns/utils";
import type { Action } from "@/lib/types";
import type { ConfirmWaitlistResult } from "@/lib/waitlist/waitlist";

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

type HomePageClientProps = {
  initialReferralCode?: string | null;
  initialConfirmed?: ConfirmWaitlistResult | null;
};

function InlineNotice({
  tone,
  children,
  action,
}: {
  tone: "neutral" | "warning" | "success";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const style =
    tone === "warning"
      ? {
          background: "var(--home-result-status-negative-bg)",
          color: "var(--home-result-status-negative-fg)",
          border: "1px solid var(--home-result-status-negative-border)",
        }
      : tone === "success"
        ? {
            background: "var(--home-result-status-positive-bg)",
            color: "var(--home-result-status-positive-fg)",
            border: "1px solid var(--feature-chip-border-color)",
          }
        : {
            background: "var(--home-result-status-neutral-bg, var(--feature-card-bg))",
            color: "var(--home-result-link-fg, var(--fg-muted))",
            border: "1px solid var(--home-result-link-border, var(--faq-border))",
          };

  return (
    <div className="mx-auto mb-4 flex max-w-[600px] items-center gap-3 rounded-2xl px-5 py-4 text-sm font-semibold backdrop-blur-md" style={style}>
      <span className="flex-1">{children}</span>
      {action}
    </div>
  );
}

function WaitlistPanel({
  name,
  referralCode,
  confirmed,
  onEditName,
}: {
  name: string;
  referralCode: string | null;
  confirmed: ConfirmWaitlistResult | null;
  onEditName: (value: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitError(null);
    setSubmitted(false);
    setEmail("");
  }, [name]);

  const normalizedName = useMemo(() => normalizeUsername(name), [name]);
  const isConfirmed = confirmed?.status === "success" || confirmed?.status === "already";
  const confirmedName = confirmed?.name ?? normalizedName;
  const confirmedRef = confirmed?.ref ?? referralCode ?? null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting || !isValidUsername(normalizedName)) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitWaitlist({
        name: normalizedName,
        email,
        newsletter: true,
        referral_code: "",
        referred_by: referralCode,
      });

      if (result.error) {
        setSubmitError(result.error);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isConfirmed) {
    return (
      <section className="mx-auto mb-6 w-full max-w-[640px] px-4">
        <div className="home-result-card relative overflow-hidden rounded-[20px] bg-[var(--home-result-bg)] px-5 py-5 shadow-[var(--home-result-shadow)]">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--home-result-status-positive-bg)] text-[var(--home-result-status-positive-fg)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="m-0 text-[1.35rem] font-extrabold text-[var(--home-result-name-color)]">You&apos;re on the waitlist</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--fg-body)]">
            {confirmed?.status === "already"
              ? `Your email was already confirmed for ${confirmedName}.`
              : `Your email is confirmed for ${confirmedName}.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {confirmedRef ? (
              <Link
                href={`/leaders/ref/${encodeURIComponent(confirmedRef)}`}
                className="home-result-action is-primary inline-flex items-center justify-center no-underline"
              >
                View referral dashboard
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => onEditName(confirmedName)}
              className="home-result-action is-secondary"
            >
              Search another name
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="mx-auto mb-6 w-full max-w-[640px] px-4">
        <div className="home-result-card relative overflow-hidden rounded-[20px] bg-[var(--home-result-bg)] px-5 py-5 shadow-[var(--home-result-shadow)]">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(244,183,40,0.15)] text-[#f4b728]">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h2 className="m-0 text-[1.35rem] font-extrabold text-[var(--home-result-name-color)]">Check your email</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--fg-body)]">
            We sent a confirmation link for <span className="font-semibold">{normalizedName}.zcash</span>. Click it to secure your spot on the waitlist.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onEditName(normalizedName)}
              className="home-result-action is-secondary"
            >
              Edit name
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mb-6 w-full max-w-[640px] px-4">
      <div className="home-result-card relative overflow-hidden rounded-[20px] bg-[var(--home-result-bg)] px-5 py-5 shadow-[var(--home-result-shadow)]">
        <div className="flex items-start justify-between gap-3 max-[700px]:flex-col">
          <div className="min-w-0">
            <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-[0.08em] text-[var(--fg-muted)]">Early Access</p>
            <h2 className="m-0 mt-1 break-all text-[1.35rem] font-extrabold text-[var(--home-result-name-color)]">{normalizedName}.zcash</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--fg-body)]">
              This stage collects your email and secures your waitlist spot for the name you searched.
            </p>
          </div>
          <button type="button" onClick={() => onEditName(normalizedName)} className="home-result-action is-secondary">
            Change name
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="text-sm font-semibold text-[var(--fg-body)]" htmlFor="waitlist-email">
            Email
          </label>
          <input
            id="waitlist-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            className="h-12 rounded-[14px] border px-4 text-[0.98rem] outline-none transition-shadow"
            style={{
              background: "var(--waitlist-input-bg)",
              borderColor: "var(--waitlist-input-border)",
              color: "var(--waitlist-input-text)",
              boxShadow: "none",
            }}
          />
          {submitError ? (
            <p className="m-0 text-sm font-semibold" style={{ color: "var(--home-result-status-negative-fg)" }}>
              {submitError}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="submit" disabled={submitting} className="home-result-action is-primary">
              {submitting ? "Submitting..." : "Join waitlist"}
            </button>
            <p className="m-0 text-xs leading-5 text-[var(--fg-muted)]">
              We&apos;ll send a confirmation link and your referral dashboard after you verify your email.
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}

export default function HomePageClient({
  initialReferralCode = null,
  initialConfirmed = null,
}: HomePageClientProps) {
  const { zns } = useZns();
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [waitlistConfirmed, setWaitlistConfirmed] = useState<ConfirmWaitlistResult | null>(initialConfirmed);
  const [waitlistSearchedName, setWaitlistSearchedName] = useState(initialConfirmed?.name ?? "");

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
  } = useSearchState(zns.mode === "waitlist" ? "testnet" : zns.mode);
  const {
    hydrated: pendingHydrated,
    pendingTransaction,
    persistPendingTransaction,
    clearPendingTransaction,
  } = usePendingTransaction();

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const isWaitlistMode = zns.mode === "waitlist";
  const waitlistName = useMemo(() => normalizeUsername(waitlistSearchedName), [waitlistSearchedName]);
  const waitlistInput = isWaitlistMode ? waitlistSearchedName : input;

  function handleWaitlistInput(value: string) {
    setWaitlistConfirmed(null);
    setWaitlistSearchedName(value);
  }

  function handleWaitlistSearch(nameValue: string) {
    const normalized = normalizeUsername(nameValue);
    setWaitlistConfirmed(null);
    setWaitlistSearchedName(normalized);
  }

  function resetWaitlistSearch(nameValue = "") {
    setWaitlistConfirmed(null);
    setWaitlistSearchedName(nameValue);
  }

  const form = (
    <HeroSearchForm
      value={waitlistInput}
      onChange={isWaitlistMode ? handleWaitlistInput : setInput}
      onSubmit={isWaitlistMode ? handleWaitlistSearch : handleSearch}
      claimLoading={searching && !isWaitlistMode}
    />
  );

  return (
    <div className="home-page">
      <section className="hero-stage-bg">
        <Hero
          searchForm={form}
          rightPanel={<PhoneStage embedded />}
          formExpanded={false}
          subtitle={isWaitlistMode ? <>Search a name, then join the early access waitlist</> : <>Powered by Zcash. Claim your name</>}
        />
      </section>

      {isWaitlistMode ? (
        <>
          {initialConfirmed?.status === "invalid" ? (
            <InlineNotice tone="warning">That confirmation link is invalid or expired.</InlineNotice>
          ) : null}

          {!waitlistName && !waitlistConfirmed && (
            <InlineNotice tone="neutral">Search a name above to join the waitlist.</InlineNotice>
          )}

          {waitlistName || waitlistConfirmed ? (
            <WaitlistPanel
              name={waitlistName || waitlistConfirmed?.name || ""}
              referralCode={initialReferralCode}
              confirmed={waitlistConfirmed}
              onEditName={resetWaitlistSearch}
            />
          ) : null}
        </>
      ) : (
        <>
          {searchError && (
            <InlineNotice
              tone="warning"
              action={(
                <button
                  type="button"
                  onClick={resetSearch}
                  className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-opacity hover:opacity-70"
                  style={{ background: "transparent", border: "1.5px solid currentColor" }}
                >
                  Dismiss
                </button>
              )}
            >
              {searchError}
            </InlineNotice>
          )}

          {results.length === 0 && !searching && (
            <InlineNotice tone="neutral">Enter a name above to check availability.</InlineNotice>
          )}

          {results.map((result) => {
            const props = buildCardProps(result);
            const displayName = `${result.query}.zcash`;
            const isPopular = POPULAR_NAMES.has(result.query);

            return (
              <HomeResultCard
                key={result.query}
                displayName={displayName}
                network={zns.mode}
                {...props}
                isPopularName={isPopular}
                onAction={(_action: Action) => {}}
                onDismiss={() => removeResult(result.query)}
              />
            );
          })}
        </>
      )}

      <MarketStats />

      {zns.mode !== "waitlist" && pendingHydrated && pendingTransaction && (
        <PendingTransactionBanner
          pendingTransaction={pendingTransaction}
          onResume={() => {}}
          onDismiss={clearPendingTransaction}
        />
      )}

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
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
