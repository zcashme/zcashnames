/**
 * Legacy sidebar component. Prefer BlogPostList / BlogRelatedPosts.
 * Kept so any old imports keep working without a left-rail layout.
 */
import BlogRelatedPosts from "@/components/blogs/BlogRelatedPosts";
import type { BlogPostSummary } from "@/lib/blogs";

export default function BlogRecentPostsSidebar({
  posts,
  seriesTitle,
}: {
  posts: Array<{ slug: string; title: string; href: string; publishedLabel?: string }>;
  seriesTitle: string;
}) {
  const normalized: BlogPostSummary[] = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    href: post.href,
    series: "updates",
    seriesLabel: seriesTitle,
    publishedLabel: post.publishedLabel,
  }));

  return <BlogRelatedPosts posts={normalized} title={`Recent in ${seriesTitle}`} />;
}
