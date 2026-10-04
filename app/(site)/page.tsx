import type { Metadata } from "next";
import { listLandingBlogPosts } from "@/lib/blogs";
import { getChainStats } from "@/lib/network-stats";
import NetworkPageClient from "./NetworkPageClient";

export const metadata: Metadata = {
  title: "Zcash Names | Personal names for shielded addresses",
  description: "Claim yours.",
  alternates: { canonical: "https://www.zcashnames.com/" },
  openGraph: {
    title: "Zcash Names",
    description: "Personal names for shielded addresses.",
    url: "https://www.zcashnames.com/",
    images: [{ url: "/og/home.png", width: 1200, height: 630, alt: "Zcash Names" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zcash Names",
    description: "Personal names for shielded addresses.",
    images: ["/og/home.png"],
  },
};

export default async function HomePage() {
  // Testnet is the live network; the mainnet mint is offline (mint-config).
  const network = "testnet" as const;
  const [stats, homepagePosts] = await Promise.all([
    getChainStats(network),
    listLandingBlogPosts({ limit: 4 }),
  ]);

  const recentBlogPosts = homepagePosts.map((post) => ({
    slug: post.slug,
    title: post.title,
    href: post.href,
    seriesLabel: post.seriesLabel,
    publishedLabel: post.publishedLabel,
    excerpt: post.excerpt,
  }));

  return (
    <NetworkPageClient
      network={network}
      stats={stats}
      recentBlogPosts={recentBlogPosts}
    />
  );
}
