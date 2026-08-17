import type { Metadata } from "next";
import HeroShareButton from "@/components/HeroShareButton";
import FaqPageClient from "@/components/faq/FaqPageClient";
import { compactPlainText, getFaqSections } from "@/lib/faq";

const FAQ_DESCRIPTION =
  "Authoritative answers for every Zcash Names page: waitlist, reserve, leaders, protected names, explorer, beta, docs, and more.";

export const metadata: Metadata = {
  title: "FAQ - Zcash Names",
  description: FAQ_DESCRIPTION,
  alternates: {
    canonical: "https://www.zcashnames.com/faq",
  },
  openGraph: {
    title: "FAQ | Zcash Names",
    description: FAQ_DESCRIPTION,
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
    description: FAQ_DESCRIPTION,
    images: ["/og/faq.png"],
  },
};

function FaqJsonLd() {
  const mainEntity = getFaqSections().flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: compactPlainText(item.answer),
      },
    })),
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity,
        }),
      }}
    />
  );
}

export default function FaqPage() {
  return (
    <>
      <FaqJsonLd />
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
              message="The complete Zcash Names FAQ — waitlist, reserve, leaders, protected names, explorer, beta, and more:"
              shareUrl="https://www.zcashnames.com/faq"
              emailSubject="Zcash Names FAQ"
            />
            <h1
              className="mx-auto max-w-[calc(100%-3.25rem)] text-balance text-4xl font-black tracking-[-0.05em] sm:max-w-[calc(100%-3.75rem)] sm:text-5xl md:text-6xl"
              style={{ color: "var(--fg-heading)" }}
            >
              Frequently asked{" "}
              <span style={{ color: "var(--color-accent-interactive)" }}>questions</span>
            </h1>
          </div>

          <FaqPageClient />
        </div>
      </div>
    </>
  );
}
