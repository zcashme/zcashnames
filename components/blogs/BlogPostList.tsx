import Link from "next/link";
import type { BlogPostSummary } from "@/lib/blogs";

export default function BlogPostList({
  posts,
  showSeries = true,
  emptyLabel = "No posts yet.",
}: {
  posts: BlogPostSummary[];
  showSeries?: boolean;
  emptyLabel?: string;
}) {
  if (posts.length === 0) {
    return <p className="blog-post-list-empty">{emptyLabel}</p>;
  }

  return (
    <ul className="blog-post-list">
      {posts.map((post) => (
        <li key={post.href} className="blog-post-list-item">
          <Link href={post.href} className="blog-post-list-link">
            <div className="blog-post-list-meta">
              {showSeries ? <span className="blog-post-list-series">{post.seriesLabel}</span> : null}
              {post.publishedLabel ? (
                <time className="blog-post-list-date">{post.publishedLabel}</time>
              ) : null}
            </div>
            <h2 className="blog-post-list-title">{post.title}</h2>
            {post.excerpt ? <p className="blog-post-list-excerpt">{post.excerpt}</p> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
