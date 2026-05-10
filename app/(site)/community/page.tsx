import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { BRAND } from "@/lib/zns/brand";
import {
  COMMUNITY_SECTIONS,
  isExternalHref,
  type CommunityCard,
  type CommunitySection,
} from "@/lib/community/sections";

export const metadata: Metadata = {
  title: "Community | ZcashNames",
  description:
    "Join the ZcashNames community, beta test releases, become an ambassador, and find partner resources.",
};

export default async function CommunityPage() {
  return (
    <main className="w-full">
      <SiteRouteTitle title="Community" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-16 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
            Join the movement
          </h1>
          <p className="type-section-subtitle text-fg-body">
            Find community pages, partner resources, and ways to help ZcashNames reach more Zcash users.
          </p>
        </div>

        {COMMUNITY_SECTIONS.map((section) => (
          <CommunitySectionGroup key={section.slug} section={section} />
        ))}
      </section>
    </main>
  );
}

function CommunitySectionGroup({ section }: { section: CommunitySection }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-fg-heading">{section.title}</h2>
        <div className="h-px flex-1 bg-border-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {section.cards.map((card) => (
          <CommunityCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function CommunityCard({ card }: { card: CommunityCard }) {
  const shareUrl = `${BRAND.url}/community#${card.id}`;
  const external = isExternalHref(card.href);

  return (
    <article
      id={card.id}
      className="community-card group relative flex flex-col gap-4 rounded-2xl border border-[var(--partner-card-border)] bg-[var(--partner-card-bg)] px-5 py-5 shadow-[var(--partner-card-shadow)] transition-all duration-200 hover:border-[var(--partner-card-border-hover)] hover:shadow-[var(--partner-card-shadow-hover)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-raised)] border border-border-muted overflow-hidden">
          {card.iconSrc ? (
            <img src={card.iconSrc} alt="" className="h-10 w-10 object-contain" aria-hidden="true" />
          ) : (
            <span className="text-lg font-bold text-fg-heading">{card.initials}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">{card.label}</p>
          <h3 className="text-base font-bold text-fg-heading leading-tight">{card.name}</h3>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-fg-body">{card.description}</p>

      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-xs text-fg-muted truncate">{card.detail}</span>
        <div className="flex gap-2 shrink-0">
          <a
            href={shareHref(card.shareText, shareUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-muted bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-fg-body transition-colors hover:border-[var(--partner-card-border-hover)] hover:text-fg-heading"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share
          </a>
          <a
            href={card.href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-accent-green)] px-3 py-1.5 text-xs font-semibold text-[var(--color-background)] transition-colors hover:bg-[var(--color-accent-green-dark)]"
          >
            Open
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}

function shareHref(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`;
}