export type LinkPreviewKind = "static" | "dynamic-sample";

export type LinkPreviewGroup =
  | "core"
  | "referral"
  | "leaders"
  | "explorer"
  | "sharekit"
  | "roadmap"
  | "beta"
  | "careers";

export type LinkPreviewManifestItem = {
  id: string;
  label: string;
  kind: LinkPreviewKind;
  group: LinkPreviewGroup;
  url: string;
  image: string;
  title: string;
  description: string;
  source?: {
    productionRoute?: string;
    ogSlug?: string;
  };
};

export const LINK_PREVIEW_MANIFEST: LinkPreviewManifestItem[] = [
  {
    id: "home",
    label: "Home",
    kind: "static",
    group: "core",
    url: "https://www.zcashnames.com/",
    image: "/og/home.png",
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
    source: {
      productionRoute: "/",
      ogSlug: "home",
    },
  },
  {
    id: "home-referral-sample",
    label: "Referral Link",
    kind: "dynamic-sample",
    group: "referral",
    url: "https://www.zcashnames.com/?ref=szFgXfWk",
    image: "/og/home.png?inviter=Jane%20Doe",
    title: "ZcashNames",
    description: "Personal names for shielded addresses.",
    source: {
      productionRoute: "/",
      ogSlug: "home",
    },
  },
  {
    id: "leaders",
    label: "Leaders",
    kind: "static",
    group: "leaders",
    url: "https://www.zcashnames.com/leaders",
    image: "/og/leaders.png",
    title: "Leaderboard | ZcashNames",
    description: "Global referral rankings, growth, and rewards progress.",
    source: {
      productionRoute: "/leaders",
      ogSlug: "leaders",
    },
  },
  {
    id: "leaders-terms",
    label: "Terms",
    kind: "static",
    group: "leaders",
    url: "https://www.zcashnames.com/leaders/terms",
    image: "/og/leaders-terms.png",
    title: "Leaderboard Terms | ZcashNames",
    description: "Referral rewards and early access terms.",
    source: {
      productionRoute: "/leaders/terms",
      ogSlug: "leaders-terms",
    },
  },
  {
    id: "explorer",
    label: "Explorer",
    kind: "static",
    group: "explorer",
    url: "https://www.zcashnames.com/explorer",
    image: "/og/explorer.png",
    title: "Name Explorer | ZcashNames",
    description: "Browse registered names, event history, and marketplace listings.",
    source: {
      productionRoute: "/explorer",
      ogSlug: "explorer",
    },
  },
  {
    id: "sharekit",
    label: "ShareKit",
    kind: "static",
    group: "sharekit",
    url: "https://www.zcashnames.com/sharekit",
    image: "/og/sharekit.png",
    title: "Share Kit | ZcashNames",
    description: "Copy and share prepared draft posts with your waitlist referral link.",
    source: {
      productionRoute: "/sharekit",
      ogSlug: "sharekit",
    },
  },
  {
    id: "roadmap",
    label: "Roadmap",
    kind: "static",
    group: "roadmap",
    url: "https://www.zcashnames.com/roadmap",
    image: "/og/roadmap.png",
    title: "Roadmap | ZcashNames",
    description: "Calendar roadmap for the next ZcashNames product phases and tasks.",
    source: {
      productionRoute: "/roadmap",
      ogSlug: "roadmap",
    },
  },
  {
    id: "leaders-ref",
    label: "Dashboard",
    kind: "static",
    group: "leaders",
    url: "https://www.zcashnames.com/leaders/ref",
    image: "/og/leaders-ref.png",
    title: "Referral Dashboard | ZcashNames",
    description: "Your referral dashboard for rewards progress.",
    source: {
      productionRoute: "/leaders/ref",
      ogSlug: "leaders-ref",
    },
  },
  {
    id: "beta-apply",
    label: "Beta Invitation",
    kind: "static",
    group: "beta",
    url: "https://www.zcashnames.com/beta/apply",
    image: "/og/beta.png",
    title: "Beta Invitation",
    description: "Apply for the next ZcashNames beta round.",
    source: {
      productionRoute: "/beta/apply",
      ogSlug: "beta",
    },
  },
  {
    id: "careers-index",
    label: "Careers",
    kind: "static",
    group: "careers",
    url: "https://www.zcashnames.com/careers",
    image: "/og/careers.png",
    title: "Careers | ZcashNames",
    description: "Open roles at ZcashNames, with a dedicated learn-more page and application URL for each job.",
    source: {
      productionRoute: "/careers",
      ogSlug: "careers",
    },
  },
  {
    id: "careers-role-sample",
    label: "Career Role Sample",
    kind: "dynamic-sample",
    group: "careers",
    url: "https://www.zcashnames.com/careers/developer-relations-engineer-sdk-integrations",
    image: "/og/careers.png?pill=Developer%20Relations%20Engineer",
    title: "Developer Relations Engineer | ZcashNames",
    description: "Sample job-detail preview using the careers OG treatment with a role-specific title pill.",
    source: {
      productionRoute: "/careers/[slug]",
      ogSlug: "careers",
    },
  },
];
