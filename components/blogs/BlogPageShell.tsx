import Link from "next/link";
import BlogToc from "@/components/blogs/BlogToc";
import { BLOG_SERIES_META, getBlogSeriesBySlug } from "@/lib/blog-series";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export default function BlogPageShell({
  title,
  description,
  series,
  toc,
  githubHref,
  sidebar,
  showTitle = false,
  children,
}: {
  title: string;
  description?: string;
  series?: string;
  toc: Array<{ id: string; label?: string; value?: string; depth: number }>;
  githubHref: string;
  sidebar?: React.ReactNode;
  showTitle?: boolean;
  children: React.ReactNode;
}) {
  const seriesMeta = series ? getBlogSeriesBySlug(series) : null;
  const routeTitle = seriesMeta ? `Blogs / ${seriesMeta.label}` : "Blogs / All";
  const sections = toc.map((item) => ({
    id: item.id,
    label: item.label ?? item.value ?? item.id,
    depth: item.depth,
  }));

  return (
    <div className="blog-shell">
      <SiteRouteTitle title={routeTitle} />
      <div className="blog-shell-header">
        <div className="blog-shell-copy">
          {seriesMeta ? <p className="blog-shell-kicker">{seriesMeta.title}</p> : <p className="blog-shell-kicker">ZcashNames blogs</p>}
          {showTitle ? <h1 className="blog-shell-title">{title}</h1> : null}
          {description ? <p className="blog-shell-description">{description}</p> : null}
        </div>
        <div className="blog-shell-actions">
          <Link href="/blogs/all" className="blog-series-pill" data-active={String(!series)}>
            All
          </Link>
          {BLOG_SERIES_META.map((item) => (
            <Link key={item.slug} href={item.href} className="blog-series-pill" data-active={String(item.slug === series)}>
              {item.label}
            </Link>
          ))}
          <a href={githubHref} target="_blank" rel="noreferrer" className="blog-edit-link">
            View source
          </a>
        </div>
      </div>

      <div className="blog-shell-grid">
        <aside className="blog-shell-sidebar">{sidebar ?? <BlogToc sections={sections} />}</aside>
        <main className="blog-shell-main">
          <div className="blog-mdx">{children}</div>
        </main>
      </div>
    </div>
  );
}
