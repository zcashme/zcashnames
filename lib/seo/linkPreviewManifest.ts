export type LinkPreviewKind = "static" | "dynamic-sample";

export type LinkPreviewGroup =
  | "core"
  | "referral"
  | "leaders"
  | "explorer"
  | "sharekit"
  | "roadmap"
  | "beta"
  | "careers"
  | "marketing"
  | "product"
  | "content"
  | "docs";

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
    label: "Leaderboard",
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
    label: "Referral Terms",
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
    label: "Share Kit",
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
  {
    id: "faq",
    label: "FAQ",
    kind: "static",
    group: "marketing",
    url: "https://www.zcashnames.com/faq",
    image: "/og/faq.png",
    title: "FAQ | Zcash Names",
    description: "Frequently asked questions about Zcash Names waitlist reservations and Early Access.",
    source: {
      productionRoute: "/faq",
      ogSlug: "faq",
    },
  },
  {
    id: "community",
    label: "Community",
    kind: "static",
    group: "marketing",
    url: "https://www.zcashnames.com/community",
    image: "/og/community.png",
    title: "Community | Zcash Names",
    description:
      "Join the Zcash Names community, beta test releases, become an ambassador, and find partner resources.",
    source: {
      productionRoute: "/community",
      ogSlug: "community",
    },
  },
  {
    id: "brandkit",
    label: "Brand Kit",
    kind: "static",
    group: "marketing",
    url: "https://www.zcashnames.com/brandkit",
    image: "/og/brandkit.png",
    title: "Brand Kit | Zcash Names",
    description: "Download Zcash Names logo, banner, and brand lockup assets.",
    source: {
      productionRoute: "/brandkit",
      ogSlug: "brandkit",
    },
  },
  {
    id: "namepost",
    label: "Create Post",
    kind: "static",
    group: "marketing",
    url: "https://www.zcashnames.com/namepost",
    image: "/og/namepost.png",
    title: "Address Me By My Name | Zcash Names",
    description: "Create a square Address Me By My Name image with custom artwork and text color.",
    source: {
      productionRoute: "/namepost",
      ogSlug: "namepost",
    },
  },
  {
    id: "indexers",
    label: "Indexers",
    kind: "static",
    group: "product",
    url: "https://www.zcashnames.com/indexers",
    image: "/og/indexers.png",
    title: "Indexers | Zcash Names",
    description: "Community-run ZNS indexers for resolving .zcash names.",
    source: {
      productionRoute: "/indexers",
      ogSlug: "indexers",
    },
  },
  {
    id: "protected",
    label: "Protected Names",
    kind: "static",
    group: "product",
    url: "https://www.zcashnames.com/protected",
    image: "/og/protected.png",
    title: "Protected Names | Zcash Names",
    description: "Public protected names view for Zcash Names.",
    source: {
      productionRoute: "/protected",
      ogSlug: "protected",
    },
  },
  {
    id: "protected-suggest",
    label: "Suggest Protected Names",
    kind: "static",
    group: "product",
    url: "https://www.zcashnames.com/protected/suggest",
    image: "/og/protected-suggest.png",
    title: "Suggest Protected Names | Zcash Names",
    description: "Submit a public protected-name suggestion for Zcash Names review.",
    source: {
      productionRoute: "/protected/suggest",
      ogSlug: "protected-suggest",
    },
  },
  {
    id: "protected-dispute",
    label: "Dispute Protected Names",
    kind: "static",
    group: "product",
    url: "https://www.zcashnames.com/protected/dispute",
    image: "/og/protected-dispute.png",
    title: "Dispute Protected Names | Zcash Names",
    description:
      "Dispute a protected or rejected name so Zcash Names can reevaluate it with new information.",
    source: {
      productionRoute: "/protected/dispute",
      ogSlug: "protected-dispute",
    },
  },
  {
    id: "waitlist-view",
    label: "Waitlist",
    kind: "static",
    group: "product",
    url: "https://www.zcashnames.com/waitlist/view",
    image: "/og/waitlist-view.png",
    title: "Waitlist View | Zcash Names",
    description: "Public waitlist view for verified Zcash Names queue positions.",
    source: {
      productionRoute: "/waitlist/view",
      ogSlug: "waitlist-view",
    },
  },
  {
    id: "collections",
    label: "Collections",
    kind: "static",
    group: "product",
    url: "https://www.zcashnames.com/collections",
    image: "/og/collections.png",
    title: "Collections | Zcash Names",
    description: "Track the names you own and the names you're watching — no account required.",
    source: {
      productionRoute: "/collections",
      ogSlug: "collections",
    },
  },
  {
    id: "blogs",
    label: "Blog",
    kind: "static",
    group: "content",
    url: "https://www.zcashnames.com/blogs",
    image: "/og/blogs.png",
    title: "Blogs | Zcash Names",
    description: "Updates, launch notes, and builder stories from Zcash Names.",
    source: {
      productionRoute: "/blogs",
      ogSlug: "blogs",
    },
  },
  {
    id: "docs",
    label: "Docs",
    kind: "static",
    group: "docs",
    url: "https://www.zcashnames.com/docs",
    image: "/og/docs.png",
    title: "Docs | Zcash Names",
    description: "Documentation for the Zcash Name Service",
    source: {
      productionRoute: "/docs",
      ogSlug: "docs",
    },
  },
];
