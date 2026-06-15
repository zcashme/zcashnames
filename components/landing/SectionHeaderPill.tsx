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
  const { resolvedTheme } = useTheme();
  const monochrome = resolvedTheme === "monochrome";
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
      className="m-0 inline-flex w-full max-w-[44rem] cursor-pointer items-center justify-center rounded-[18px] border px-4 py-2.5 text-center type-kicker transition-opacity hover:opacity-90"
      style={{
        borderColor: monochrome
          ? "color-mix(in srgb, var(--feature-heading-line-to) 28%, var(--faq-border))"
          : "transparent",
        background: monochrome
          ? "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 70%, transparent), color-mix(in srgb, var(--faq-border) 18%, transparent))"
          : "var(--home-result-primary-bg)",
        boxShadow: monochrome
          ? "0 12px 34px color-mix(in srgb, #000 10%, transparent)"
          : "var(--home-result-primary-shadow)",
        backdropFilter: monochrome ? "blur(10px)" : undefined,
        color: monochrome ? "var(--fg-heading)" : "var(--home-result-primary-fg)",
      }}
      aria-label={`Scroll ${title} to the top`}
    >
      {title}
    </button>
  );
}
