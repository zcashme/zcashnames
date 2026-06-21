"use client";

import { useCallback, useState } from "react";
import LandingActionLink from "@/components/landing/LandingActionLink";
import { VerifiedModal } from "@/components/landing/VerifiedModal";
import { useWaitlistVerification } from "@/components/hooks/useWaitlistVerification";
import HomePage from "@/components/landing/HomePage";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import type { NetworkStats as Stats } from "@/lib/network-stats";

function LeaderboardLink() {
  return (
    <LandingActionLink
      proximityId="leaderboard-link"
      href="/leaders"
      label="Leaderboard"
      showArrow={false}
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <path d="M8 21L12 17L16 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M16 21V14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12 6.5L13.1 8.8L15.6 9.1L13.8 10.8L14.2 13.3L12 12.1L9.8 13.3L10.2 10.8L8.4 9.1L10.9 8.8L12 6.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      }
    />
  );
}

function DashboardLink() {
  return (
    <LandingActionLink
      proximityId="dashboard-link"
      href="/leaders/ref"
      label="Dashboard"
      showArrow={false}
      icon={
        <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
          <rect x="3" y="4" width="8" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="4" width="8" height="11" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="3" y="13" width="8" height="7" rx="1.8" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="17" width="8" height="3" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      }
    />
  );
}

export default function WaitlistPageClient({ stats }: { stats: Stats }) {
  const { status, banner, clearBanner, closeSuccessModal } = useWaitlistVerification();
  const [waitlistConfirmed, setWaitlistConfirmed] = useState(false);

  const handleConfirm = useCallback(() => setWaitlistConfirmed(true), []);
  const handleReset = useCallback(() => setWaitlistConfirmed(false), []);

  return (
    <>
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
              &times;
            </button>
          </div>
        </div>
      )}

      {status.type === "confirming" && (
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
              Confirming your email...
            </p>
          </div>
        </div>
      )}

      <HomePage
        form={<WaitlistEntryForm onConfirm={handleConfirm} onReset={handleReset} />}
        actionLink={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <DashboardLink />
            <LeaderboardLink />
          </div>
        }
        actionLinkPosition="belowStats"
        stats={stats}
        subtitle="Be first to claim a name you can use, hold, or sell."
        collapsed={waitlistConfirmed}
      />

      <VerifiedModal
        isOpen={status.type === "success"}
        name={status.type === "success" ? status.name : ""}
        ref={status.type === "success" ? status.ref : ""}
        onClose={closeSuccessModal}
      />
    </>
  );
}
