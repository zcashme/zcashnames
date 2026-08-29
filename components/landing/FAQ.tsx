// Homepage FAQ: a short "start here" subset from the shared /faq catalog.
"use client";

import Link from "next/link";
import { useState } from "react";
import SectionHeaderPill from "@/components/landing/SectionHeaderPill";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { getHomeFaqGroups } from "@/lib/faq";

const groups = getHomeFaqGroups();

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [openGroupIndex, setOpenGroupIndex] = useState<number | null>(null);

  return (
    <section className="w-full max-w-3xl mx-auto px-6 pt-0 pb-24">
      <div className="mb-6 text-center">
        <SectionHeaderPill id="faq" title="FAQs" variant="pill" />
      </div>

      <div className="flex flex-col gap-10">
        {groups.map((group, groupIndex) => {
          const isGroupOpen = openGroupIndex === groupIndex;

          return (
            <div key={group.title}>
              <button
                type="button"
                onClick={() => setOpenGroupIndex((prev) => (prev === groupIndex ? null : groupIndex))}
                className="group mb-2 flex w-full cursor-pointer items-center justify-between text-left"
              >
                <h3 className="type-kicker" style={{ color: "var(--section-title-accent)" }}>
                  {group.title}
                </h3>
                <span
                  className="shrink-0 text-xl leading-none transition-transform duration-200"
                  style={{
                    color: "var(--fg-muted)",
                    transform: isGroupOpen ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: isGroupOpen ? "2400px" : "0px",
                  opacity: isGroupOpen ? 1 : 0,
                }}
              >
                <FaqAccordion
                  items={group.items}
                  openId={openId}
                  onToggle={(id) => setOpenId((current) => (current === id ? null : id))}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Link
          href="/faq"
          className="text-sm font-semibold transition-colors hover:text-[var(--color-accent-interactive)]"
          style={{ color: "var(--color-accent-interactive, var(--fg-heading))" }}
          aria-label="See more FAQs"
        >
          See more →
        </Link>
      </div>
    </section>
  );
}
