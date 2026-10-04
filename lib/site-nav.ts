/**
 * Public site navigation used by the footer sitemap (and shared child lists
 * for the header menu where structure overlaps).
 */

export type SiteNavLink = {
  label: string;
  href: string;
  children?: SiteNavLink[];
};

/** Landing-page anchors. */
export function buildLandingSectionLinks(basePath: "/" = "/"): SiteNavLink[] {
  return [
    { label: "Get Names", href: `${basePath}#names` },
    { label: "Partners", href: `${basePath}#supporters` },
    { label: "Features", href: `${basePath}#benefits` },
    { label: "Get yours", href: `${basePath}#how-it-works` },
    { label: "FAQs", href: `${basePath}#faq` },
    { label: "Newsletter", href: `${basePath}#newsletter` },
  ];
}

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

/** Full footer sitemap sections (href is unique per top-level entry). */
export const SITEMAP_SECTIONS: SiteNavLink[] = [
  {
    label: "Home",
    href: "/",
    children: [
      { label: "Get Names", href: "/#names" },
      { label: "Get yours", href: "/#how-it-works" },
      { label: "FAQs", href: "/#faq" },
      { label: "Newsletter", href: "/#newsletter" },
    ],
  },
  {
    label: "Names",
    href: "/explorer",
    children: [
      { label: "Explorer", href: "/explorer" },
      { label: "Protected names", href: "/protected" },
      { label: "Suggest a name", href: "/protected/suggest" },
      { label: "Request a name", href: "/protected/request" },
    ],
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
      { label: "Security competition", href: "/security" },
      { label: "Brand Kit", href: "/brandkit" },
      { label: "Roadmap", href: "/roadmap" },
    ],
  },
];
