"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { isExternalHref } from "@/lib/community/sections";

type MenuLink = {
  label: string;
  href?: string;
  external?: boolean;
  children?: MenuLink[];
};

const accentHoverClass =
  "transition-colors hover:text-[var(--color-accent-interactive)]";

const HEADER_MENU_LINKS: MenuLink[] = [
  { label: "Explorer", href: "/explorer" },
  {
    label: "Waitlist",
    children: [
      { label: "Join Waitlist", href: "/waitlist#waitlist-name-entry" },
      { label: "View Waitlist", href: "/waitlist/view" },
      { label: "Reserve Position", href: "/reserve" },
      { label: "Referral Leaderboard", href: "/leaders" },
      { label: "Referral Dashboard", href: "/leaders/ref" },
    ],
  },
  {
    label: "Protected Names",
    children: [
      { label: "View Protected Names", href: "/protected" },
      { label: "Suggest a Protected Name", href: "/protected/suggest" },
      { label: "Dispute a Protected Name", href: "/protected/dispute" },
    ],
  },
  { label: "Blog", href: "/blogs" },
  { label: "Docs", href: "/docs" },
  { label: "FAQ", href: "/faq" },
];

const PANEL_ID = "site-header-menu";

type HeaderMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HeaderMenuToggle({ open, onOpenChange }: HeaderMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls={PANEL_ID}
      onClick={() => onOpenChange(!open)}
      className={`relative flex h-8 w-8 cursor-pointer items-center justify-center text-fg-heading ${accentHoverClass}`}
    >
      <span
        className={`absolute h-0.5 w-4 rounded-full bg-current transition-transform duration-200 ${
          open ? "translate-y-0 rotate-45" : "-translate-y-1"
        }`}
      />
      <span
        className={`absolute h-0.5 w-4 rounded-full bg-current transition-transform duration-200 ${
          open ? "translate-y-0 -rotate-45" : "translate-y-1"
        }`}
      />
    </button>
  );
}

export function HeaderMenuPanel({ open, onOpenChange }: HeaderMenuProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setExpandedSection(null);
  }, [open]);

  function closeMenu() {
    onOpenChange(false);
    setExpandedSection(null);
  }

  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      aria-hidden={!open}
    >
      <div className="min-h-0 overflow-hidden">
        <nav
          id={PANEL_ID}
          aria-label="Site menu"
          className={`mx-auto max-w-[1320px] px-4 pb-8 pt-2 transition-opacity duration-300 ease-out sm:px-6 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        >
          <ul className="flex flex-col">
            {HEADER_MENU_LINKS.map((item) => (
              <MenuItem
                key={item.label}
                item={item}
                expanded={expandedSection === item.label}
                onToggle={() =>
                  setExpandedSection((section) =>
                    section === item.label ? null : item.label,
                  )
                }
                onNavigate={closeMenu}
              />
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function MenuItem({
  item,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: MenuLink;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);

  return (
    <li className="border-b border-border-muted last:border-b-0">
      <div className="flex items-center gap-3 py-3 sm:py-3.5">
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className={`min-w-0 flex-1 text-left text-2xl font-bold tracking-tight text-fg-heading sm:text-3xl ${accentHoverClass}`}
          >
            {item.label}
          </button>
        ) : (
          <MenuLinkRow item={item} primary onNavigate={onNavigate} className="min-w-0 flex-1" />
        )}
        {hasChildren ? (
          <button
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
            aria-expanded={expanded}
            onClick={onToggle}
            className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-2xl font-bold leading-none text-fg-heading ${accentHoverClass}`}
          >
            {expanded ? "−" : "+"}
          </button>
        ) : null}
      </div>

      {hasChildren ? (
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
          aria-hidden={!expanded}
        >
          <div className="min-h-0 overflow-hidden">
            <ul className="flex flex-col pb-3 pl-4 sm:pl-6">
              {item.children!.map((child) => (
                <li key={child.label} className="py-2">
                  <MenuLinkRow
                    item={child}
                    onNavigate={onNavigate}
                    hidden={!expanded}
                    className="block w-full"
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function MenuLinkRow({
  item,
  primary = false,
  onNavigate,
  hidden = false,
  className = "",
}: {
  item: MenuLink;
  primary?: boolean;
  onNavigate: () => void;
  hidden?: boolean;
  className?: string;
}) {
  const href = item.href ?? "#";
  const typeClass = primary
    ? "text-2xl font-bold tracking-tight sm:text-3xl"
    : "text-xl font-semibold tracking-tight sm:text-2xl";
  const colorClass = primary ? "text-fg-heading" : "text-fg-muted";
  const rowClass = `inline-flex max-w-full items-center gap-2 text-left ${typeClass} ${colorClass} ${accentHoverClass} ${className}`;

  if (item.external || isExternalHref(href)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClass}
        onClick={onNavigate}
        tabIndex={hidden ? -1 : undefined}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={rowClass}
      onClick={onNavigate}
      tabIndex={hidden ? -1 : undefined}
    >
      {item.label}
    </Link>
  );
}
