"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { extractReferralCode } from "@/lib/referral-code";

export default function ReferralCodeEntryPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

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
        className="rounded-2xl border p-5 sm:p-6"
        style={{ background: "var(--leaders-card-bg)", borderColor: "var(--leaders-card-border)" }}
      >
        <div className="max-w-xl">
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
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="referral-code"
                type="text"
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  setError("");
                }}
                placeholder="zcashnames.com/?ref=your-code"
                className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2 text-base text-fg-heading outline-none transition-colors placeholder:text-fg-muted focus:border-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
              />
              <button
                type="submit"
                className="cursor-pointer rounded-lg border px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-muted"
                style={{ borderColor: "var(--leaders-card-border)" }}
              >
                View dashboard
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-fg-muted">{error}</p>}
          </form>
          <p className="mt-4 text-xs text-fg-muted">
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
