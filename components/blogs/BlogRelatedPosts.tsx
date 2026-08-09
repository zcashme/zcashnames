import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blogs";

export default function BlogRelatedPosts({
  posts,
  title = "More in this series",
  excludeHref,
}: {
  posts: BlogPostSummary[];
  title?: string;
  excludeHref?: string;
}) {
  const filtered = excludeHref
    ? posts.filter((post) => post.href !== excludeHref)
    : posts;

  if (filtered.length === 0) return null;

  return (
    <section className="blog-related" aria-label={title}>
      <h2 className="blog-related-title">{title}</h2>
      <ul className="blog-related-list">
        {filtered.slice(0, 4).map((post) => (
          <li key={post.href}>
            <Link href={post.href} className="blog-related-link">
              <span className="blog-related-link-title">{post.title}</span>
              <span className="blog-related-link-date">{post.publishedLabel}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
