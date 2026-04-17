import type { Metadata } from "next";
import { BRAND, COMMUNITIES } from "@/lib/zns/brand";

export const metadata: Metadata = {
  title: "Community | ZcashNames",
  description:
    "Join the ZcashNames community, beta test releases, become an ambassador, and find partner resources.",
};

type CommunityCard = {
  id: string;
  name: string;
  label: string;
  description: string;
  href: string;
  shareText: string;
  detail: string;
  iconSrc?: string;
  initials?: string;
};

type CommunitySection = {
  slug: string;
  title: string;
  description: string;
  cards: CommunityCard[];
};

const ambassadorForm = "https://form.typeform.com/to/oBd1YeoI";

const sections: CommunitySection[] = [
  {
    slug: "get-involved",
    title: "Get Involved",
    description:
      "Help shape ZcashNames before the public release and bring local communities into the network.",
    cards: [
      {
        id: "ambassador",
        name: "Become an Ambassador",
        label: "Events and commission",
        description:
          "Host local events, onboard new users, and earn a sales commission when your community claims names.",
        href: ambassadorForm,
        shareText:
          "Become a ZcashNames ambassador, host local events, and earn commission.",
        detail: "Host local events - earn commission",
        initials: "ZA",
      },
      {
        id: "beta-test",
        name: "Beta Test",
        label: "Product access",
        description:
          "Try ZcashNames before release, test real workflows, and send high-signal feedback to the team.",
        href: "/closedbeta/apply",
        shareText: "Apply to beta test ZcashNames before release.",
        detail: "Try the product before release",
        initials: "BT",
      },
      {
        id: "newsletter",
        name: "Sign Up for Newsletter",
        label: "Launch updates",
        description:
          "Get product updates, launch notes, and community opportunities in your inbox.",
        href: "/",
        shareText: "Sign up for ZcashNames launch updates and community news.",
        detail: "News, launch notes, and invites",
        initials: "NL",
      },
    ],
  },
  {
    slug: "community-pages",
    title: "Community Pages",
    description:
      "Follow announcements, ask questions, and connect with other early adopters across community channels.",
    cards: [
      communityCard("x-twitter", "X / Twitter", "Announcements", "Fast product notes and public launch updates.", "x.svg"),
      communityCard("discord", "Discord", "Discussion", "Talk through integrations, feedback, and community ideas.", "discord.svg"),
      communityCard("telegram", "Telegram", "Chat", "Join the day-to-day community chat around ZcashNames.", "telegram.svg"),
      communityCard("signal", "Signal", "Private group", "Follow the Signal group for community coordination.", "signal.svg"),
    ],
  },
  {
    slug: "partners",
    title: "Partners",
    description:
      "Wallets, explorers, and ecosystem partners helping ZcashNames become useful across Zcash.",
    cards: [
      {
        id: "edge-wallet",
        name: "Edge Wallet",
        label: "Wallet partner",
        description:
          "A self-custody wallet partner for bringing human-readable ZcashNames into everyday payments.",
        href: "https://edge.app",
        shareText: "Edge Wallet is part of the ZcashNames partner ecosystem.",
        detail: "Wallet integration",
        initials: "EW",
      },
      {
        id: "cake-wallet",
        name: "Cake Wallet",
        label: "Wallet partner",
        description:
          "A privacy-first wallet partner helping Zcash users send, receive, and discover names.",
        href: "https://cakewallet.com",
        shareText: "Cake Wallet is part of the ZcashNames partner ecosystem.",
        detail: "Wallet integration",
        initials: "CW",
      },
      {
        id: "cipherscan",
        name: "CipherScan",
        label: "Explorer partner",
        description:
          "Explorer support for registry events, name activity, and ZcashNames visibility.",
        href: "https://cipherscan.app",
        shareText: "CipherScan supports the ZcashNames ecosystem.",
        detail: "Explorer and registry visibility",
        initials: "CS",
      },
      {
        id: "zcashme",
        name: "Zcash.me",
        label: "Profile partner",
        description:
          "Profile infrastructure for connecting names, identity, and public Zcash presence.",
        href: "https://zcash.me",
        shareText: "Zcash.me supports ZcashNames profiles and identity.",
        detail: "Profiles and identity",
        initials: "ZM",
      },
    ],
  },
  {
    slug: "features",
    title: "Features",
    description:
      "Community-facing tools for tracking growth, sharing referrals, and exploring the registry.",
    cards: [
      {
        id: "referrals-dashboard",
        name: "Referrals Dashboard",
        label: "Growth tools",
        description:
          "Enter a referral code to view referrals, projected rewards, and dashboard details.",
        href: "/leaders/ref",
        shareText: "Track ZcashNames referrals from the community dashboard.",
        detail: "Referral code dashboard",
        initials: "RD",
      },
      {
        id: "leaderboard",
        name: "Leaderboard",
        label: "Community rank",
        description:
          "See who is growing the waitlist and compare community momentum over time.",
        href: "/leaders",
        shareText: "Follow the ZcashNames community leaderboard.",
        detail: "Community ranking",
        initials: "LB",
      },
      {
        id: "explorer",
        name: "Explorer",
        label: "Registry activity",
        description:
          "Search names, review events, and browse registry activity across ZcashNames.",
        href: "/explorer",
        shareText: "Explore ZcashNames registry activity.",
        detail: "Names, events, and listings",
        initials: "EX",
      },
    ],
  },
  {
    slug: "events",
    title: "Events",
    description:
      "Meetups, calls, and sponsorship paths for bringing ZcashNames into real community spaces.",
    cards: [
      {
        id: "host-local-meetup",
        name: "Host a Local Meetup",
        label: "Local events",
        description:
          "Bring ZcashNames to your city with demos, onboarding, and practical wallet education.",
        href: ambassadorForm,
        shareText: "Host a local ZcashNames meetup.",
        detail: "Meetups, demos, and onboarding",
        initials: "HM",
      },
      {
        id: "community-call",
        name: "Join a Community Call",
        label: "Live sessions",
        description:
          "Join community conversations around product feedback, integrations, and launch planning.",
        href: communityHref("Discord"),
        shareText: "Join a ZcashNames community call.",
        detail: "Community calls and planning",
        initials: "CC",
      },
      {
        id: "sponsor-event",
        name: "Sponsor an Event",
        label: "Partner events",
        description:
          "Support education, onboarding, and regional ZcashNames activity with the team.",
        href: "https://cal.com/zcash",
        shareText: "Sponsor a ZcashNames community event.",
        detail: "Sponsorship and event support",
        initials: "SE",
      },
    ],
  },
  {
    slug: "blogs",
    title: "Blogs",
    description:
      "Readable updates and resources for users, builders, and community leaders following ZcashNames.",
    cards: [
      {
        id: "zcashnames-updates",
        name: "ZcashNames Updates",
        label: "Product notes",
        description:
          "Follow the core docs and product resources as ZcashNames moves toward release.",
        href: "/docs",
        shareText: "Read ZcashNames product updates and resources.",
        detail: "Product resources",
        initials: "ZU",
      },
      {
        id: "launch-notes",
        name: "Launch Notes",
        label: "Release context",
        description:
          "Read pricing, rollout, and beta context for the current ZcashNames release phase.",
        href: "/docs/learn/pricing",
        shareText: "Read ZcashNames launch notes.",
        detail: "Pricing and rollout context",
        initials: "LN",
      },
      {
        id: "builder-stories",
        name: "Builder Stories",
        label: "Developer resources",
        description:
          "Explore integration paths for wallets, explorers, apps, and ecosystem builders.",
        href: "/docs/integrate",
        shareText: "Explore ZcashNames builder resources.",
        detail: "Wallets, apps, and integrations",
        initials: "BS",
      },
    ],
  },
];

export default async function CommunityPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const selectedSection = normalizeSection(firstParam(params.section));
  const visibleSections =
    selectedSection === "all"
      ? sections
      : sections.filter((section) => section.slug === selectedSection);
  const totalCards = sections.reduce((total, section) => total + section.cards.length, 0);

  return (
    <main className="w-full">
      <section className="mx-auto flex w-full max-w-[1320px] flex-col gap-10 px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="flex max-w-3xl flex-col gap-4">
          <p className="type-chip font-semibold uppercase tracking-[0.16em] text-fg-muted">Community</p>
          <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
            Join the movement
          </h1>
          <p className="type-section-subtitle text-fg-body">
            Find community pages, partner resources, and ways to help ZcashNames reach more Zcash users.
          </p>
        </div>

        <div className="grid gap-4 rounded-lg border border-border-muted bg-[var(--color-raised)] p-5 sm:grid-cols-3">
          <CommunityNote label="Ways to join" value="Ambassadors, beta testers, newsletter" />
          <CommunityNote label="Resources" value={`${totalCards} community links and tools`} separated />
          <CommunityNote label="Actions" value="Open or share every card" separated />
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
  if (sections.some((section) => section.slug === value)) return value;
  return "all";
}

function sectionHref(slug: string): string {
  return slug === "all" ? "/community" : `/community?section=${slug}`;
}

function communityHref(label: string): string {
  return COMMUNITIES.find((item) => item.label === label)?.href ?? "/community";
}

function SectionPills({ selectedSection }: { selectedSection: string }) {
  const options = [
    { slug: "all", title: "All" },
    ...sections.map((section) => ({ slug: section.slug, title: section.title })),
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
              href={sectionHref(option.slug)}
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

function communityCard(
  id: string,
  name: string,
  label: string,
  description: string,
  iconFile: string,
): CommunityCard {
  const community = COMMUNITIES.find((item) => item.label === name);

  return {
    id,
    name,
    label,
    description,
    href: community?.href ?? "/community",
    shareText: `Join ZcashNames on ${name}.`,
    detail: community ? displayHost(community.href) : "Community channel",
    iconSrc: `/icons/${iconFile}`,
  };
}

function CommunityCardSection({ section }: { section: CommunitySection }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-fg-heading">{section.title}</h2>
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

function CommunityActionCard({ card }: { card: CommunityCard }) {
  const shareUrl = `${BRAND.url}/community#${card.id}`;

  return (
    <article
      id={card.id}
      className="scroll-mt-24 overflow-hidden rounded-lg border border-border-muted bg-[var(--color-card)]"
    >
      <div className="flex aspect-[16/9] items-center justify-center border-b border-border-muted bg-[var(--color-raised)] p-5">
        <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-border-muted bg-[var(--color-background)] p-5">
          {card.iconSrc ? (
            <img
              src={card.iconSrc}
              alt=""
              className="h-full w-full object-contain"
              loading="lazy"
              aria-hidden="true"
            />
          ) : (
            <span className="text-3xl font-bold text-fg-heading">{card.initials}</span>
          )}
        </div>
      </div>
      <div className="flex min-h-[220px] flex-col gap-4 p-4">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{card.label}</p>
          <h3 className="mt-2 text-base font-bold text-fg-heading">{card.name}</h3>
          <p className="mt-2 text-sm leading-6 text-fg-body">{card.description}</p>
          <p className="mt-3 text-xs leading-5 text-fg-muted">{card.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>
    </article>
  );
}

function CommunityNote({
  label,
  value,
  separated,
}: {
  label: string;
  value: string;
  separated?: boolean;
}) {
  return (
    <div
      className={
        separated ? "border-t border-border-muted pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0" : ""
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-fg-heading">{value}</p>
    </div>
  );
}

function shareHref(text: string, url: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`;
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

function displayHost(href: string): string {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
