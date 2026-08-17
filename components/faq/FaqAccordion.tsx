"use client";

import type { FaqItem } from "@/lib/faq";

type FaqAccordionVariant = "plain" | "card";

export function FaqAccordion({
  items,
  openId,
  onToggle,
  variant = "plain",
}: {
  items: readonly FaqItem[];
  openId: string | null;
  onToggle: (id: string) => void;
  variant?: FaqAccordionVariant;
}) {
  if (variant === "card") {
    return (
      <div
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--faq-border)", backgroundColor: "transparent" }}
      >
        {items.map((item, index) => {
          const isOpen = openId === item.id;
          const isLast = index === items.length - 1;
          return (
            <FaqAccordionItem
              key={item.id}
              item={item}
              isOpen={isOpen}
              isLast={isLast}
              variant="card"
              onToggle={onToggle}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <FaqAccordionItem
            key={item.id}
            item={item}
            isOpen={isOpen}
            isLast={false}
            variant="plain"
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
}

function FaqAccordionItem({
  item,
  isOpen,
  isLast,
  variant,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  isLast: boolean;
  variant: FaqAccordionVariant;
  onToggle: (id: string) => void;
}) {
  const answerClassName =
    variant === "card"
      ? "px-6 pb-5 type-body [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_li]:mt-1.5 [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
      : "pb-5 type-body [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_li]:mt-1.5 [&_p+p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5";

  return (
    <div
      id={item.id}
      className={variant === "plain" ? "scroll-mt-24 border-b border-border-muted" : "scroll-mt-24"}
      style={
        variant === "card"
          ? { borderBottom: isLast ? "none" : "1px solid var(--faq-border)" }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-expanded={isOpen}
        aria-controls={`${item.id}-answer`}
        className={
          variant === "card"
            ? "flex w-full cursor-pointer items-center justify-between px-6 py-5 text-left transition-colors duration-200"
            : "group flex w-full cursor-pointer items-center justify-between py-5 text-left"
        }
        style={
          variant === "card"
            ? {
                backgroundColor: "transparent",
                borderLeft: isOpen ? "3px solid var(--faq-active-border)" : "3px solid transparent",
              }
            : undefined
        }
      >
        <span
          className={
            variant === "card"
              ? "type-body pr-4"
              : isOpen
                ? "type-body pr-4 text-[var(--color-accent-interactive,var(--fg-heading))] transition-colors duration-[140ms] ease-out"
                : "type-body pr-4 text-[var(--fg-heading)] transition-colors duration-[140ms] ease-out group-hover:text-[var(--color-accent-interactive,var(--fg-heading))]"
          }
          style={variant === "card" ? { color: "var(--fg-heading)" } : undefined}
        >
          {item.question}
        </span>
        <span
          aria-hidden="true"
          className="shrink-0 text-xl leading-none transition-transform duration-200"
          style={{
            color: "var(--fg-muted)",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      <div
        id={`${item.id}-answer`}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? "1600px" : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div
          className={answerClassName}
          style={{
            color: "var(--fg-muted)",
            paddingLeft: variant === "card" ? "calc(1.5rem + 3px)" : undefined,
          }}
        >
          {item.answer}
        </div>
      </div>
    </div>
  );
}
