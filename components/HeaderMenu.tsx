"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  COMMUNITY_SECTIONS,
  getCommunitySection,
  isExternalHref,
  type CommunityCard,
} from "@/lib/community/sections";

// Recursive menu-link type used to build the nested nav tree.
// Top-level items may have children (rendered as expandable sections).
type MenuLink = {
  label: string;
  href: string;
  displayPath?: string;
  external?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  featured?: boolean;
  children?: MenuLink[];
};

// Build child links from specific community subsections at module load.
// COMMUNITY_SECTIONS is a static data source consumed across the site.
const communitySectionLinks: MenuLink[] = COMMUNITY_SECTIONS
  .filter((section) => ["get-involved", "partners", "features", "events"].includes(section.slug))
  .map((section) => ({
    label: section.title,
    href: "/community",
    displayPath: `/${section.slug}`,
  }));

const socialLinks = sectionCardMenuLinks("social");

// Complete menu tree: static pages + nested sections sourced from
// COMMUNITY_SECTIONS data. Rendered by HeaderMenu via MenuItem/MenuAnchor.
const menuLinks: MenuLink[] = [
  { label: "Home", href: "/", displayPath: "zcashnames.com" },
  { label: "Explorer", href: "/explorer" },
  {
    label: "Learn",
    href: "/docs",
    displayPath: "/docs/learn",
    children: [
      { label: "What is ZcashNames?", href: "/docs/learn/what-is-zns", displayPath: ".../what-is-zns" },
      { label: "How it works", href: "/docs/learn/how-it-works", displayPath: ".../how-it-works" },
      { label: "Pricing", href: "/docs/learn/pricing", displayPath: ".../pricing" },
      { label: "Privacy", href: "/docs/learn/privacy", displayPath: ".../privacy" },
      { label: "FAQ", href: "/docs/faq" },
    ],
  },
  {
    label: "Developers",
    href: "/docs",
    displayPath: "/docs",
    children: [
      { label: "Integrate", href: "/docs/integrate" },
      { label: "SDKs", href: "/docs/sdk" },
      { label: "Protocol", href: "/docs/protocol/overview" },
      { label: "Indexer & RPC", href: "/docs/indexer/running" },
      { label: "OpenRPC JSON", href: "https://github.com/zcashme/ZNS/blob/master/openrpc.json" },
    ],
  },
  {
    label: "Community",
    href: "/community",
    displayPath: "/community",
    children: communitySectionLinks,
  },
  {
    label: "Social",
    href: "/community?section=social",
    displayPath: "/social",
    children: socialLinks,
  },
  {
    label: "Blogs",
    href: "/community?section=blogs",
    displayPath: "/blogs",
    children: sectionCardMenuLinks("blogs"),
  },
  {
    label: "Leaderboard",
    href: "/leaders",
    displayPath: "/leaders",
    children: [
      { label: "Dashboard", href: "/leaders/ref", displayPath: ".../ref" },
      { label: "Share Kit", href: "/sharekit", displayPath: ".../sharekit" },
      { label: "Terms", href: "/leaders/terms", displayPath: ".../terms" },
    ],
  },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Brand Kit", href: "/brandkit" },
  { label: "Beta", href: "/beta", displayPath: "/beta", featured: true },
];

function sectionCardMenuLinks(sectionSlug: string): MenuLink[] {
  return (
    getCommunitySection(sectionSlug)?.cards.map((card) => ({
      label: card.name,
      href: card.href,
      displayPath: cardMenuDisplayPath(card),
      external: isExternalHref(card.href),
    })) ?? []
  );
}

function cardMenuDisplayPath(card: CommunityCard): string {
  if (isExternalHref(card.href)) return communityPath(card.href);
  return card.href;
}

// Hamburger menu for the site header. Renders the static menuLinks tree
// with expandable nested sections. Two-phase open/close: `open` controls the
// animated panel, `menuVisible` keeps the DOM mounted for the exit animation.
// Outside click (pointerdown) and Escape key dismiss the menu and collapse
// any expanded section, returning focus to the hamburger button.
export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setExpandedSection(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setExpandedSection(null);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Delay unmounting the panel so the exit animation (opacity/translate) plays.
  useEffect(() => {
    if (open) {
      setMenuVisible(true);
      return;
    }

    const timeout = window.setTimeout(() => setMenuVisible(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="site-header-menu"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) setExpandedSection(null);
        }}
        className="relative flex cursor-pointer h-8 w-8 items-center justify-center text-fg-heading transition-opacity hover:opacity-75"
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

      {menuVisible && (
        <nav
          id="site-header-menu"
          aria-label="Site menu"
          aria-hidden={!open}
          className={`absolute left-0 top-11 z-50 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-lg border border-border-muted bg-[var(--color-raised)] shadow-2xl transition-all duration-200 ease-out ${
            open
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-[0.985] opacity-0"
          }`}
        >
          <div className="site-header-menu-scroll max-h-[calc(100vh-7rem)] overflow-y-auto p-2">
            {menuLinks.map((item) => (
              <MenuItem
                key={item.label}
                item={item}
                expanded={expandedSection === item.label}
                onToggle={() => setExpandedSection((section) => (section === item.label ? null : item.label))}
                onNavigate={() => {
                  setOpen(false);
                  setExpandedSection(null);
                }}
              />
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

// Renders a single top-level menu row. If the item has children, it includes
// an expand/collapse toggle and renders child links inside an animated grid.
// One child section is expanded at a time (controlled by expandedSection state).
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
  return (
    <div className="border-b border-border-muted last:border-b-0">
      <MenuAnchor item={item} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} primary />
      {item.children && (
        <div
          className={`grid transition-all duration-200 ease-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
          aria-hidden={!expanded}
        >
          <div className="overflow-hidden">
            <div className={`pb-2 transition-transform duration-200 ease-out ${expanded ? "translate-y-0" : "-translate-y-1"}`}>
              {item.children.map((child) => (
                <MenuAnchor
                  key={`${item.label}-${child.label}`}
                  item={child}
                  onNavigate={onNavigate}
                  parentPath={item.displayPath ?? item.href}
                  hidden={!expanded}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The actual link row (or toggle+link for expandable parents).
// Handles three render modes: external `<a>`, disabled `<div>`, and Next.js `<Link>`.
// `primary` rows get bold styling; child rows get indented styling with a parentPath prefix.
// `hidden` controls tabIndex so collapsed child links aren't focusable.
function MenuAnchor({
  item,
  expanded = false,
  onToggle,
  onNavigate,
  primary = false,
  parentPath,
  hidden = false,
}: {
  item: MenuLink;
  expanded?: boolean;
  onToggle?: () => void;
  onNavigate: () => void;
  primary?: boolean;
  parentPath?: string;
  hidden?: boolean;
}) {
  const className = primary
    ? `flex w-full items-center rounded-md px-3 py-2.5 text-left text-base font-bold transition-colors focus-visible:outline-none ${
        item.featured
          ? "bg-[color-mix(in_srgb,var(--color-accent-green)_18%,transparent)] text-fg-heading ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-accent-green)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-accent-green)_26%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--color-accent-green)_26%,transparent)]"
          : "text-fg-heading hover:bg-[color-mix(in_srgb,var(--fg-heading)_14%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_14%,transparent)]"
      }`
    : `flex w-full items-center gap-3 rounded-md py-2 pl-16 pr-3 text-left text-[0.95rem] font-semibold transition-colors focus-visible:outline-none ${
        item.disabled
          ? "cursor-not-allowed text-fg-muted/60"
          : "text-fg-muted hover:bg-[color-mix(in_srgb,var(--fg-heading)_12%,transparent)] hover:text-fg-heading focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_12%,transparent)] focus-visible:text-fg-heading"
      }`;
  const pathLabel = displayPath(item, parentPath);
  const toggle = item.children ? (
    <button
      type="button"
      aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
      aria-expanded={expanded}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle?.();
      }}
      className="mx-3 flex cursor-pointer h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_16%,transparent)] hover:text-fg-heading focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_16%,transparent)] focus-visible:text-fg-heading focus-visible:outline-none"
    >
      <span className="text-lg font-bold leading-none" aria-hidden="true">
        {expanded ? "-" : "+"}
      </span>
    </button>
  ) : (
    <span className="mx-3 h-7 w-7 shrink-0" aria-hidden="true" />
  );
  const labelContent = (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="truncate">{item.label}</span>
      {item.featured && <FeaturedBadge />}
      {item.comingSoon && <ComingSoonBadge />}
    </span>
  );
  const pathContent = <span className="truncate text-xs font-semibold text-fg-muted/70">{pathLabel}</span>;

  if (item.children) {
    const linkClassName = "flex min-w-0 flex-1 items-center gap-3";
    const sectionLinkContent = (
      <>
        {labelContent}
        <span className="ml-auto inline-flex min-w-0 shrink items-center">{pathContent}</span>
      </>
    );

    return (
      <div className={className}>
        {toggle}
        {item.external ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={onNavigate}
            tabIndex={hidden ? -1 : undefined}
          >
            {sectionLinkContent}
          </a>
        ) : (
          <Link href={item.href} className={linkClassName} onClick={onNavigate} tabIndex={hidden ? -1 : undefined}>
            {sectionLinkContent}
          </Link>
        )}
      </div>
    );
  }

  const content = (
    <>
      {primary && toggle}
      {labelContent}
      <span className="ml-auto inline-flex min-w-0 shrink items-center gap-2">{pathContent}</span>
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onNavigate}
        tabIndex={hidden ? -1 : undefined}
      >
        {content}
      </a>
    );
  }

  if (item.disabled) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={onNavigate} tabIndex={hidden ? -1 : undefined}>
      {content}
    </Link>
  );
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex shrink-0 rounded-md border border-border-muted px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
      Coming soon
    </span>
  );
}

function FeaturedBadge() {
  return (
    <span className="inline-flex shrink-0 rounded-md border px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em]"
      style={{
        borderColor: "color-mix(in srgb, var(--color-accent-green) 45%, transparent)",
        color: "var(--color-accent-green)",
      }}
    >
      New
    </span>
  );
}

// Derives a concise display path for the right-aligned breadcrumb in each row.
// For external URLs, extracts the hostname. For child links, collapses deep
// paths into `.../segment` notation.
function displayPath(item: MenuLink, parentPath?: string): string {
  if (item.displayPath) return item.displayPath;

  const href = item.href;
  if (parentPath && href.startsWith(`${parentPath}/`)) {
    const segments = href.slice(parentPath.length + 1).split("/").filter(Boolean);
    if (segments.length >= 2) return `.../${segments[0]}/...`;
    if (segments.length === 1) return `.../${segments[0]}`;
  }

  if (href.startsWith("/")) return href;

  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

// Extracts a human-readable short path from community section external URLs
// (e.g., Twitter handle, Telegram username, Discord invite code).
function communityPath(href: string): string {
  try {
    const url = new URL(href);
    const path = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!path) return url.hostname.replace(/^www\./, "");

    if (url.hostname === "x.com" || url.hostname === "twitter.com" || url.hostname === "t.me") {
      return path.split("/")[0];
    }

    if (url.hostname === "discord.gg") return path;
    if (url.hostname === "signal.group") return `${url.hash.replace(/^#/, "").slice(0, 10)}...`;

    return path;
  } catch {
    return href;
  }
}
