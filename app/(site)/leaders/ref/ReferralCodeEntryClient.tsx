// Client component: form that accepts a raw referral code or full referral link,
// extracts the code via extractReferralCode(), and navigates to the per-code
// dashboard at /leaders/ref/[code]. Also links to the terms page.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import ReferralCodeRecovery from "@/components/ReferralCodeRecovery";
import { extractReferralCode } from "@/lib/referral-code";

const ACTION_INSET_PX = 4;

export default function ReferralCodeEntryPage() {
  const router = useRouter();
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
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-4 sm:px-6">
      <section
        className="mx-auto max-w-2xl rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg-heading">
            Enter your referral code to see your dashboard.
          </h1>
          <p className="mt-3 text-sm text-fg-muted">
            Check your inbox - we sent you a referral link after you signed up for early access.
          </p>

          <form onSubmit={submitReferralCode} className="mt-6">
            <label className="block text-sm font-semibold text-fg-heading" htmlFor="referral-code">
              Referral code or link
            </label>
            <div className="relative mt-2 flex items-center">
              <input
                id="referral-code"
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setError("");
                }}
                placeholder="zcashnames.com/?ref=your-code"
                className="w-full min-w-0 rounded-2xl border bg-transparent py-3 pl-4 pr-[5.5rem] text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
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
            <div className="mt-3">
              <ReferralCodeRecovery
                className="w-full"
                triggerClassName="w-full cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-muted disabled:cursor-not-allowed disabled:opacity-60"
                formClassName="mt-4 flex flex-col gap-3 border-t pt-4"
                controlsId="leaders-ref-forgot-code"
              />
            </div>
            {error && <p className="mt-2 text-sm text-fg-muted">{error}</p>}
          </form>
          <p className="mt-4 text-center text-xs text-fg-muted">
            Referral rewards are subject to{" "}
            <Link href="/leaders/terms" className="underline underline-offset-2">
              terms
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
