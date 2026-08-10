import type { Metadata } from "next";
import FaqPageClient from "@/components/faq/FaqPageClient";

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
        <section className="mx-auto max-w-[980px] px-2 text-center sm:px-0">
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

        <div className="mt-10 sm:mt-12">
          <FaqPageClient />
        </div>
      </div>
    </>
  );
}
