"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import ShareDropdown from "@/components/ShareDropdown";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";
import { BRAND } from "@/lib/zns/brand";
import {
  COMMUNITY_SECTIONS,
  communitySectionHref,
  isExternalHref,
  type CommunityCard,
  type CommunitySection,
} from "@/lib/community/sections";

const SOCIAL_PATHS: Record<string, string> = {
  "X / Twitter":
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  Discord:
    "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.227-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z",
  Telegram:
    "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  Signal:
    "M12 1.5C6.202 1.5 1.5 6.202 1.5 12c0 1.93.52 3.735 1.43 5.29L1.5 22.5l5.21-1.43A10.457 10.457 0 0 0 12 22.5c5.798 0 10.5-4.702 10.5-10.5S17.798 1.5 12 1.5zm0 2.1a8.4 8.4 0 1 1 0 16.8 8.357 8.357 0 0 1-4.29-1.178l-.308-.186-3.188.875.875-3.188-.186-.308A8.357 8.357 0 0 1 3.6 12 8.4 8.4 0 0 1 12 3.6z",
  GitHub:
    "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.467-1.332-5.467-5.93 0-1.31.467-2.38 1.235-3.22-.123-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.48 11.48 0 0 1 3-.404c1.02.005 2.045.138 3 .404 2.29-1.552 3.295-1.23 3.295-1.23.653 1.653.242 2.873.12 3.176.77.84 1.232 1.91 1.232 3.22 0 4.61-2.807 5.625-5.48 5.92.43.372.823 1.103.823 2.222 0 1.606-.015 2.898-.015 3.293 0 .322.216.695.825.577C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
};

const BRANDED_SOCIAL_ICON_SRCS: Record<string, string> = {
  Discord: "/icons/discord.svg",
  Telegram: "/icons/telegram.svg",
  Signal: "/icons/signal.svg",
};

const HIDDEN_COMMUNITY_CARD_IDS = new Set(["ambassador", "newsletter"]);

const LARGE_CARD_ICON_NAMES = new Set([
  "Zcash.me",
  "Zingo Wallet",
  "Cake Wallet",
  "Unstoppable Wallet",
  "Zipher Wallet",
  "Zcash Network School",
  "Noir Wallet",
]);

const ICON_CLASS_BY_NAME: Record<string, string> = {
  "Zcash.me": "h-[3.2rem] w-[3.2rem] object-contain object-center theme-media-home",
  "Zingo Wallet": "h-[3.2rem] w-[3.2rem] object-contain theme-media-home",
  "Cake Wallet": "h-[3.2rem] w-[3.2rem] object-contain theme-media-home",
  "Unstoppable Wallet": "h-[3.2rem] w-[3.2rem] object-contain theme-media-home",
  "Zipher Wallet": "h-[3.2rem] w-[3.2rem] object-contain theme-media-home",
  "Zcash Network School": "h-[3.2rem] w-[3.2rem] object-contain theme-media-home",
  "Noir Wallet": "h-[3.2rem] w-[3.2rem] translate-x-[1px] object-contain theme-media-home",
};

const THEMED_ICON_CLASS_BY_ID: Record<string, string> = {
  "beta-test": "h-10 w-10",
  "builder-stories": "h-10 w-10",
  events: "h-10 w-10",
  explorer: "h-10 w-10",
  "launch-notes": "h-10 w-10",
  leaderboard: "h-10 w-10",
  namepost: "h-10 w-10",
  "zcash-network-school": "h-10 w-10",
  "referrals-dashboard": "h-10 w-10",
  sharekit: "h-10 w-10",
  updates: "h-10 w-10",
};

const DIRECT_MONO_ICON_IDS = new Set(["leaderboard", "explorer", "builder-stories", "sharekit"]);

function formatCommunityCardHref(href: string) {
  if (!href) return "/";

  if (isExternalHref(href)) {
    try {
      const url = new URL(href);
      const host = url.hostname.replace(/^www\./, "");
      const suffix = `${url.pathname}${url.search}${url.hash}`.replace(/\/$/, "");
      return `${host}${suffix}` || host;
    } catch {
      return href.replace(/^https?:\/\//, "").replace(/^www\./, "");
    }
  }

  return href;
}

export default function CommunityPageClient() {
  return (
    <main id="top" className="w-full">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-16 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
            Join the movement
          </h1>
          <p className="type-section-subtitle text-fg-body">
            Find community pages, partner resources, and ways to help ZcashNames reach more Zcash users.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="border-t border-border-muted" aria-hidden="true" />
          <SectionPills />
          <div className="border-t border-border-muted" aria-hidden="true" />
        </div>

        {COMMUNITY_SECTIONS.map((section) => (
          <CommunitySectionGroup key={section.slug} section={section} />
        ))}

        <div className="flex justify-center pb-10">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-transparent px-4 py-2 text-[1.02rem] font-semibold text-[var(--home-result-link-fg)] transition-[transform] duration-[140ms] hover:-translate-y-px"
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: "1.08em", height: "1.08em" }} aria-hidden="true">
              <path d="M12 19V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M5 12L12 5L19 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to top
          </button>
        </div>
      </section>
    </main>
  );
}

function SectionPills() {
  return (
    <nav className="flex flex-col gap-3" aria-label="Community sections">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Jump to section</p>
      <div className="flex flex-wrap gap-2">
        {COMMUNITY_SECTIONS.map((section) => (
          <a
            key={section.slug}
            href={communitySectionHref(section.slug)}
            className="rounded-md border border-border-muted px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
          >
            {section.title}
          </a>
        ))}
      </div>
    </nav>
  );
}

function CommunitySectionGroup({ section }: { section: CommunitySection }) {
  const visibleCards = section.cards.filter((card) => !HIDDEN_COMMUNITY_CARD_IDS.has(card.id));

  return (
    <div id={section.slug} className="flex flex-col gap-6 scroll-mt-24">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-fg-heading">
          <a href={communitySectionHref(section.slug)} className="hover:underline">
            {section.title}
          </a>
        </h2>
        <div className="h-px flex-1 bg-border-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <CommunityCardTile key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function CommunityCardTile({ card }: { card: CommunityCard }) {
  const { resolvedTheme } = useTheme();
  const proximity = usePointerProximity<HTMLElement>({
    radius: 180,
    maxScaleBoost: 0.025,
    maxShadowOpacity: 0.16,
  });
  const shareUrl = `${BRAND.url}/community#${card.id}`;
  const external = isExternalHref(card.href);
  const footerHref = formatCommunityCardHref(card.href);
  const cardSurfaceClassName = resolvedTheme === "monochrome" ? "bg-transparent" : "bg-[var(--color-raised)]";

  return (
    <article
      id={card.id}
      ref={(node) => proximity.register(card.id, node)}
      onPointerMove={proximity.handlePointerMove}
      onPointerLeave={proximity.handlePointerLeave}
      className={`community-card group relative flex flex-col gap-5 overflow-visible rounded-[20px] border border-border-muted px-5 py-5 transition-[transform,box-shadow,border-color] duration-200 ease-out ${cardSurfaceClassName}`}
      style={{
        transform: "translateZ(0) scale(var(--prox-scale, 1))",
        boxShadow: "0 18px 38px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
      }}
    >
      <CardOverlayLink card={card} external={external} />

      <div className="pointer-events-none relative z-[2] flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-muted bg-transparent">
            {renderCardIcon(card, resolvedTheme === "monochrome")}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">{card.label}</p>
            <h3 className="text-[1.02rem] font-bold leading-tight text-fg-heading">
              {card.name}
            </h3>
          </div>
        </div>
        <span className="shrink-0 pt-0.5 text-fg-muted transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </span>
      </div>

      <div className="pointer-events-none relative z-[2] border-t border-border-muted" aria-hidden="true" />

      <div className="pointer-events-none relative z-[2] flex min-h-[4.8rem] flex-1 items-start">
        <p className="text-sm leading-relaxed text-fg-body">
          {card.description}
        </p>
      </div>

      <div className="pointer-events-none relative z-[2] border-t border-border-muted" aria-hidden="true" />

      <div className="pointer-events-none relative z-[3] mt-auto flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-fg-muted">{footerHref}</span>
        <div
          className="pointer-events-auto"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <ShareDropdown
            label="Share"
            message={card.shareText}
            shareUrl={shareUrl}
            emailSubject={card.name}
            copyLabel="Copy Text"
            systemShareLabel="Other"
            menuAlign="right"
            menuDirection="up"
            showTriggerIcon={true}
            buttonClassName="inline-flex items-center gap-2 rounded-md border border-border-muted px-3 py-1.5 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
          />
        </div>
      </div>
    </article>
  );
}

function CardOverlayLink({ card, external }: { card: CommunityCard; external: boolean }) {
  const className = "absolute inset-0 z-[1] rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--partner-card-border-hover)]";
  const label = `${card.name} - ${card.label}`;

  if (external) {
    return (
      <a
        href={card.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={className}
      />
    );
  }

  return <Link href={card.href} aria-label={label} className={className} />;
}

function renderCardIcon(card: CommunityCard, monochrome: boolean) {
  const brandedSocialIconSrc = BRANDED_SOCIAL_ICON_SRCS[card.name];

  if (brandedSocialIconSrc) {
    return monochrome
      ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-[1.65rem] w-[1.65rem] text-fg-heading" aria-hidden="true">
          <path d={SOCIAL_PATHS[card.name]} />
        </svg>
      )
      : <img src={brandedSocialIconSrc} alt="" className="h-9 w-9 object-contain" aria-hidden="true" />;
  }

  const socialPath = SOCIAL_PATHS[card.name];

  if (socialPath) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-[1.65rem] w-[1.65rem] text-fg-heading" aria-hidden="true">
        <path d={socialPath} />
      </svg>
    );
  }

  if (card.themedIconSrc) {
    return (
      <ThemeAdaptiveCardIcon
        cardId={card.id}
        icon={card.themedIconSrc}
        alt={card.name}
        className={THEMED_ICON_CLASS_BY_ID[card.id] ?? "h-10 w-10"}
      />
    );
  }

  if (card.iconSrc) {
    const iconClassName = ICON_CLASS_BY_NAME[card.name]
      ?? (LARGE_CARD_ICON_NAMES.has(card.name)
        ? "h-[3.2rem] w-[3.2rem] object-contain theme-media-home"
        : "h-9 w-9 object-contain theme-media-home");

    return <img src={card.iconSrc} alt="" className={iconClassName} aria-hidden="true" />;
  }

  return <span className="text-sm font-bold tracking-[0.04em] text-fg-heading">{card.initials}</span>;
}

function ThemeAdaptiveCardIcon({
  cardId,
  icon,
  alt,
  className,
}: {
  cardId: string;
  icon: NonNullable<CommunityCard["themedIconSrc"]>;
  alt: string;
  className?: string;
}) {
  const useDirectMonoImage = DIRECT_MONO_ICON_IDS.has(cardId);

  return (
    <span className={`relative block shrink-0 ${className ?? "h-10 w-10"}`.trim()} aria-hidden="true">
      <img
        src={icon.dark}
        alt={alt}
        className="block h-full w-full object-contain invert brightness-110 [[data-theme=light]_&]:hidden [[data-theme=monochrome]_&]:hidden"
      />
      <img
        src={icon.light}
        alt=""
        className="hidden h-full w-full object-contain [[data-theme=light]_&]:block [[data-theme=monochrome]_&]:hidden"
      />
      {useDirectMonoImage ? (
        <img
          src={icon.mono}
          alt=""
          className="hidden h-full w-full object-contain [[data-theme=monochrome]_&]:block"
        />
      ) : null}
      <span
        className={`absolute inset-0 hidden [[data-theme=monochrome]_&]:block ${useDirectMonoImage ? "[[data-theme=monochrome]_&]:hidden" : ""}`.trim()}
        style={{
          background: "var(--fg-heading)",
          WebkitMaskImage: `url('${icon.mono}')`,
          maskImage: `url('${icon.mono}')`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </span>
  );
}
