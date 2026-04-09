"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
}

export default function BetaToc({ sections }: Props) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Scroll-spy: highlight the section closest to the top of the viewport.
  useEffect(() => {
    const headings = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting entry.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-80px 0px -65% 0px",
        threshold: 0,
      },
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  // Lock body scroll while the mobile drawer is open, and close on Escape.
  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    setMobileOpen(false);
  }

  function renderList(extraClass = "") {
    return (
      <ul
        className={`flex flex-col gap-1 border-l ${extraClass}`}
        style={{ borderColor: "var(--faq-border)" }}
      >
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => handleClick(e, s.id)}
                className="block py-1.5 pl-3 pr-2 text-sm transition-colors"
                style={{
                  color: active ? "var(--fg-heading)" : "var(--fg-muted)",
                  fontWeight: active ? 600 : 400,
                  borderLeft: active
                    ? "2px solid var(--fg-heading)"
                    : "2px solid transparent",
                  marginLeft: "-1px",
                }}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <>
      {/* Desktop: sticky in-page list (md+). Hidden on mobile, mirroring the
          Nextra docs TOC which uses `max-xl:hidden` to drop the right rail on
          smaller viewports. */}
      <nav
        aria-label="On this page"
        className="hidden md:block text-sm"
        style={{ color: "var(--fg-body)" }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 w-full text-left mb-3 cursor-pointer transition-opacity hover:opacity-80"
          style={{ color: "var(--fg-muted)" }}
          aria-expanded={!collapsed}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 transition-transform"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider">
            On this page
          </span>
        </button>

        {!collapsed && renderList()}
      </nav>

      {/* Mobile: hamburger trigger + slide-in drawer. Mirrors the docs
          pattern where the TOC is reached only via the hamburger overlay. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open page menu"
        aria-expanded={mobileOpen}
        aria-controls="beta-toc-drawer"
        className="md:hidden fixed bottom-5 left-5 z-40 flex items-center justify-center w-12 h-12 rounded-full border shadow-lg transition-opacity hover:opacity-90 cursor-pointer"
        style={{
          background: "var(--color-card)",
          color: "var(--fg-heading)",
          borderColor: "var(--border)",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Page sections"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="beta-toc-drawer"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto p-6 shadow-xl border-r"
            style={{
              background: "var(--color-background)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="flex items-center justify-between mb-4"
              style={{ color: "var(--fg-muted)" }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider">
                On this page
              </span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close page menu"
                className="cursor-pointer transition-opacity hover:opacity-80"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {renderList()}
          </div>
        </div>
      )}
    </>
  );
}
