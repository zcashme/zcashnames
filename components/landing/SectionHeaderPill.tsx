"use client";

import { useRef } from "react";

/** Homepage section titles — matches primary header-menu item type. */
const sectionTitleClassName =
  "text-2xl font-bold tracking-tight text-fg-heading sm:text-3xl transition-colors hover:text-[var(--color-accent-interactive)]";

export default function SectionHeaderPill({
  id,
  title,
  align = "center",
}: {
  id?: string;
  title: string;
  align?: "center" | "left";
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
        className={`cursor-pointer px-1 ${align === "center" ? "text-center" : "text-left"} ${sectionTitleClassName}`}
        aria-label={`Scroll ${title} to the top`}
      >
        {title}
      </button>
    </div>
  );
}
