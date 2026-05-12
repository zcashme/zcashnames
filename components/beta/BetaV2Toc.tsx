/**
 * Scroll-spy table of contents sidebar. Uses IntersectionObserver to track which
 * section is currently in view, then highlights the corresponding nav link.
 * Receives section metadata (typically BETA_V2_SECTIONS from BetaV2Brief) via props.
 * The rootMargin (-80px/-60%) ensures the active state switches before the section
 * reaches the very top of the viewport.
 */
"use client";

import { useEffect, useState } from "react";

interface Section {
  id: string;
  label: string;
}

export default function BetaV2Toc({ sections }: { sections: Section[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );

    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="flex flex-col gap-1.5" aria-label="Section table of contents">
      {sections.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById(id);
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
          className="text-sm transition-colors"
          style={{
            color: activeId === id ? "var(--fg-heading)" : "var(--fg-muted)",
            fontWeight: activeId === id ? 600 : 400,
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
