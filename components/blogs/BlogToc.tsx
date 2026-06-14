"use client";

import { useEffect, useState } from "react";

type Section = {
  id: string;
  label: string;
  depth?: number;
};

export default function BlogToc({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileCollapsed, setMobileCollapsed] = useState(false);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0 },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    function collapseOnScroll() {
      if (window.scrollY > 48) setMobileCollapsed(true);
    }

    window.addEventListener("scroll", collapseOnScroll, { passive: true });
    return () => window.removeEventListener("scroll", collapseOnScroll);
  }, []);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
    setMobileCollapsed(true);
  }

  function renderList() {
    return (
      <ul className="blog-toc-list">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                onClick={(event) => handleClick(event, section.id)}
                className="blog-toc-link"
                data-active={active}
                data-depth={String(section.depth ?? 2)}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    );
  }

  if (sections.length === 0) return null;

  return (
    <>
      <nav aria-label="On this page" className="hidden md:block">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="blog-toc-toggle"
          aria-expanded={!collapsed}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>On this page</span>
        </button>
        {!collapsed && renderList()}
      </nav>

      <nav aria-label="On this page" className="blog-mobile-panel md:hidden">
        <button
          type="button"
          onClick={() => setMobileCollapsed((value) => !value)}
          className="blog-toc-toggle"
          aria-expanded={!mobileCollapsed}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform"
            style={{ transform: mobileCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>On this page</span>
        </button>
        <div className="blog-mobile-panel-body" data-open={String(!mobileCollapsed)}>
          <div className="blog-mobile-panel-inner">{renderList()}</div>
        </div>
      </nav>
    </>
  );
}
