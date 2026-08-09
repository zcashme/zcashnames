"use client";

import { useEffect, useState } from "react";

type Section = {
  id: string;
  label: string;
  depth?: number;
};

export default function BlogToc({
  sections,
  variant = "desktop",
}: {
  sections: Section[];
  variant?: "desktop" | "mobile";
}) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [mobileOpen, setMobileOpen] = useState(true);

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

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActiveId(id);
  }

  if (sections.length === 0) return null;

  const list = (
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

  if (variant === "mobile") {
    return (
      <nav aria-label="On this page" className="blog-toc-mobile">
        <button
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          className="blog-toc-toggle"
          aria-expanded={mobileOpen}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 transition-transform"
            style={{ transform: mobileOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>On this page</span>
        </button>
        {mobileOpen ? list : null}
      </nav>
    );
  }

  return (
    <nav aria-label="On this page" className="blog-toc-desktop">
      <p className="blog-toc-heading">On this page</p>
      {list}
    </nav>
  );
}
