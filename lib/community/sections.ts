import { BRAND, COMMUNITIES } from "@/lib/zns/brand";
import type { WalletBrandSlug } from "@/lib/wallets/catalog";

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
  themedIconSrc?: {
    dark: string;
    light: string;
    mono: string;
  };
  walletBrandSlug?: WalletBrandSlug;
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
        label: "Explorers",
        description:
          "Search blocks, transactions, and addresses on the Zcash blockchain. Track shielded pool activity, privacy scores, and network health in real time.",
        href: "https://cipherscan.app",
        shareText: "CipherScan supports exploring ZcashNames and Zcash network activity.",
        detail: "cipherscan.app",
        iconSrc: "/icons/cipherscan.png",
      },
      {
        id: "edge-wallet",
        name: "Edge Wallet",
        label: "Wallets",
        description:
          "A non-custodial, multi-currency mobile cryptocurrency wallet that allows users to securely buy, sell, exchange, and store digital assets on their iOS or Android devices.",
        href: "https://edge.app/",
        shareText: "Edge Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "edge.app",
        iconSrc: "/icons/edge.png",
        walletBrandSlug: "edge",
      },
      {
        id: "zingo-wallet",
        name: "Zingo Wallet",
        label: "Wallets",
        description:
          "A self-custody, Zcash-only, shielded wallet that gives you a way to send, receive, and spend ZEC.",
        href: "https://zingolabs.org/",
        shareText: "Zingo Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "zingo.pm",
        iconSrc: "/wallets/zingo/app-icon.png",
        walletBrandSlug: "zingo",
      },
      {
        id: "cake-wallet",
        name: "Cake Wallet",
        label: "Wallets",
        description:
          "A popular, open-source, non-custodial cryptocurrency wallet that supports Zcash with rotating addresses and in-app swaps.",
        href: "https://cakewallet.com/",
        shareText: "Cake Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "cakewallet.com",
        iconSrc: "/wallets/cake/app-icon.png",
        walletBrandSlug: "cake",
      },
      {
        id: "unstoppable-wallet",
        name: "Unstoppable Wallet",
        label: "Wallets",
        description:
          "A highly secure, non-custodial multi-coin mobile app known for its strong emphasis on user privacy and financial sovereignty.",
        href: "https://unstoppable.money/",
        shareText: "Unstoppable Wallet now resolves ZcashNames - send to a personal name.",
        detail: "unstoppable.money",
        iconSrc: "/icons/unstoppable.png",
        walletBrandSlug: "unstoppable",
      },
      {
        id: "zipher-wallet",
        name: "Zipher Wallet",
        label: "Wallets",
        description:
          "A Zcash wallet for humans, merchants, and AI agents. It has a mobile app, a CLI, and an MCP server for agent workflows.",
        href: "https://zipher.to/",
        shareText: "Zipher Wallet now supports ZcashNames - send ZEC to a personal name.",
        detail: "zipher.app",
        iconSrc: "/wallets/zipher/app-icon.png",
        walletBrandSlug: "zipher",
      },
      {
        id: "noir-wallet",
        name: "Noir Wallet",
        label: "Wallets",
        description:
          "Browser wallet bringing shielded privacy to native Zcash DeFi. Access cross-chain swaps, bridges, lending protocols and more.",
        href: "http://zknoir.com",
        shareText: "Noir Wallet is bringing ZcashNames into the browser to access DeFi.",
        detail: "zknoir.com",
        iconSrc: "/wallets/noir/app-icon.png",
        walletBrandSlug: "noir",
      },
      {
        id: "zcashme",
        name: "Zcash.me",
        label: "Profiles",
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
        label: "Product",
        description:
          "Try ZcashNames before release, test real workflows, and send feedback to the team.",
        href: "/beta/apply",
        shareText: "Apply to beta test ZcashNames before release.",
        detail: "Try the product before release",
        themedIconSrc: themedCommunityIcon("beta-test"),
      },
      {
        id: "sharekit",
        name: "Share Kit",
        label: "Campaign",
        description:
          "Use ready-made posts and referral messaging to promote ZcashNames across social channels.",
        href: "/sharekit",
        shareText: "Use the ZcashNames Share Kit to promote your referral link and outreach posts.",
        detail: "Ready-made posts and referral copy",
        themedIconSrc: themedCommunityIcon("sharekit"),
      },
      {
        id: "namepost",
        name: "Address Me By My Name",
        label: "Campaign",
        description:
          "Create a custom 'Address Me By My Name' image with your name, share it on social media.",
        href: "/namepost",
        shareText: "Create and share your `Address Me By My Name` promo.",
        detail: "Share memes",
        themedIconSrc: themedCommunityIcon("namepost"),
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
        label: "Rankings",
        description:
          "See who is growing the waitlist and compare momentum over time.",
        href: "/leaders",
        shareText: "Follow the ZcashNames community leaderboard.",
        detail: "Community ranking",
        themedIconSrc: themedCommunityIcon("leaderboard"),
      },
      {
        id: "referrals-dashboard",
        name: "Referrals Dashboard",
        label: "Rankings",
        description:
          "Enter a referral code to view referrals, projected rewards, and dashboard details.",
        href: "/leaders/ref",
        shareText: "Track ZcashNames referrals from the community dashboard.",
        detail: "Referral code dashboard",
        themedIconSrc: themedCommunityIcon("referrals-dashboard"),
      },
      {
        id: "explorer",
        name: "Explorer",
        label: "Registry",
        description:
          "Search names, review events, and browse registry activity across ZcashNames.",
        href: "/explorer",
        shareText: "Explore ZcashNames registry activity.",
        detail: "Names, events, and listings",
        themedIconSrc: themedCommunityIcon("explorer"),
      },
      {
        id: "collections",
        name: "Collections",
        label: "Inventory",
        description:
          "Track the names you own and the names you're watching, no account required.",
        href: "/collections",
        shareText: "Track the names you own and watch with ZcashNames Collections.",
        detail: "Owned and watched names",
        themedIconSrc: themedCommunityIcon("collections"),
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
        themedIconSrc: themedCommunityIcon("network-school"),
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
        themedIconSrc: themedCommunityIcon("events"),
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
        label: "Company",
        description:
          "Follow the core docs and product resources as ZcashNames moves toward release.",
        href: "/blogs/updates",
        shareText: "@ZcashNames blog updates are live. Follow along for product notes and resources.",
        detail: "Product resources",
        themedIconSrc: themedCommunityIcon("updates"),
      },
      {
        id: "launch-notes",
        name: "Launch Notes",
        label: "Product",
        description:
          "Read pricing, rollout, and beta context for the current ZcashNames release phase.",
        href: "/blogs/launch",
        shareText: "@ZcashNames launch notes are live. Follow along for rollout updates.",
        detail: "Pricing and rollout context",
        themedIconSrc: themedCommunityIcon("launch-notes"),
      },
      {
        id: "builder-stories",
        name: "Builder Stories",
        label: "Product",
        description:
          "Explore integration paths for wallets, explorers, apps, and ecosystem builders.",
        href: "/blogs/builders",
        shareText: "@ZcashNames builder stories are live. Follow along for wallet, app, and integration updates.",
        detail: "Wallets, apps, and integrations",
        themedIconSrc: themedCommunityIcon("builder-stories"),
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

function themedCommunityIcon(name: string): NonNullable<CommunityCard["themedIconSrc"]> {
  return {
    dark: `/icons/community/${name}-dark.svg`,
    light: `/icons/community/${name}-light.svg`,
    mono: `/icons/community/${name}-mono.svg`,
  };
}
