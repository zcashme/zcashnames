import { BRAND, COMMUNITIES } from "@/lib/zns/brand";

// CommunityCard represents a single community channel, event, or feature entry.
// Rendered as cards on the /community page, grouped by CommunitySection.

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
    slug: "partners",
    title: "Partners",
    description:
      "Wallets, explorers, and ecosystem partners helping ZcashNames become useful across Zcash.",
    cards: [
      {
        id: "cipherscan-app",
        name: "Cipherscan",
        label: "Explorer partner",
        description:
          "Privacy-first Zcash explorer for names, blocks, transactions, and network analytics.",
        href: "https://cipherscan.app",
        shareText: "CipherScan supports exploring ZcashNames and Zcash network activity.",
        detail: "cipherscan.app",
        iconSrc: "/icons/cipherscan.png",
      },
      {
        id: "edge-wallet",
        name: "Edge Wallet",
        label: "Wallet partner",
        description:
          "Intuitive self-custody wallet with Zcash support - send and receive ZEC privately from anywhere.",
        href: "https://edge.app/",
        shareText: "Edge Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "edge.app",
        iconSrc: "/icons/edge.png",
      },
      {
        id: "zingo-wallet",
        name: "Zingo Wallet",
        label: "Wallet partner",
        description:
          "Mobile and desktop Zcash wallet for private sends, receives, and name-based flows.",
        href: "https://zingo.pm/",
        shareText: "Zingo Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "zingo.pm",
        iconSrc: "/wallets/zingo/app-icon.png",
      },
      {
        id: "cake-wallet",
        name: "Cake Wallet",
        label: "Wallet partner",
        description:
          "Privacy-focused multi-currency wallet bringing ZcashNames into everyday mobile wallet usage.",
        href: "https://cakewallet.com/",
        shareText: "Cake Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "cakewallet.com",
        iconSrc: "/wallets/cake/app-icon.png",
      },
      {
        id: "unstoppable-wallet",
        name: "Unstoppable Wallet",
        label: "Wallet partner",
        description:
          "Multi-currency decentralized wallet built for privacy-conscious crypto management.",
        href: "https://unstoppable.money/",
        shareText: "Unstoppable Wallet now resolves ZcashNames - send to a personal name.",
        detail: "unstoppable.money",
        iconSrc: "/icons/unstoppable.png",
      },
      {
        id: "zipher-wallet",
        name: "Zipher Wallet",
        label: "Wallet partner",
        description:
          "Private Zcash wallet focused on new transfer models and mobile-first privacy experiences.",
        href: "https://zipher.app/",
        shareText: "Zipher Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "zipher.app",
        iconSrc: "/wallets/zipher/app-icon.png",
      },
      {
        id: "noir-wallet",
        name: "Noir Wallet",
        label: "Wallet partner",
        description:
          "Browser wallet bringing shielded privacy and native Zcash DeFi access into extension-based flows.",
        href: "http://zknoir.com",
        shareText: "Noir Wallet is bringing ZcashNames into browser wallet and DeFi flows.",
        detail: "zknoir.com",
        iconSrc: "/wallets/noir/app-icon.png",
      },
      {
        id: "zcashme",
        name: "Zcash.me",
        label: "Profile partner",
        description:
          "Profile infrastructure for connecting names, identity, and public Zcash presence.",
        href: "https://zcash.me",
        shareText: "@ZcashMe supports ZcashNames profiles and identity.",
        detail: "zcash.me",
        iconSrc: "/icons/zcashme.svg",
      },
    ],
  },
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
        href: "/beta/apply",
        shareText: "Apply to beta test ZcashNames before release.",
        detail: "Try the product before release",
        initials: "BT",
      },
      {
        id: "sharekit",
        name: "Share Kit",
        label: "Campaign assets",
        description:
          "Use ready-made posts and referral messaging to promote ZcashNames across social channels.",
        href: "/sharekit",
        shareText: "Use the ZcashNames Share Kit to promote your referral link and outreach posts.",
        detail: "Ready-made posts and referral copy",
        initials: "SK",
      },
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
        id: "namepost",
        name: "Address Me By My Name",
        label: "Meme generator",
        description:
          "Create a custom 'Address Me By My Name' image with your name, share it on social media.",
        href: "/namepost",
        shareText: "Create and share your `Address Me By My Name` promo.",
        detail: "Share memes",
        initials: "AM",
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
        iconSrc: "/icons/github.svg",
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
        id: "zcash-network-school",
        name: "Zcash Network School",
        label: "Community hub",
        description:
          "A Zcash presence at Network School in Malaysia - weekly office hours, ZK education, and wallet onboarding.",
        href: "https://forum.zcashcommunity.com/t/zcash-network-school/55269",
        shareText:
          "Zcash Network School is bringing privacy education and wallet onboarding to Southeast Asia.",
        detail: "Network School, Malaysia",
        iconSrc: "/icons/network-school.png",
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
        shareText: "@ZcashNames blog updates are live. Follow along for product notes and resources.",
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
        shareText: "@ZcashNames launch notes are live. Follow along for rollout updates.",
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
        shareText: "@ZcashNames builder stories are live. Follow along for wallet, app, and integration updates.",
        detail: "Wallets, apps, and integrations",
        initials: "BS",
      },
    ],
  },
];

export function getCommunitySection(slug: string): CommunitySection | undefined {
  return COMMUNITY_SECTIONS.find((section) => section.slug === slug);
}

export function communitySectionHref(slug: string): string {
  return `/community#${slug}`;
}

export function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
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
