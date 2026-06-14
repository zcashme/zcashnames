import type { Metadata } from "next";

export const BLOG_SERIES = ["updates", "launch", "builders"] as const;

export type BlogSeriesSlug = (typeof BLOG_SERIES)[number];

export type BlogSeries = {
  slug: BlogSeriesSlug;
  label: string;
  title: string;
  description: string;
  href: string;
};

export const BLOG_SERIES_META: readonly BlogSeries[] = [
  {
    slug: "updates",
    label: "Updates",
    title: "ZcashNames Updates",
    description: "Product notes, releases, and operator updates from the core team.",
    href: "/blogs/updates",
  },
  {
    slug: "launch",
    label: "Launch",
    title: "Launch Notes",
    description: "Rollout notes, pricing context, and launch-phase communication.",
    href: "/blogs/launch",
  },
  {
    slug: "builders",
    label: "Builders",
    title: "Builder Stories",
    description: "Integration notes for wallets, apps, explorers, and partner teams.",
    href: "/blogs/builders",
  },
];

export const BLOG_SUBSCRIPTION_OPTIONS = [
  ...BLOG_SERIES_META,
  {
    slug: "general",
    label: "General",
    title: "General Newsletter",
    description: "General product, launch, and community updates from ZcashNames.",
    href: "/community",
  },
] as const;

export type BlogSubscriptionSlug = (typeof BLOG_SUBSCRIPTION_OPTIONS)[number]["slug"];

export function isBlogSeriesSlug(value: string): value is BlogSeriesSlug {
  return BLOG_SERIES.includes(value as BlogSeriesSlug);
}

export function getBlogSeries(slug: BlogSeriesSlug): BlogSeries {
  return BLOG_SERIES_META.find((series) => series.slug === slug)!;
}

export function getBlogSeriesBySlug(value: string): BlogSeries | null {
  return isBlogSeriesSlug(value) ? getBlogSeries(value) : null;
}

export function isBlogSubscriptionSlug(value: string): value is BlogSubscriptionSlug {
  return BLOG_SUBSCRIPTION_OPTIONS.some((option) => option.slug === value);
}

export function getBlogSubscriptionOption(slug: BlogSubscriptionSlug) {
  return BLOG_SUBSCRIPTION_OPTIONS.find((option) => option.slug === slug)!;
}

export function getBlogGithubHref(series?: BlogSeriesSlug, postSlug?: string): string {
  const relativePath = series
    ? postSlug
      ? `content/blogs/${series}/${postSlug}.mdx`
      : `content/blogs/${series}/index.mdx`
    : "content/blogs/index.mdx";

  return `https://github.com/zcashme/zcashnames/blob/main/${relativePath}`;
}

export function resolveMetadataTitle(title: Metadata["title"] | undefined, fallback = "Blogs"): string {
  if (typeof title === "string") return title;
  if (title && typeof title === "object") {
    if ("absolute" in title && typeof title.absolute === "string") return title.absolute;
    if ("default" in title && typeof title.default === "string") return title.default;
  }
  return fallback;
}
