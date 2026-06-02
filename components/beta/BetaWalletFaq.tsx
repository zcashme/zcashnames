"use client";

import { useState } from "react";
import Link from "next/link";
import { getWalletFaq } from "@/lib/beta/walletFaq";
import { getWalletBrand, type WalletBrandSlug } from "@/lib/wallets/catalog";

const p: React.CSSProperties = {
  color: "var(--fg-body)",
  lineHeight: 1.75,
  fontSize: "0.97rem",
  marginBottom: "0.75rem",
};

const linkStyle: React.CSSProperties = {
  color: "var(--fg-heading)",
  textDecoration: "underline",
};

export default function BetaWalletFaq({ brandSlug }: { brandSlug: WalletBrandSlug }) {
  const brand = getWalletBrand(brandSlug);
  const faq = getWalletFaq(brandSlug);
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (!brand || !faq?.length) return null;

  const toggleEntry = (entryId: string) => {
    setOpenKey((current) => (current === entryId ? null : entryId));
  };

  return (
    <article className="mx-auto w-full max-w-3xl px-6 pt-0 pb-24">
      <section className="mb-14">
        <div className="mb-6 flex items-center justify-center gap-3.5">
          <span
            className="block h-px w-[clamp(24px,9vw,96px)] shrink-0"
            style={{ background: "linear-gradient(90deg, var(--feature-heading-line-from) 0%, var(--feature-heading-line-to) 100%)" }}
            aria-hidden="true"
          />
          <p
            className="relative z-[1] m-0 whitespace-nowrap bg-clip-text px-3.5 text-transparent type-kicker"
            style={{ backgroundImage: "var(--feature-heading-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Frequently Asked Questions
          </p>
          <span
            className="block h-px w-[clamp(24px,9vw,96px)] shrink-0"
            style={{ background: "linear-gradient(90deg, var(--feature-heading-line-to) 0%, var(--feature-heading-line-from) 100%)" }}
            aria-hidden="true"
          />
        </div>
        <p style={p}>
          Public answers for the current {brand.displayName} beta round, including access,
          pricing, purchase flow, and testing expectations.
        </p>
        <p style={p}>
          For the full beta brief, return to{" "}
          <Link href={`/beta/${brand.slug}`} style={linkStyle}>
            /beta/{brand.slug}
          </Link>
          .
        </p>
      </section>

      <div className="flex flex-col gap-10">
        {faq.map((section, groupIndex) => (
          <section key={section.id} id={section.id}>
            <h3 className="type-kicker mb-4 px-1" style={{ color: "var(--fg-muted)" }}>
              {section.label}
            </h3>
            <div
              className="overflow-hidden rounded-xl"
              style={{ border: "1px solid var(--faq-border)", backgroundColor: "transparent" }}
            >
              {section.entries.map((entry, index) => {
                const key = `${groupIndex}-${entry.id}`;
                const isOpen = openKey === key;
                const isLast = index === section.entries.length - 1;

                return (
                  <div
                    key={entry.id}
                    id={entry.id}
                    style={{ borderBottom: isLast ? "none" : "1px solid var(--faq-border)" }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleEntry(key)}
                      aria-expanded={isOpen}
                      aria-controls={`${entry.id}-answer`}
                      className="flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors duration-200"
                      style={{
                        backgroundColor: "transparent",
                        borderLeft: isOpen
                          ? "3px solid var(--faq-active-border)"
                          : "3px solid transparent",
                      }}
                      onMouseEnter={(event) => {
                        if (!isOpen) {
                          event.currentTarget.style.borderLeftColor = "var(--faq-active-border)";
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!isOpen) {
                          event.currentTarget.style.borderLeftColor = "transparent";
                        }
                      }}
                    >
                      <span className="type-body pr-4" style={{ color: "var(--fg-heading)" }}>
                        {entry.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className="flex-shrink-0 text-xl leading-none transition-transform duration-200"
                        style={{
                          color: "var(--fg-muted)",
                          transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        +
                      </span>
                    </button>

                    <div
                      id={`${entry.id}-answer`}
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{
                        maxHeight: isOpen ? "800px" : "0px",
                        opacity: isOpen ? 1 : 0,
                        backgroundColor: "transparent",
                      }}
                    >
                      <div
                        className="[&_a]:text-[var(--fg-heading)] [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_li]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 px-6 pb-5 type-body"
                        style={{
                          color: "var(--fg-muted)",
                          paddingLeft: "calc(1.5rem + 3px)",
                        }}
                      >
                        {entry.answer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="flex justify-center pt-12">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform] duration-[140ms] hover:-translate-y-px"
        >
          <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
            <path d="M12 19V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to top
        </button>
      </div>
    </article>
  );
}
