"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  ActionDropdown,
  DownloadTriggerIcon,
  EmailIcon,
  MoreIcon,
  ShareCopyIcon,
  ShareTriggerIcon,
  TelegramIcon,
  XIcon,
  type ActionDropdownItem,
} from "@/components/ShareDropdown";
import { useCopy } from "@/components/hooks/useCopy";
import { usePointerProximity } from "@/components/hooks/usePointerProximity";
import WalletDownloadBadge from "@/components/wallets/WalletDownloadBadge";
import { SOCIAL_ICON_PATHS } from "@/lib/social-icons";
import {
  getWalletBetaDownloadItemsForBrand,
  getWalletBrand,
} from "@/lib/wallets/catalog";
import {
  buildEmailShareHref,
  buildShareMessageWithLink,
  buildTelegramShareHref,
  buildXShareHref,
} from "@/lib/share";
import { BRAND } from "@/lib/zns/brand";
import {
  COMMUNITY_SECTIONS,
  communitySectionHref,
  isExternalHref,
  type CommunityCard,
  type CommunitySection,
} from "@/lib/community/sections";

const SOCIAL_PATHS: Record<string, string> = {
  "X / Twitter": SOCIAL_ICON_PATHS.x,
  Discord: SOCIAL_ICON_PATHS.discord,
  Telegram: SOCIAL_ICON_PATHS.telegram,
  Signal: SOCIAL_ICON_PATHS.signal,
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
  collections: "h-10 w-10",
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

type ShareTarget = "x" | "telegram" | "email" | "system";

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const shareUrl = `${BRAND.url}/community#${card.id}`;
  const external = isExternalHref(card.href);
  const footerHref = formatCommunityCardHref(card.href);
  const cardSurfaceClassName = resolvedTheme === "monochrome" ? "bg-transparent" : "bg-[var(--color-raised)]";
  const walletBrand = card.walletBrandSlug ? getWalletBrand(card.walletBrandSlug) : null;
  const downloadBadges = card.walletBrandSlug
    ? getWalletBetaDownloadItemsForBrand(card.walletBrandSlug)
    : [];
  const websiteUrl = walletBrand?.websiteUrl ?? (external ? card.href : "");
  const menuItems: ActionDropdownItem[] = [
    {
      key: "go-to",
      label: "Go to...",
      href: card.href,
      icon: <OpenInIcon />,
      external,
      onClick: () => setMenuOpen(false),
    },
    ...(downloadBadges.length > 0
      ? [{
          key: "download",
          label: "Download",
          icon: <DownloadTriggerIcon />,
          onClick: () => {
            setMenuOpen(false);
            setDownloadModalOpen(true);
          },
        } satisfies ActionDropdownItem]
      : []),
    {
      key: "share",
      label: "Share",
      icon: <ShareTriggerIcon />,
      onClick: () => {
        setMenuOpen(false);
        setShareModalOpen(true);
      },
    },
  ];

  return (
    <>
      <article
        id={card.id}
        ref={(node) => proximity.register(card.id, node)}
        onPointerMove={proximity.handlePointerMove}
        onPointerLeave={proximity.handlePointerLeave}
        className={`community-card group relative flex min-h-[17.5rem] w-full min-w-0 flex-col gap-5 overflow-visible rounded-[20px] border border-border-muted px-5 py-5 transition-[transform,box-shadow,border-color] duration-200 ease-out sm:min-h-0 ${cardSurfaceClassName}`}
        style={{
          transform: "translateZ(0) scale(var(--prox-scale, 1))",
          boxShadow: "0 18px 38px rgba(0, 0, 0, var(--prox-shadow-opacity, 0))",
        }}
      >
        <CardOverlayLink card={card} external={external} />

        <div className="pointer-events-none relative z-[2] flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border-muted bg-transparent">
              {renderCardIcon(card, resolvedTheme)}
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">{card.label}</p>
              <h3 className="text-[1.02rem] font-bold leading-tight text-fg-heading">
                {card.name}
              </h3>
            </div>
          </div>
          <div
            className="pointer-events-auto relative shrink-0"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <ActionDropdown
              buttonClassName="flex h-9 w-9 items-center justify-center rounded-full border border-border-muted bg-transparent text-fg-heading transition-colors duration-200 hover:border-fg-heading hover:text-fg-heading"
              items={menuItems}
              itemClassName="justify-end text-right"
              label="Actions"
              menuAlign="right"
              menuClassName="border-border-muted bg-[var(--color-card)] shadow-2xl"
              menuDirection="down"
              onOpenChange={setMenuOpen}
              open={menuOpen}
              renderTriggerContent={(open) => <CardMenuTrigger open={open} />}
              showTriggerIcon={false}
              triggerAriaLabel={`Open actions for ${card.name}`}
            />
          </div>
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
        </div>
      </article>

      {downloadModalOpen && downloadBadges.length > 0 ? (
        <CommunityDownloadModal
          card={card}
          badges={downloadBadges}
          websiteUrl={websiteUrl}
          onClose={() => setDownloadModalOpen(false)}
        />
      ) : null}
      {shareModalOpen ? (
        <CommunityShareModal
          card={card}
          shareUrl={shareUrl}
          onClose={() => setShareModalOpen(false)}
        />
      ) : null}
    </>
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

function CardMenuTrigger({ open }: { open: boolean }) {
  return (
    <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true">
      <span
        className={`absolute h-0.5 w-3.5 rounded-full bg-current transition-transform duration-200 ${
          open ? "translate-y-0 rotate-45" : "-translate-y-1"
        }`}
      />
      <span
        className={`absolute h-0.5 w-3.5 rounded-full bg-current transition-transform duration-200 ${
          open ? "translate-y-0 -rotate-45" : "translate-y-1"
        }`}
      />
    </span>
  );
}

function OpenInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M7 17L17 7" />
      <path d="M17 7H8" />
      <path d="M17 7v9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function CommunityActionModal({
  ariaLabel,
  title,
  onClose,
  children,
}: {
  ariaLabel: string;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(6px)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className="flex w-full max-w-xl flex-col gap-5 rounded-[24px] border border-border-muted px-6 py-6 shadow-[0_24px_64px_rgba(0,0,0,0.4)] sm:px-7"
        style={{ background: "var(--color-card)" }}
      >
        <div className={`flex items-start gap-4 ${title ? "justify-between" : "justify-end"}`}>
          {title ? <h2 className="text-[1.2rem] font-bold leading-tight text-fg-heading">{title}</h2> : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-muted text-fg-muted transition-colors hover:border-fg-heading hover:text-fg-heading"
            aria-label="Close popup"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function CommunityDownloadModal({
  card,
  badges,
  websiteUrl,
  onClose,
}: {
  card: CommunityCard;
  badges: ReturnType<typeof getWalletBetaDownloadItemsForBrand>;
  websiteUrl: string;
  onClose: () => void;
}) {
  return (
    <CommunityActionModal ariaLabel={`Download ${card.name}`} onClose={onClose}>
      <p className="text-sm leading-relaxed text-fg-body">
        Make sure you are downloading the application from a trustworthy source.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {badges.map((badge) => <WalletDownloadBadge key={badge.href} item={badge} />)}
      </div>
      {websiteUrl ? (
        <p className="text-sm leading-relaxed text-fg-muted">
          More versions of {card.name} may be available at{" "}
          <a
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-fg-heading underline underline-offset-2"
          >
            {formatCommunityCardHref(websiteUrl)}
          </a>
          .
        </p>
      ) : null}
    </CommunityActionModal>
  );
}

function CommunityShareModal({
  card,
  shareUrl,
  onClose,
}: {
  card: CommunityCard;
  shareUrl: string;
  onClose: () => void;
}) {
  const copyState = useCopy();
  const supportsSystemShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const [shareTarget, setShareTarget] = useState<ShareTarget>("x");
  const [draft, setDraft] = useState(() => buildShareMessageWithLink(card.shareText, shareUrl));
  const shareTargets: { icon: ReactNode; label: string; value: ShareTarget }[] = [
    { value: "x", label: "X", icon: <XIcon /> },
    { value: "telegram", label: "Telegram", icon: <TelegramIcon /> },
    { value: "email", label: "Email", icon: <EmailIcon /> },
    ...(supportsSystemShare
      ? [{ value: "system" as const, label: "Other", icon: <MoreIcon /> }]
      : []),
  ];
  const activeTarget = shareTargets.find((target) => target.value === shareTarget) ?? shareTargets[0];

  async function handleCopy() {
    await copyState.copy(draft);
  }

  async function handleShare() {
    if (shareTarget === "x") {
      window.open(buildXShareHref(draft), "_blank", "noopener,noreferrer");
      onClose();
      return;
    }

    if (shareTarget === "telegram") {
      window.open(buildTelegramShareHref(draft), "_blank", "noopener,noreferrer");
      onClose();
      return;
    }

    if (shareTarget === "email") {
      window.location.href = buildEmailShareHref(card.name, draft);
      onClose();
      return;
    }

    if (!supportsSystemShare) return;

    try {
      await navigator.share({ text: draft });
      onClose();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  return (
    <CommunityActionModal ariaLabel={`Share ${card.name}`} onClose={onClose}>
      <label className="flex flex-col gap-2 text-sm font-semibold text-fg-heading">
        <span>Share on:</span>
        <span className="relative">
          <select
            value={shareTarget}
            onChange={(event) => setShareTarget(event.target.value as ShareTarget)}
            className="min-h-11 w-full appearance-none rounded-xl border border-border-muted bg-[var(--color-raised)] px-3 py-2 pr-10 text-sm font-semibold text-fg-heading outline-none transition-colors focus:border-fg-heading"
          >
            {shareTargets.map((target) => (
              <option key={target.value} value={target.value}>
                {target.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-fg-muted" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </span>
      </label>
      <label className="flex flex-col gap-2 text-sm font-semibold text-fg-heading">
        <span>Message</span>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-40 rounded-[18px] border border-border-muted bg-transparent px-4 py-3 text-sm font-normal leading-relaxed text-fg-body outline-none transition-colors focus:border-fg-heading"
        />
      </label>
      <div className="flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-muted px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
        >
          <ShareCopyIcon />
          <span>{copyState.copied ? "Copied!" : "Copy"}</span>
        </button>
        <button
          type="button"
          onClick={() => void handleShare()}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-muted px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
        >
          {activeTarget?.icon}
          <span>Share</span>
        </button>
      </div>
    </CommunityActionModal>
  );
}

function renderCardIcon(card: CommunityCard, resolvedTheme: string | undefined) {
  const light = resolvedTheme === "light";
  const brandedSocialIconSrc = BRANDED_SOCIAL_ICON_SRCS[card.name];
  const socialPath = SOCIAL_PATHS[card.name];

  if (socialPath) {
    if (light && brandedSocialIconSrc) {
      return <img src={brandedSocialIconSrc} alt="" className="h-9 w-9 object-contain" aria-hidden="true" />;
    }

    return (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-[1.65rem] w-[1.65rem] text-fg-heading"
        aria-hidden="true"
      >
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
