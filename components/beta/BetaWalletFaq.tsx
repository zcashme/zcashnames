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
          . For product-wide questions, see the{" "}
          <Link href="/faq#beta" style={linkStyle}>
            /faq
          </Link>{" "}
          beta section.
        </p>
      </section>

      <div className="flex flex-col gap-10">
        {faq.map((section, groupIndex) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h3 className="type-kicker mb-2" style={{ color: "var(--fg-muted)" }}>
              {section.label}
            </h3>
            <div>
              {section.entries.map((entry) => {
                const key = `${groupIndex}-${entry.id}`;
                const isOpen = openKey === key;

                return (
                  <div key={entry.id} id={entry.id} className="border-b border-border-muted">
                    <button
                      type="button"
                      onClick={() => toggleEntry(key)}
                      aria-expanded={isOpen}
                      aria-controls={`${entry.id}-answer`}
                      className="group flex w-full cursor-pointer items-center justify-between py-5 text-left"
                    >
                      <span
                        className={
                          isOpen
                            ? "type-body pr-4 text-[var(--color-accent-interactive,var(--fg-heading))] transition-colors duration-[140ms] ease-out"
                            : "type-body pr-4 text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover:text-[var(--color-accent-interactive,var(--fg-heading))]"
                        }
                      >
                        {entry.question}
                      </span>
                      <span
                        aria-hidden="true"
                        className="shrink-0 text-xl leading-none transition-transform duration-200"
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
                      }}
                    >
                      <div
                        className="[&_a]:text-[var(--fg-heading)] [&_a]:underline [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_li]:mb-2 [&_p]:mb-3 [&_ul]:mb-3 pb-5 type-body"
                        style={{ color: "var(--fg-muted)" }}
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

    </article>
  );
}
