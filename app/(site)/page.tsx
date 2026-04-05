"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import Hero from "@/components/landing/Hero";
import SearchForm from "@/components/search/SearchForm";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import HomeResultCard from "@/components/landing/HomeResultCard";
import MarketStats from "@/components/landing/MarketStats";
import FAQ from "@/components/landing/FAQ";
import HowItWorks from "@/components/landing/HowItWorks";
import Link from "next/link";
import { useStatus } from "@/components/StatusToggle";
import { resolveName, getUsdPerZec } from "@/lib/zns/resolve";
import { normalizeUsername, formatUsdEquivalent } from "@/lib/zns/name";
import { isPopularName } from "@/lib/name-frequency";
import type { ResolveName, Action } from "@/lib/types";
import { confirmWaitlistEmail } from "@/lib/waitlist/waitlist";
import SurveyForm from "@/components/SurveyForm";
import Zip321Modal from "@/components/landing/Zip321Modal";
import type { ModalTarget } from "@/components/landing/Zip321Modal";

const PhoneStage = dynamic(() => import("@/components/landing/PhoneStage"), {
  ssr: false,
  loading: () => (
    <div className="phone-stage w-full overflow-visible relative z-20">
      <div className="relative isolate w-full overflow-visible">
        {/* Skeleton chips */}
        <div className="absolute -left-1 -top-[24px] z-30 sm:left-1 sm:top-[68px] md:left-4 md:-top-[24px] xl:-left-9 xl:-top-[14px] -rotate-[8deg]">
          <div className="h-[46px] w-[130px] rounded-[16px] sm:h-[52px] sm:w-[148px] sm:rounded-[18px] animate-pulse opacity-25 bg-[#2a2a2c]" />
        </div>
        <div className="absolute -right-4 top-[58px] z-30 sm:right-0 sm:top-[66px] md:right-2 md:-top-[26px] xl:-right-9 xl:-top-[16px] rotate-[6deg]">
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

type VerifiedModalView = "confirm" | "survey" | "thankyou";

const VERIFIED_MODAL_TRANSITION = "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
function verifiedModalViewTransform(
  view: VerifiedModalView,
  current: VerifiedModalView,
): { transform: string; pointerEvents: "auto" | "none" } {
  if (view === "confirm") {
    if (current === "survey" || current === "thankyou") {
      return { transform: "translateY(-100%)", pointerEvents: "none" };
    }
    return { transform: "translate(0, 0)", pointerEvents: "auto" };
  }
  if (view === "survey") {
    if (current === "survey") return { transform: "translate(0, 0)", pointerEvents: "auto" };
    if (current === "thankyou") return { transform: "translateY(-100%)", pointerEvents: "none" };
    return { transform: "translateY(100%)", pointerEvents: "none" };
  }
  if (current === "thankyou") return { transform: "translate(0, 0)", pointerEvents: "auto" };
  return { transform: "translateY(100%)", pointerEvents: "none" };
}

export default function HomePage() {
  const { status, isSearchMode, network, networkPassword, refresh } = useStatus();

  const [input, setInput] = useState("");
  const [results, setResults] = useState<ResolveName[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const [waitlistConfirmed, setWaitlistConfirmed] = useState(false);


  const [verifiedBanner, setVerifiedBanner] = useState<string | null>(null);
  const [verifiedModal, setVerifiedModal] = useState<{ name: string; ref: string } | null>(null);
  const [vmCopied, setVmCopied] = useState(false);
  const [verifiedModalView, setVerifiedModalView] = useState<VerifiedModalView>("confirm");
  const [surveyContactMsg, setSurveyContactMsg] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [tokenConfirming, setTokenConfirming] = useState(false);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);
  const [usdPerZec, setUsdPerZec] = useState<number | null>(null);

  useEffect(() => {
    setIsClientMounted(true);
    getUsdPerZec().then(setUsdPerZec).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");

    if (verified === "success") {
      const ref = params.get("ref") || "";
      const name = params.get("name") || "";
      if (ref) setVerifiedModal({ name, ref });
    } else if (verified === "already") {
      setVerifiedBanner("Your email is already confirmed.");
    } else if (verified === "invalid") {
      setVerifiedBanner("Invalid or expired confirmation link.");
    }

    if (verified) {
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      url.searchParams.delete("ref");
      url.searchParams.delete("name");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState({}, "", url.pathname + url.search);

    setTokenConfirming(true);
    confirmWaitlistEmail(token)
      .then((result) => {
        if (result.status === "success") {
          setVerifiedModal({ name: result.name ?? "", ref: result.ref ?? "" });
        } else if (result.status === "already") {
          setVerifiedBanner("Your email is already confirmed.");
        } else {
          setVerifiedBanner("Invalid or expired confirmation link.");
        }
      })
      .catch(() => {
        setVerifiedBanner("Something went wrong confirming your email.");
      })
      .finally(() => {
        setTokenConfirming(false);
      });
  }, []);

  useEffect(() => {
    requestIdRef.current += 1;
    setInput("");
    setResults([]);
    setSearching(false);
    setSearchError(null);
  }, [status]);

  async function handleSearch(nameValue: string) {
    const name = normalizeUsername(nameValue);
    setInput(name);

    if (!/^[a-z0-9]{1,62}$/.test(name)) {
      setSearching(false);
      setSearchError("Use 1-62 characters: lowercase letters and numbers only.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    setSearchError(null);

    try {
      const res = await resolveName(name, network);
      if (requestIdRef.current !== requestId) return;
      setResults((prev) => {
        const withoutCurrent = prev.filter((item) => item.query !== res.query);
        return [res, ...withoutCurrent];
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setSearchError(
        err instanceof Error
          ? err.message
          : "Network error while searching. The indexer may be down.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setSearching(false);
      }
    }
  }

  function closeVerifiedModal() {
    setVerifiedModal(null);
    setVmCopied(false);
    setVerifiedModalView("confirm");
    setSurveyContactMsg(false);
  }

  const form = isSearchMode ? (
    <>
      <SearchForm
        value={input}
        onChange={(value) => {
          setInput(value);
          if (searchError || searching) {
            requestIdRef.current += 1;
            setSearchError(null);
            setSearching(false);
          }
        }}
        onSubmit={handleSearch}
        claimLoading={searching}
      />
      {results.length > 0 && (
        <div className="mt-4 flex w-full max-w-4xl flex-col gap-3">
          {results.map((item) => (
            <HomeResultCard
              key={item.query}
              displayName={`${item.query}.zcash`}
              isPopularName={isPopularName(item.query)}
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
                if (action === "remove") {
                  setResults((prev) => prev.filter((existing) => existing.query !== item.query));
                  return;
                }
                const t: ModalTarget = {
                  name: item.query,
                  action: action as Action,
                  network,
                  networkPassword,
                  isReserved: item.status === "reserved",
                };
                if (item.status === "registered" || item.status === "listed") {
                  t.registrationAddress = item.registration.address;
                }
                setModalTarget(t);
              }}
              onDismiss={() =>
                setResults((prev) => prev.filter((existing) => existing.query !== item.query))
              }
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

  return (
    <div className="home-theme-scope">
      {verifiedBanner && (
        <div className="relative z-20 mx-auto max-w-xl px-4 pt-2">
          <div
            className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold"
            style={{
              background: "var(--home-error-bg, rgba(255,116,116,0.12))",
              borderColor: "var(--home-error-border, rgba(255,116,116,0.4))",
              color: "var(--home-error-text, #ffc0c0)",
            }}
          >
            <span>{verifiedBanner}</span>
            <button
              type="button"
              onClick={() => setVerifiedBanner(null)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {tokenConfirming && (
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
          formExpanded={status === "waitlist" && waitlistConfirmed}
          subtitle={
            isSearchMode
              ? <>Powered by Zcash. Claim your name</>
              : <>Be first to claim a name you can use, hold, or sell.</>
          }
        />
      </section>

      <MarketStats />

      <div className="relative z-[2] -mt-4 mb-2 flex justify-center">
        {isSearchMode ? (
          <Link
            href="/explorer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--home-result-link-border)] bg-[var(--home-result-link-bg)] px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform,background-color] duration-[140ms] hover:-translate-y-px hover:bg-[var(--home-result-link-hover-bg)]"
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
              <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
              <circle cx="12" cy="12" r="1.15" fill="currentColor" />
              <path d="M12 2.4v3.2M12 18.4v3.2M2.4 12h3.2M18.4 12h3.2M5.6 5.6l2.2 2.2M16.2 16.2l2.2 2.2M18.4 5.6l-2.2 2.2M7.8 16.2l-2.2 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="8.85" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            Explorer &rarr;
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
            Leaderboard &rarr;
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

      {isClientMounted && verifiedModal && (() => {
        const shareUrl = `https://zcashnames.com/?ref=${verifiedModal.ref}`;
        return createPortal(
          <div
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
            onClick={closeVerifiedModal}
          >
            <div
              className="relative rounded-2xl w-full max-w-md overflow-hidden"
              style={{
                background: "var(--feature-card-bg)",
                border: "1px solid var(--faq-border)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
                maxHeight: "calc(100vh - 2rem)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  ...verifiedModalViewTransform("confirm", verifiedModalView),
                  transition: VERIFIED_MODAL_TRANSITION,
                  position: verifiedModalView === "confirm" ? "relative" : "absolute",
                  inset: verifiedModalView !== "confirm" ? 0 : undefined,
                  overflow: "auto",
                }}
              >
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <span
                    className="flex items-center justify-center w-14 h-14 rounded-full mb-1"
                    style={{ background: "var(--color-accent-green-light)", color: "var(--color-accent-green)" }}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <h2 className="text-xl font-bold" style={{ color: "var(--fg-heading)" }}>
                    {verifiedModal.name ? `${verifiedModal.name}, you\u2019re` : "You\u2019re"} on the list!
                  </h2>
                  <p className="text-sm" style={{ color: "var(--fg-body)", lineHeight: 1.6 }}>
                    We&rsquo;ll reach out before we launch.
                  </p>
                  <div className="w-full rounded-xl px-4 py-3 flex flex-col gap-3 text-left" style={{ border: "1px solid var(--border-muted)" }}>
                    <p className="text-xs" style={{ color: "var(--fg-muted)", lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--fg-body)" }}>Get 0.05 ZEC </strong>for each referral who joins the waitlist and buys their name during launch week.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(shareUrl);
                          setVmCopied(true);
                          setTimeout(() => setVmCopied(false), 2000);
                        }}
                        className="flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                      >
                        {vmCopied ? (
                          <><svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 8l4 4 8-8" /></svg>Copied!</>
                        ) : (
                          <><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy Link</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (navigator.share) {
                            try {
                              await navigator.share({ title: "ZcashNames", url: shareUrl });
                            } catch {
                              // dismissed
                            }
                          } else {
                            await navigator.clipboard.writeText(shareUrl);
                            setVmCopied(true);
                            setTimeout(() => setVmCopied(false), 2000);
                          }
                        }}
                        className="flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)" }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                        Share Link
                      </button>
                      <a
                        href={`https://x.com/intent/post?text=${encodeURIComponent(`Whoa - @zcashnames is going to be big. I found the waitlist. Sign up and get alerted before they launch. ${shareUrl}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 flex-1 rounded-lg py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-80"
                        style={{ background: "transparent", border: "1.5px solid var(--border-muted)", color: "var(--fg-body)", textDecoration: "none" }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                        Post on X
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center w-full pt-1">
                    <button
                      type="button"
                      onClick={() => setVerifiedModalView("survey")}
                      className="px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={{
                        background: "var(--home-result-primary-bg)",
                        color: "var(--home-result-primary-fg)",
                        boxShadow: "var(--home-result-primary-shadow)",
                      }}
                    >
                      Take Survey
                    </button>
                    <button
                      type="button"
                      onClick={closeVerifiedModal}
                      className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                      style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  ...verifiedModalViewTransform("survey", verifiedModalView),
                  transition: VERIFIED_MODAL_TRANSITION,
                  position: verifiedModalView === "survey" ? "relative" : "absolute",
                  inset: verifiedModalView !== "survey" ? 0 : undefined,
                  overflow: "auto",
                }}
              >
                <SurveyForm
                  referralCode={verifiedModal.ref}
                  onComplete={(shouldContact) => {
                    setSurveyContactMsg(shouldContact);
                    setVerifiedModalView("thankyou");
                  }}
                  onBack={() => setVerifiedModalView("confirm")}
                />
              </div>

              <div
                style={{
                  ...verifiedModalViewTransform("thankyou", verifiedModalView),
                  transition: VERIFIED_MODAL_TRANSITION,
                  position: verifiedModalView === "thankyou" ? "relative" : "absolute",
                  inset: verifiedModalView !== "thankyou" ? 0 : undefined,
                  overflow: "auto",
                }}
              >
                <div className="p-8 flex flex-col items-center gap-4 text-center">
                  <span
                    className="flex items-center justify-center w-14 h-14 rounded-full mb-1"
                    style={{ background: "var(--home-result-status-positive-bg)", color: "var(--home-result-status-positive-fg)" }}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <h2 className="text-xl font-bold" style={{ color: "var(--fg-heading)" }}>Thank you!</h2>
                  <p className="text-sm" style={{ color: "var(--fg-body)" }}>Your responses help us build a better product.</p>
                  {surveyContactMsg && (
                    <p className="text-sm font-semibold" style={{ color: "var(--fg-heading)" }}>We&rsquo;ll contact you soon.</p>
                  )}
                  <button
                    type="button"
                    onClick={closeVerifiedModal}
                    className="px-8 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
                    style={{ background: "var(--fg-heading)", color: "var(--color-background)" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        );
      })()}

      {isClientMounted && modalTarget && (
        <Zip321Modal target={modalTarget} onClose={() => setModalTarget(null)} />
      )}
    </div>
  );
}

