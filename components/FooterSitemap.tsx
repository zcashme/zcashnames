"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { SITEMAP_SECTIONS } from "@/lib/site-nav";

const accentHoverClass =
  "transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]";

const straddleButtonClassName = `inline-flex cursor-pointer items-center gap-2 rounded-full border border-border-muted bg-[var(--color-background)] px-4 py-2 text-sm font-semibold text-fg-heading ${accentHoverClass}`;

/** Show Top when document is meaningfully taller than the viewport. */
const LONG_PAGE_MIN_RATIO = 1.35;

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Same stroke style as ChevronIcon, pointing left (←). */
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 4l-4 4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FooterSitemap() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const panelId = useId();
  /** Open-map chrome only — excluded so expanding Sitemap cannot invent Top. */
  const expandableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Career job + apply pages: show Careers straddle control (and keep Top available).
  const showCareersBack =
    /^\/careers\/[^/]+(?:\/apply)?\/?$/.test(pathname) && pathname !== "/careers";
  // Job detail only (not /apply): spacing above/below Application URL is owned
  // by the page (symmetric margins), so footer top margin collapses to 0.
  const isCareerJobPage =
    /^\/careers\/[^/]+\/?$/.test(pathname) && pathname !== "/careers";

  useEffect(() => {
    function recompute() {
      const doc = document.documentElement;
      // Base page length: ignore height contributed by the open sitemap panel.
      const expandable = expandableRef.current?.offsetHeight ?? 0;
      const longEnough =
        doc.scrollHeight - expandable > window.innerHeight * LONG_PAGE_MIN_RATIO;
      // Career job/apply pages always get Top so it is not lost when page height dips.
      setShowBackToTop(longEnough || showCareersBack);
    }

    recompute();
    window.addEventListener("resize", recompute);
    // Content can load/expand after mount (tables, images). Also fires when
    // the sitemap panel opens/closes; expandable height is subtracted above.
    const observer = new ResizeObserver(recompute);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener("resize", recompute);
      observer.disconnect();
    };
  }, [pathname, showCareersBack]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const sitemapButton = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={panelId}
      onClick={() => setOpen((value) => !value)}
      className={straddleButtonClassName}
    >
      <span>Sitemap</span>
      <ChevronIcon
        className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${
          open ? "rotate-180" : "rotate-0"
        }`}
      />
    </button>
  );

  const backToTopButton = showBackToTop ? (
    <button
      type="button"
      onClick={scrollToTop}
      className={straddleButtonClassName}
      aria-label="Top"
    >
      <ChevronIcon className="h-3.5 w-3.5 rotate-180" />
      <span>Top</span>
    </button>
  ) : null;

  const careersBackButton = showCareersBack ? (
    <Link href="/careers" className={straddleButtonClassName} aria-label="Back to Careers">
      <ChevronLeftIcon className="h-3.5 w-3.5" />
      <span>Careers</span>
    </Link>
  ) : null;

  return (
    // mt: body → Top/Sitemap (0 on career job pages; Application URL owns gaps).
    // pb: button bottom → brand bar (clears straddle half-height + stack gap).
    <div
      className={
        isCareerJobPage
          ? "mt-0 pb-12 sm:pb-14"
          : "mt-14 pb-12 sm:mt-16 sm:pb-14"
      }
    >
      {/*
        Controls always straddle the original top line (Top? + Sitemap).
        When open, the map expands under that line; a plain bottom border
        closes the panel — Sitemap does not move to a second straddle line.

        Top + Sitemap remain the only in-flow straddle controls (same centering
        as always). Careers is out-of-flow to the left so it never shifts them.
      */}
      <div className="relative w-full">
        <div className="w-full border-t border-border" aria-hidden="true" />
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          {/*
            Width of this box = Top + Sitemap only (Careers is absolute).
            That keeps the Top/Sitemap center at page midpoint, identical to
            the pre-Careers layout.
          */}
          <div className="relative flex items-center gap-3">
            {careersBackButton ? (
              <div className="absolute right-full top-1/2 mr-3 -translate-y-1/2">
                {careersBackButton}
              </div>
            ) : null}
            {backToTopButton}
            {sitemapButton}
          </div>
        </div>
      </div>

      {/* Expandable map only (not straddle controls) — height subtracted for Top. */}
      <div ref={expandableRef}>
        {/* Site map panel */}
        <div className={`mx-auto max-w-7xl px-6 ${open ? "pt-10" : "pt-0"}`}>
          <div
            id={panelId}
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
            aria-hidden={!open}
          >
            <div className="min-h-0 overflow-hidden">
              <nav
                aria-label="Site map"
                className={`pb-8 transition-opacity duration-300 ease-out ${
                  open ? "opacity-100" : "opacity-0"
                }`}
              >
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {SITEMAP_SECTIONS.map((section) => (
                    <div key={section.href} className="min-w-0">
                      <Link
                        href={section.href}
                        className={`text-sm font-semibold text-fg-heading ${accentHoverClass}`}
                      >
                        {section.label}
                      </Link>
                      {section.children?.length ? (
                        <ul className="mt-3 space-y-2">
                          {section.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className={`text-sm text-fg-muted ${accentHoverClass}`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom border when open — line only, no second control row */}
        {open ? (
          <div className="w-full border-t border-border" aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
}
