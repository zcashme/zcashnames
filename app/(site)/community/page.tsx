import type { Metadata } from "next";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import { BRAND } from "@/lib/zns/brand";
import {
  COMMUNITY_SECTIONS,
  communitySectionHref,
  isExternalHref,
  type CommunityCard,
  type CommunitySection,
} from "@/lib/community/sections";

export const metadata: Metadata = {
  title: "Community | ZcashNames",
  description:
    "Join the ZcashNames community, beta test releases, become an ambassador, and find partner resources.",
};

export default async function CommunityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const selectedSection = normalizeSection(firstParam(params.section));
  const visibleSections =
    selectedSection === "all"
      ? COMMUNITY_SECTIONS
      : COMMUNITY_SECTIONS.filter((section) => section.slug === selectedSection);

  return (
    <main className="w-full">
      <SiteRouteTitle title="Community" />
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
            Join the movement
          </h1>
          <p className="type-section-subtitle text-fg-body">
            Find community pages, partner resources, and ways to help ZcashNames reach more Zcash users.
          </p>
        </div>

        <SectionPills selectedSection={selectedSection} />

        {visibleSections.map((section) => (
          <CommunityCardSection key={section.title} section={section} />
        ))}
      </section>
    </main>
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeSection(value: string | undefined): string {
  if (!value) return "all";
  if (value === "community-pages") return "social";
  if (COMMUNITY_SECTIONS.some((section) => section.slug === value)) return value;
  return "all";
}

function SectionPills({ selectedSection }: { selectedSection: string }) {
  const options = [
    { slug: "all", title: "All" },
    ...COMMUNITY_SECTIONS.map((section) => ({ slug: section.slug, title: section.title })),
  ];

  return (
    <nav className="flex flex-col gap-3" aria-label="Community sections">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Browse sections</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedSection === option.slug;
          return (
            <a
              key={option.slug}
              href={communitySectionHref(option.slug)}
              aria-current={active ? "page" : undefined}
              className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                active
                  ? "border-fg-heading bg-[var(--fg-heading)] text-[var(--color-background)]"
                  : "border-border-muted text-fg-body hover:border-fg-heading hover:text-fg-heading"
              }`}
            >
              {option.title}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function CommunityCardSection({ section }: { section: CommunitySection }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="max-w-3xl">
        <h2 className="flex flex-wrap items-center gap-3 text-2xl font-bold text-fg-heading">
          <span>{section.title}</span>
          {section.slug === "blogs" && <ComingSoonBadge />}
        </h2>
        <p className="mt-2 text-sm leading-6 text-fg-body">{section.description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {section.cards.map((card) => (
          <CommunityActionCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}

function ComingSoonBadge() {
  return (
    <span className="inline-flex rounded-md border border-border-muted px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">
      Coming soon
    </span>
  );
}

function CommunityActionCard({ card }: { card: CommunityCard }) {
  const announcingSoon = card.announcingSoon === true;
  const actionBadge = card.actionBadge ?? (announcingSoon ? "Announcing soon" : undefined);
  const shareUrl = `${BRAND.url}/community#${card.id}`;

  return (
    <article
      id={card.id}
      aria-label={actionBadge ? `${card.name} ${actionBadge.toLowerCase()}` : undefined}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border-muted bg-[var(--color-card)]"
    >
      <div className="flex aspect-[16/9] items-center justify-center border-b border-border-muted bg-[var(--color-raised)] p-5">
        <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border-muted bg-[var(--color-background)] p-5">
          {card.iconSrc ? (
            <span
              className="h-full w-full text-fg-heading"
              style={{
                backgroundColor: "currentColor",
                maskImage: `url(${card.iconSrc})`,
                maskPosition: "center",
                maskRepeat: "no-repeat",
                maskSize: "contain",
                WebkitMaskImage: `url(${card.iconSrc})`,
                WebkitMaskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskSize: "contain",
              }}
              aria-hidden="true"
            />
          ) : (
            <span className="text-3xl font-bold text-fg-heading">
              {card.initials}
            </span>
          )}
        </div>
      </div>
      <div className="flex min-h-[220px] flex-col gap-4 p-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{card.label}</p>
          <h3 className="mt-2 text-base font-bold text-fg-heading">
            {announcingSoon ? <BlurredCopy text={card.name} /> : card.name}
          </h3>
          <p className="mt-2 text-sm leading-6 text-fg-body">
            {announcingSoon ? <BlurredCopy text={card.description} /> : card.description}
          </p>
          <p className="mt-3 text-xs leading-5 text-fg-muted">{card.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actionBadge ? (
            <>
              <span className="inline-flex w-fit items-center rounded-md border border-border-muted bg-[var(--color-raised)] px-3 py-2 text-sm font-semibold text-fg-muted">
                {actionBadge}
              </span>
              <a
                href={shareHref(card.shareText, shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              >
                Share
              </a>
            </>
          ) : (
            <>
              <a
                href={card.href}
                target={isExternalHref(card.href) ? "_blank" : undefined}
                rel={isExternalHref(card.href) ? "noopener noreferrer" : undefined}
                className="inline-flex w-fit items-center rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              >
                Open
              </a>
              <a
                href={shareHref(card.shareText, shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center rounded-md border border-border-muted px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
              >
                Share
              </a>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function BlurredCopy({ text }: { text: string }) {
  return (
    <span aria-hidden="true" className="inline-block select-none blur-[4px]">
      {text}
    </span>
  );
}

function shareHref(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`;
}
