import type { Metadata } from "next";
import HeroShareButton from "@/components/HeroShareButton";
import FaqPageClient, { FaqSectionPills } from "@/components/faq/FaqPageClient";

export const metadata: Metadata = {
  title: "FAQ - Zcash Names",
  description: "Frequently asked questions about Zcash Names waitlist reservations and Early Access.",
  alternates: {
    canonical: "https://www.zcashnames.com/faq",
  },
  openGraph: {
    title: "FAQ | Zcash Names",
    description: "Frequently asked questions about Zcash Names waitlist reservations and Early Access.",
    url: "https://www.zcashnames.com/faq",
    images: [
      {
        url: "/og/faq.png",
        width: 1200,
        height: 630,
        alt: "Zcash Names FAQ preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ | Zcash Names",
    description: "Frequently asked questions about Zcash Names waitlist reservations and Early Access.",
    images: ["/og/faq.png"],
  },
};

export default function FaqPage() {
  return (
    <>
      <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
        {/*
          Same join as /protected/suggest: open-bottom hero, fully rounded jump card,
          vertical side rails bridging the short gap between them.
        */}
        <div className="mx-auto w-full max-w-[920px]">
          <div
            className="relative w-full rounded-t-2xl border border-b-0 px-6 py-8 text-center sm:px-8 sm:py-10"
            style={{
              borderColor: "var(--faq-border)",
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
            }}
          >
            <HeroShareButton
              message="Frequently asked questions about Zcash Names reservations, queue ordering, payments, Early Access, and recovery:"
              shareUrl="https://www.zcashnames.com/faq"
              emailSubject="Zcash Names FAQ"
            />
            <h1
              className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
              style={{ color: "var(--fg-heading)" }}
            >
              Frequently asked{" "}
              <span style={{ color: "var(--color-accent-interactive)" }}>questions</span>
            </h1>
          </div>

          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
              style={{ background: "var(--faq-border)" }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[calc(100%-2px)] top-[-1rem] z-10 block h-8 w-px"
              style={{ background: "var(--faq-border)" }}
            />
            <div
              className="rounded-2xl border px-5 py-5 sm:px-6 sm:py-6"
              style={{
                borderColor: "var(--faq-border)",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 76%, transparent), color-mix(in srgb, var(--faq-border) 10%, transparent))",
              }}
            >
              <FaqSectionPills />
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-12">
          <FaqPageClient />
        </div>
      </div>
    </>
  );
}
