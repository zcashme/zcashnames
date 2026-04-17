"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { COMMUNITIES } from "@/lib/zns/brand";

type MenuLink = {
  label: string;
  href: string;
  displayPath?: string;
  external?: boolean;
  children?: MenuLink[];
};

const communityLinks: MenuLink[] = [
  ...COMMUNITIES.map(({ label, href }) => ({
    label,
    href,
    displayPath: communityPath(href),
    external: true,
  })),
  {
    label: "GitHub",
    href: "https://github.com/zcashme/zcashnames",
    displayPath: "zcashme/zcashnames",
    external: true,
  },
];

const menuLinks: MenuLink[] = [
  { label: "Home", href: "/" },
  { label: "Explorer", href: "/explorer" },
  {
    label: "Leaderboard",
    href: "/leaders",
    displayPath: "/leaders",
    children: [{ label: "Dashboard", href: "/leaders/ref", displayPath: ".../ref" }],
  },
  {
    label: "Learn",
    href: "/docs",
    displayPath: "/docs/learn",
    children: [
      { label: "What is ZcashNames?", href: "/docs/learn/what-is-zns", displayPath: ".../what-is-zns" },
      { label: "How it works", href: "/docs/learn/how-it-works", displayPath: ".../how-it-works" },
      { label: "Privacy", href: "/docs/learn/privacy", displayPath: ".../privacy" },
      { label: "FAQ", href: "/docs/faq" },
    ],
  },
  {
    label: "Developers",
    href: "/docs/integrate",
    displayPath: "/docs",
    children: [
      { label: "Integrate", href: "/docs/integrate", displayPath: ".../integrate" },
      { label: "SDKs", href: "/docs/sdk", displayPath: ".../sdk" },
      { label: "Protocol", href: "/docs/protocol", displayPath: ".../protocol" },
      { label: "Indexer & RPC", href: "/docs/indexer", displayPath: ".../indexer" },
      { label: "OpenRPC JSON", href: "/openrpc.json" },
    ],
  },
  { label: "Brand Kit", href: "/brandkit" },
  {
    label: "Community",
    href: communityLinks[0]?.href ?? "https://x.com/zcashnames",
    displayPath: "community",
    external: true,
    children: communityLinks,
  },
];

export default function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setExpandedSections({});
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setExpandedSections({});
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
          if (!open) setExpandedSections({});
        }}
        className="relative flex h-8 w-8 items-center justify-center text-fg-heading transition-opacity hover:opacity-75"
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

      {open && (
        <nav
          id="site-header-menu"
          aria-label="Site menu"
          className="absolute right-0 top-11 z-50 w-[min(calc(100vw-2rem),360px)] overflow-hidden rounded-lg border border-border-muted bg-[var(--color-raised)] shadow-2xl"
        >
          <div className="site-header-menu-scroll max-h-[calc(100vh-7rem)] overflow-y-auto p-2">
            {menuLinks.map((item) => (
              <MenuItem
                key={item.label}
                item={item}
                expanded={!!expandedSections[item.label]}
                onToggle={() =>
                  setExpandedSections((sections) => ({
                    ...sections,
                    [item.label]: !sections[item.label],
                  }))
                }
                onNavigate={() => {
                  setOpen(false);
                  setExpandedSections({});
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
      {item.children && expanded && (
        <div className="pb-2">
          {item.children.map((child) => (
            <MenuAnchor key={`${item.label}-${child.label}`} item={child} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuAnchor({
  item,
  expanded = false,
  onToggle,
  onNavigate,
  primary = false,
}: {
  item: MenuLink;
  expanded?: boolean;
  onToggle?: () => void;
  onNavigate: () => void;
  primary?: boolean;
}) {
  const className = primary
    ? "flex w-full items-center rounded-md px-3 py-2.5 text-left text-base font-bold text-fg-heading transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_14%,transparent)] focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_14%,transparent)] focus-visible:outline-none"
    : "flex w-full items-center gap-3 rounded-md py-2 pl-16 pr-3 text-left text-[0.95rem] font-semibold text-fg-muted transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_12%,transparent)] hover:text-fg-heading focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_12%,transparent)] focus-visible:text-fg-heading focus-visible:outline-none";
  const pathLabel = displayPath(item);
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
      className="mx-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-[color-mix(in_srgb,var(--fg-heading)_16%,transparent)] hover:text-fg-heading focus-visible:bg-[color-mix(in_srgb,var(--fg-heading)_16%,transparent)] focus-visible:text-fg-heading focus-visible:outline-none"
    >
      <span className="text-lg font-bold leading-none" aria-hidden="true">
        {expanded ? "-" : "+"}
      </span>
    </button>
  ) : (
    <span className="mx-3 h-7 w-7 shrink-0" aria-hidden="true" />
  );
  const labelContent = <span className="min-w-0 flex-1 truncate">{item.label}</span>;
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
          >
            {sectionLinkContent}
          </a>
        ) : (
          <Link href={item.href} className={linkClassName} onClick={onNavigate}>
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
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onNavigate}>
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={onNavigate}>
      {content}
    </Link>
  );
}

function displayPath(item: MenuLink): string {
  if (item.displayPath) return item.displayPath;

  const href = item.href;
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
