import type { Metadata } from "next";
import Link from "next/link";
import FaqPageClient from "@/components/faq/FaqPageClient";
import VerifyAmbientHeroSection from "@/components/verify/VerifyAmbientHeroSection";
import { WAITLIST_VIEW_EARLY_ACCESS_START_AT } from "@/lib/waitlist/view";

export const metadata: Metadata = {
  title: "FAQ - Zcash Names",
  description: "Frequently asked questions about Zcash Names waitlist reservations and Early Access.",
};

export default function FaqPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        <VerifyAmbientHeroSection
          earlyAccessStartAt={WAITLIST_VIEW_EARLY_ACCESS_START_AT}
          hero={
            <section
              className="mx-auto max-w-[980px] rounded-2xl border px-6 py-8 text-center sm:px-8 sm:py-10"
              style={{
                borderColor: "var(--faq-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
              }}
            >
              <h1
                className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
                style={{ color: "var(--fg-heading)" }}
              >
                Frequently asked{" "}
                <span style={{ color: "var(--color-accent-interactive)" }}>questions</span>
              </h1>
              <p
                className="mx-auto mt-4 max-w-2xl text-lg leading-8"
                style={{ color: "var(--fg-body)" }}
              >
                Answers about reservations, queue ordering, payments, Early Access, and recovery.
              </p>
            </section>
          }
        />

        <FaqPageClient />

        <div
          className="mx-auto mt-12 max-w-[1100px] border-t pt-8 text-center"
          style={{ borderColor: "color-mix(in srgb, var(--faq-border) 84%, transparent)" }}
        >
          <Link
            href="mailto:support@zcashnames.com"
            className="inline-flex items-center gap-2 text-base font-semibold transition hover:opacity-80 sm:text-lg"
            style={{ color: "var(--color-accent-interactive)" }}
          >
            Contact support for help
          </Link>
        </div>
      </div>
    </>
  );
}
