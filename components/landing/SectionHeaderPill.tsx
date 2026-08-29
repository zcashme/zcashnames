"use client";

import { useRef } from "react";

/** Homepage section titles — matches primary header-menu item type. */
const sectionTitleClassName =
  "text-2xl font-bold tracking-tight text-fg-heading sm:text-3xl transition-colors hover:text-[var(--color-accent-interactive)]";
const sectionPillClassName = "landing-section-pill";

export default function SectionHeaderPill({
  id,
  title,
  align = "center",
  variant = "title",
}: {
  id?: string;
  title: string;
  align?: "center" | "left";
  variant?: "title" | "pill";
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);

  function handleClick() {
    sectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div
      ref={sectionRef}
      id={id}
      className={`flex w-full ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`cursor-pointer ${align === "center" ? "text-center" : "text-left"} ${
          variant === "pill" ? sectionPillClassName : `px-1 ${sectionTitleClassName}`
        }`}
        aria-label={`Scroll ${title} to the top`}
      >
        {title}
      </button>
    </div>
  );
}
