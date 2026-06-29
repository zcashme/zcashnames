"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useZns } from "@/components/hooks/useZns";
import {
  COMMUNITY_SECTIONS,
  communitySectionHref,
  getCommunitySection,
  isExternalHref,
  type CommunityCard,
} from "@/lib/community/sections";

type MenuLink = {
  label: string;
  href: string;
  displayPath?: string;
  external?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  featured?: boolean;
  toggleOnPrimaryClick?: boolean;
  children?: MenuLink[];
};

const communitySectionLinks: MenuLink[] = COMMUNITY_SECTIONS
  .filter((section) => ["get-involved", "partners", "features", "events"].includes(section.slug))
  .map((section) => ({
    label: section.title,
    href: communitySectionHref(section.slug),
    displayPath: `#${section.slug}`,
  }));

const socialLinks = sectionCardMenuLinks("social");
const blogLinks = sectionCardMenuLinks("blogs").map((item) => ({
  ...item,
  displayPath: "Coming soon",
  disabled: true,
}));

const MAIN_MENU_LINKS: MenuLink[] = [
  {
    label: "Beta",
    href: "/beta",
    displayPath: "/beta",
    featured: true,
    children: [{ label: "Refund", href: "/beta/refund" }],
  },
  { label: "Blogs", href: communitySectionHref("blogs"), displayPath: "/blogs", comingSoon: true, children: blogLinks },
  { label: "Brand Kit", href: "/brandkit" },
  { label: "Careers", href: "/careers", displayPath: "/careers", featured: true },
  {
    label: "Community",
    href: "/community",
    displayPath: "/community",
    children: communitySectionLinks,
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
  { label: "Explorer", href: "/explorer" },
  { label: "Collections", href: "/collections", featured: true },
  { label: "Leaderboard", href: "/leaders", displayPath: "/leaders", children: [
      { label: "Dashboard", href: "/leaders/ref", displayPath: ".../ref" },
      { label: "Share Kit", href: "/sharekit", displayPath: ".../sharekit" },
      { label: "Terms", href: "/leaders/terms", displayPath: ".../terms" },
    ],
  },
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
  { label: "Roadmap", href: "/roadmap" },
  {
    label: "Social",
    href: communitySectionHref("social"),
    displayPath: "/social",
    children: socialLinks,
  },
];

function buildPageSectionLinks(basePath: "/" | "/waitlist"): MenuLink[] {
  return [
    { label: "Get Names", href: `${basePath}#names`, displayPath: "#names" },
    { label: "Supporters", href: `${basePath}#supporters`, displayPath: "#supporters" },
    { label: "Benefits", href: `${basePath}#benefits`, displayPath: "#benefits" },
    { label: "How It Works", href: `${basePath}#how-it-works`, displayPath: "#how-it-works" },
    { label: "FAQ", href: `${basePath}#faq`, displayPath: "#faq" },
    { label: "Newsletter", href: `${basePath}#newsletter`, displayPath: "#newsletter", featured: true },
  ];
}

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

export default function HeaderMenu() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { zns } = useZns();
  const monochrome = resolvedTheme === "monochrome";
  const [open, setOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const landingBasePath: "/" | "/waitlist" =
    pathname === "/waitlist"
      ? "/waitlist"
      : pathname === "/"
        ? "/"
        : zns.mode === "waitlist"
          ? "/waitlist"
          : "/";
  const pageSectionLinks = buildPageSectionLinks(landingBasePath);
  const menuLinks: MenuLink[] = [
    {
      label: "Home",
      href: landingBasePath,
      displayPath: landingBasePath === "/" ? "zcashnames.com" : "/waitlist",
      children: pageSectionLinks,
    },
    ...MAIN_MENU_LINKS,
  ];

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
          className={`absolute left-0 top-11 z-50 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-[18px] border transition-all duration-200 ease-out ${
            monochrome
              ? "border-[rgba(155,188,15,0.62)] bg-[rgba(15,56,15,0.96)] shadow-[0_18px_40px_rgba(15,56,15,0.62)]"
              : "border-border-muted bg-[var(--color-raised)] shadow-2xl"
          } ${
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
                monochrome={monochrome}
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

function MenuItem({
  item,
  monochrome,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: MenuLink;
  monochrome: boolean;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className={`border-b last:border-b-0 ${monochrome ? "border-b-[rgba(155,188,15,0.32)]" : "border-border-muted"}`}>
      <MenuAnchor item={item} monochrome={monochrome} expanded={expanded} onToggle={onToggle} onNavigate={onNavigate} primary />
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
                  monochrome={monochrome}
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

function MenuAnchor({
  item,
  monochrome,
  expanded = false,
  onToggle,
  onNavigate,
  primary = false,
  parentPath,
  hidden = false,
}: {
  item: MenuLink;
  monochrome: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onNavigate: () => void;
  primary?: boolean;
  parentPath?: string;
  hidden?: boolean;
}) {
  const className = primary
    ? `flex w-full items-center rounded-md px-3 py-2.5 text-left text-base font-bold transition-colors focus-visible:outline-none ${
        monochrome
          ? "text-fg-heading hover:bg-[rgba(155,188,15,0.16)] hover:text-[var(--mono-3)] focus-visible:bg-[rgba(155,188,15,0.16)] focus-visible:text-[var(--mono-3)]"
          : "text-fg-heading hover:bg-[color-mix(in_srgb,var(--fg-heading)_14%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_14%,transparent)]"
      }`
    : `flex w-full items-center gap-3 rounded-md py-2 pl-16 pr-3 text-left text-[0.95rem] font-semibold transition-colors focus-visible:outline-none ${
        item.disabled
          ? "cursor-not-allowed text-fg-muted/60"
          : monochrome
            ? "text-fg-muted hover:bg-[rgba(155,188,15,0.16)] hover:text-[var(--mono-3)] focus-visible:bg-[rgba(155,188,15,0.16)] focus-visible:text-[var(--mono-3)]"
            : "text-fg-muted hover:bg-[color-mix(in_srgb,var(--fg-heading)_12%,transparent)] hover:text-fg-heading focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_12%,transparent)] focus-visible:text-fg-heading"
      }`;
  const pathLabel = displayPath(item, parentPath);
  const toggleIcon = item.children ? (
    <span className="text-lg font-bold leading-none" aria-hidden="true">
      {expanded ? "-" : "+"}
    </span>
  ) : null;
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
      className={`mx-3 flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:outline-none ${
        monochrome
          ? "text-fg-heading hover:bg-[rgba(155,188,15,0.16)] hover:text-[var(--mono-3)] focus-visible:bg-[rgba(155,188,15,0.16)] focus-visible:text-[var(--mono-3)]"
          : "text-fg-muted hover:bg-[color-mix(in_srgb,var(--fg-heading)_16%,transparent)] hover:text-fg-heading focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_16%,transparent)] focus-visible:text-fg-heading"
      }`}
    >
      {toggleIcon}
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

  if (item.children && primary && item.toggleOnPrimaryClick) {
    return (
      <button
        type="button"
        className={className}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span
          className={`mx-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
            monochrome ? "text-fg-heading" : "text-fg-muted"
          }`}
          aria-hidden="true"
        >
          {toggleIcon}
        </span>
        {labelContent}
        <span className="ml-auto inline-flex min-w-0 shrink items-center gap-2">{pathContent}</span>
      </button>
    );
  }

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
      Soon
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
