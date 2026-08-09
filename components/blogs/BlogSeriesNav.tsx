import Link from "next/link";
import { BLOG_SERIES_META } from "@/lib/blog-series";

export default function BlogSeriesNav({
  activeSeries,
}: {
  activeSeries?: string | null;
}) {
  return (
    <nav className="blog-series-nav" aria-label="Blog series">
      <Link
        href="/blogs"
        className="blog-series-tab"
        data-active={String(!activeSeries)}
      >
        All
      </Link>
      {BLOG_SERIES_META.map((item) => (
        <Link
          key={item.slug}
          href={item.href}
          className="blog-series-tab"
          data-active={String(item.slug === activeSeries)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
