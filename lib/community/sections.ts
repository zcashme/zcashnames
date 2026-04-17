import { COMMUNITIES } from "@/lib/zns/brand";

export type CommunityCard = {
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

export type CommunitySection = {
  slug: string;
  title: string;
  description: string;
  cards: CommunityCard[];
};

export const ambassadorForm = "https://form.typeform.com/to/oBd1YeoI";

export const COMMUNITY_SECTIONS: CommunitySection[] = [
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
    slug: "social",
    title: "Social",
    description:
      "Follow announcements, ask questions, and connect with other early adopters across community channels.",
    cards: [
      communityCard("x-twitter", "X / Twitter", "Announcements", "Fast product notes and public launch updates.", "x.svg"),
      communityCard("discord", "Discord", "Discussion", "Talk through integrations, feedback, and community ideas.", "discord.svg"),
      communityCard("telegram", "Telegram", "Chat", "Join the day-to-day community chat around ZcashNames.", "telegram.svg"),
      communityCard("signal", "Signal", "Private group", "Follow the Signal group for community coordination.", "signal.svg"),
      {
        id: "github",
        name: "GitHub",
        label: "Source and issues",
        description:
          "Review the code, follow development, and open issues for ZcashNames tooling.",
        href: "https://github.com/zcashme/zcashnames",
        shareText: "Follow ZcashNames development on GitHub.",
        detail: "github.com/zcashme/zcashnames",
        initials: "GH",
      },
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

export function communitySectionHref(slug: string): string {
  return slug === "all" ? "/community" : `/community?section=${slug}`;
}

export function getCommunitySection(slug: string): CommunitySection | undefined {
  return COMMUNITY_SECTIONS.find((section) => section.slug === slug);
}

export function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
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

function communityHref(label: string): string {
  return COMMUNITIES.find((item) => item.label === label)?.href ?? "/community";
}

function displayHost(href: string): string {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
