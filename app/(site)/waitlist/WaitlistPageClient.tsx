"use client";

import { useCallback, useState } from "react";
import { VerifiedModal } from "@/components/landing/VerifiedModal";
import { useWaitlistVerification } from "@/components/hooks/useWaitlistVerification";
import HomePage from "@/components/landing/HomePage";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import type { LandingBlogPostCard } from "@/components/landing/LandingRecentBlogs";
import type { NetworkStats as Stats } from "@/lib/network-stats";

export default function WaitlistPageClient({
  stats,
  recentBlogPosts = [],
}: {
  stats: Stats;
  recentBlogPosts?: LandingBlogPostCard[];
}) {
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
              className="zns-modal-close shrink-0 cursor-pointer opacity-60 transition-[color,opacity] duration-200 hover:opacity-100"
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
        stats={stats}
        subtitle="Be first to claim a name you can use, hold, or sell."
        collapsed={waitlistConfirmed}
        recentBlogPosts={recentBlogPosts}
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
