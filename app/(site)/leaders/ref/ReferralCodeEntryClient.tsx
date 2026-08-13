// Client component: form that accepts a raw referral code or full referral link,
// extracts the code via extractReferralCode(), and navigates to the per-code
// dashboard at /leaders/ref/[code]. Also links to the terms page.
"use client";

import Link from "next/link";
import { useAppRouter } from "@/components/hooks/useAppRouter";
import { useState, type FormEvent } from "react";
import { useTheme } from "next-themes";
import HeroShareButton from "@/components/HeroShareButton";
import ReferralCodeRecovery from "@/components/ReferralCodeRecovery";
import { extractReferralCode } from "@/lib/referral-code";

const ACTION_INSET_PX = 4;

export default function ReferralCodeEntryPage() {
  const router = useAppRouter();
  const { resolvedTheme } = useTheme();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const hasInput = input.trim().length > 0;

  const submitReferralCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const referralCode = extractReferralCode(input);
    if (!referralCode) {
      setError("Enter a referral code or referral link.");
      return;
    }

    router.push(`/leaders/ref/${encodeURIComponent(referralCode)}`);
  };

  return (
    <main className="mx-auto w-full max-w-[1320px] px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div
        className="relative mx-auto w-full max-w-[920px] rounded-2xl border px-6 py-8 text-center sm:px-8 sm:py-10"
        style={{
          borderColor: "var(--faq-border)",
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
        }}
      >
        <HeroShareButton
          message="Open your Zcash Names referral dashboard with your referral code:"
          shareUrl="https://www.zcashnames.com/leaders/ref"
          emailSubject="Zcash Names referral dashboard"
        />
        <h1
          className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
          style={{ color: "var(--fg-heading)" }}
        >
          Enter referral code to{" "}
          <span style={{ color: "var(--color-accent-interactive)" }}>view dashboard</span>
        </h1>
        <p
          className="mx-auto mt-4 max-w-2xl text-center text-lg leading-8"
          style={{ color: "var(--fg-body)" }}
        >
          Check your inbox - we sent you a referral link after
          <br />
          you signed up for early access.
        </p>

        <div className="mx-auto mt-8 w-full max-w-[36rem] text-left sm:mt-9">
          <form onSubmit={submitReferralCode} className="flex flex-col gap-3">
            <label
              className="text-center text-base font-semibold"
              style={{ color: "var(--fg-heading)" }}
              htmlFor="referral-code"
            >
              Referral code or link
            </label>
            <div className="relative flex items-center">
              <input
                id="referral-code"
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setError("");
                }}
                placeholder="zcashnames.com/?ref=your-code"
                className={`w-full min-w-0 rounded-2xl border border-border-muted py-3 pl-4 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted ${
                  resolvedTheme === "light" ? "bg-[var(--color-card)]" : "bg-[var(--input-fill)]"
                } pr-[5.5rem]`}
              />
              <span
                className="absolute flex items-center"
                style={{
                  top: ACTION_INSET_PX,
                  right: ACTION_INSET_PX,
                  bottom: ACTION_INSET_PX,
                }}
              >
                <button
                  type="submit"
                  disabled={!hasInput}
                  className="inline-flex h-[calc(100%-2px)] shrink-0 items-center justify-center rounded-[13px] px-4 text-sm font-semibold leading-none transition"
                  style={{
                    background: hasInput
                      ? "var(--home-result-primary-bg)"
                      : "color-mix(in srgb, var(--leaders-card-border, var(--border-muted)) 22%, transparent)",
                    color: hasInput
                      ? "var(--home-result-primary-fg)"
                      : "var(--fg-muted)",
                    boxShadow: hasInput ? "var(--home-result-primary-shadow)" : "none",
                    cursor: hasInput ? "pointer" : "not-allowed",
                  }}
                >
                  View
                </button>
              </span>
            </div>
            <ReferralCodeRecovery
              className="text-center"
              controlsId="leaders-ref-forgot-code"
            />
            {error ? (
              <p className="text-sm" style={{ color: "var(--fg-muted)" }}>
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>

      <p
        className="mx-auto mt-8 max-w-[920px] text-center text-xs sm:mt-10"
        style={{ color: "var(--fg-muted)" }}
      >
        Referral rewards are subject to{" "}
        <Link
          href="/leaders/terms"
          className="underline underline-offset-2 transition-colors hover:text-[var(--color-accent-interactive)]"
        >
          terms
        </Link>
        .
      </p>
    </main>
  );
}
