/**
 * Public site navigation used by the footer sitemap (and shared child lists
 * for the header menu where structure overlaps).
 */

export type SiteNavLink = {
  label: string;
  href: string;
  children?: SiteNavLink[];
};

/** Landing-page anchors (home or waitlist shell). */
export function buildLandingSectionLinks(basePath: "/" | "/waitlist" = "/"): SiteNavLink[] {
  return [
    { label: "Get Names", href: `${basePath}#names` },
    { label: "Partners", href: `${basePath}#supporters` },
    { label: "Features", href: `${basePath}#benefits` },
    { label: "Get yours", href: `${basePath}#how-it-works` },
    { label: "FAQs", href: `${basePath}#faq` },
    { label: "Newsletter", href: `${basePath}#newsletter` },
  ];
}

export const NAV_LEADERBOARD_CHILDREN: SiteNavLink[] = [
  { label: "Dashboard", href: "/leaders/ref" },
  { label: "Share Kit", href: "/sharekit" },
  { label: "Terms", href: "/leaders/terms" },
];

export const NAV_LEARN_CHILDREN: SiteNavLink[] = [
  { label: "What is Zcash Names?", href: "/docs/learn/what-is-zns" },
  { label: "How it works", href: "/docs/learn/how-it-works" },
  { label: "Pricing", href: "/docs/learn/pricing" },
  { label: "Privacy", href: "/docs/learn/privacy" },
];

export const NAV_DEVELOPER_CHILDREN: SiteNavLink[] = [
  { label: "Integrate", href: "/docs/integrate" },
  { label: "SDKs", href: "/docs/sdk" },
  { label: "Protocol", href: "/docs/protocol/overview" },
  { label: "Indexer & RPC", href: "/docs/indexer/running" },
];

export const NAV_BETA_CHILDREN: SiteNavLink[] = [
  { label: "Wallets", href: "/beta/wallets" },
  { label: "Instructions", href: "/beta/instructions" },
  { label: "Apply", href: "/beta/apply" },
  { label: "Refund", href: "/beta/refund" },
];

/** Full footer sitemap sections (href is unique per top-level entry). */
export const SITEMAP_SECTIONS: SiteNavLink[] = [
  {
    label: "Home",
    href: "/",
    children: [
      { label: "Get Names", href: "/#names" },
      { label: "Get yours", href: "/#how-it-works" },
      { label: "FAQs", href: "/#faq" },
      { label: "News", href: "/#newsletter" },
    ],
  },
  {
    label: "Waitlist",
    href: "/waitlist",
    children: [
      { label: "Waitlist view", href: "/waitlist/view" },
      { label: "Reserve", href: "/reserve" },
    ],
  },
  {
    label: "Names",
    href: "/explorer",
    children: [
      { label: "Explorer", href: "/explorer" },
      { label: "Collections", href: "/collections" },
      { label: "Protected names", href: "/protected" },
      { label: "Suggest a name", href: "/protected/suggest" },
    ],
  },
  {
    label: "Leaderboard",
    href: "/leaders",
    children: NAV_LEADERBOARD_CHILDREN,
  },
  {
    label: "Beta",
    href: "/beta",
    children: NAV_BETA_CHILDREN,
  },
  {
    label: "Learn",
    href: "/docs/learn/what-is-zns",
    children: [
      ...NAV_LEARN_CHILDREN,
      { label: "Docs FAQ", href: "/docs/faq" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    label: "Developers",
    href: "/docs",
    children: [
      ...NAV_DEVELOPER_CHILDREN,
      { label: "Indexers", href: "/indexers" },
    ],
  },
  {
    label: "Community",
    href: "/community",
    children: [
      { label: "Blogs", href: "/blogs" },
      { label: "Careers", href: "/careers" },
      { label: "Brand Kit", href: "/brandkit" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
];
