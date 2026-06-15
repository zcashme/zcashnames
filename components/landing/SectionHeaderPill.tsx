"use client";

import { useRef } from "react";

export default function SectionHeaderPill({
  id,
  title,
}: {
  id?: string;
  title: string;
}) {
  const pillRef = useRef<HTMLButtonElement | null>(null);

  function handleClick() {
    pillRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <button
      ref={pillRef}
      id={id}
      type="button"
      onClick={handleClick}
      className="m-0 inline-flex w-full max-w-[44rem] cursor-pointer items-center justify-center rounded-[14px] border px-4 py-2 text-center type-kicker transition-opacity hover:opacity-90"
      style={{
        borderColor: "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent), color-mix(in srgb, var(--faq-border) 18%, transparent))",
        color: "var(--fg-heading)",
      }}
      aria-label={`Scroll ${title} to the top`}
    >
      {title}
    </button>
  );
}
