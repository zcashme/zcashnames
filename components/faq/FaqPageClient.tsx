"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  compactPlainText,
  findFaqTarget,
  getFaqSections,
  type FaqSection,
} from "@/lib/faq";
import { FaqAccordion } from "./FaqAccordion";

const sections = getFaqSections();

function itemMatchesQuery(section: FaqSection, itemId: string, query: string): boolean {
  if (!query) return true;
  const item = section.items.find((entry) => entry.id === itemId);
  if (!item) return false;
  const haystack = `${section.title} ${section.href} ${item.question} ${compactPlainText(item.answer)}`.toLowerCase();
  return haystack.includes(query);
}

export default function FaqPageClient() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(sections[0]?.items[0]?.id ?? null);

  const normalizedQuery = query.trim().toLowerCase();

  const visibleSections = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => itemMatchesQuery(section, item.id, normalizedQuery)),
      }))
      .filter((section) => section.items.length > 0);
  }, [normalizedQuery]);

  const visibleCount = visibleSections.reduce((sum, section) => sum + section.items.length, 0);

  useEffect(() => {
    function applyHash(hash: string) {
      const target = findFaqTarget(hash);
      if (!target) return;
      setOpenId(target.itemId);
      const raw = hash.replace(/^#/, "").trim();
      const el = document.getElementById(raw) ?? document.getElementById(target.sectionId);
      el?.scrollIntoView({ block: "start" });
    }

    applyHash(window.location.hash);

    function onHashChange() {
      applyHash(window.location.hash);
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function toggle(id: string) {
    setOpenId((current) => (current === id ? null : id));
  }

  return (
    <>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-[-1rem] z-10 block h-8 w-px"
          style={{ background: "var(--faq-border)" }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[calc(100%-1px)] top-[-1rem] z-10 block h-8 w-px"
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
          <nav className="flex flex-col items-center gap-3 text-center" aria-label="FAQ sections">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
              Jump to page
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-md border border-border-muted px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </nav>

          <div className="mx-auto mt-5 w-full max-w-xl">
            <label className="sr-only" htmlFor="faq-filter">
              Search questions
            </label>
            <input
              id="faq-filter"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search questions"
              className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors placeholder:text-fg-muted focus:border-[var(--color-accent-interactive)]"
              style={{
                borderColor: "var(--faq-border)",
                background: "color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent)",
                color: "var(--fg-heading)",
              }}
            />
            <p className="mt-2 text-center text-xs text-fg-muted">
              {normalizedQuery
                ? `${visibleCount} ${visibleCount === 1 ? "question" : "questions"} match`
                : `${visibleCount} questions across ${sections.length} pages`}
            </p>
          </div>
        </div>
      </div>

      <section className="mx-auto mt-10 w-full max-w-[920px] px-0 pb-4 sm:mt-12">
        {visibleSections.length === 0 ? (
          <p className="text-center type-body" style={{ color: "var(--fg-muted)" }}>
            No questions match that search.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {visibleSections.map((section) => (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="type-kicker" style={{ color: "var(--section-title-accent)" }}>
                    {section.title}
                  </h2>
                  <Link
                    href={section.href}
                    className="text-sm font-semibold transition-colors hover:text-[var(--color-accent-interactive)]"
                    style={{ color: "var(--color-accent-interactive, var(--fg-heading))" }}
                  >
                    {section.pill ?? section.href}
                  </Link>
                </div>
                <p className="mb-3 text-sm leading-6" style={{ color: "var(--fg-muted)" }}>
                  {section.blurb}
                </p>
                <FaqAccordion items={section.items} openId={openId} onToggle={toggle} />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
