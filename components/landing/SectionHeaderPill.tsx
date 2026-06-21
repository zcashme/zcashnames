"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";

export default function SectionHeaderPill({
  id,
  title,
}: {
  id?: string;
  title: string;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  function handleClick() {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div ref={sectionRef} id={id} className="w-full max-w-[44rem]">
      <EditorialLineHeader title={title} onClick={handleClick} />
    </div>
  );
}

function EditorialLineHeader({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const monochrome = resolvedTheme === "monochrome";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group grid w-full cursor-pointer items-center justify-center gap-3 px-1 text-center sm:gap-4"
      style={{
        gridTemplateColumns: "minmax(4.5rem, 11rem) auto minmax(4.5rem, 11rem)",
      }}
      aria-label={`Scroll ${title} to the top`}
    >
      <span
        className="block h-px w-full transition-opacity duration-150 group-hover:opacity-100"
        style={{
          opacity: 0.92,
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--fg-muted) 0%, transparent) 0%, color-mix(in srgb, var(--fg-muted) 68%, transparent) 14%, color-mix(in srgb, var(--fg-muted) 68%, transparent) 86%, color-mix(in srgb, var(--fg-muted) 0%, transparent) 100%)",
        }}
        aria-hidden="true"
      />
      <span
        className="px-1 text-[0.88rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-150 sm:text-[0.95rem] sm:tracking-[0.18em] md:text-[1.05rem]"
        style={{
          color: monochrome ? "var(--fg-heading)" : "var(--section-title-accent)",
        }}
      >
        {title}
      </span>
      <span
        className="block h-px w-full transition-opacity duration-150 group-hover:opacity-100"
        style={{
          opacity: 0.92,
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--fg-muted) 0%, transparent) 0%, color-mix(in srgb, var(--fg-muted) 68%, transparent) 14%, color-mix(in srgb, var(--fg-muted) 68%, transparent) 86%, color-mix(in srgb, var(--fg-muted) 0%, transparent) 100%)",
        }}
        aria-hidden="true"
      />
    </button>
  );
}
