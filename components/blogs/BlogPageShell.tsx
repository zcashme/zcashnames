import Link from "next/link";
import SiteRouteTitle from "@/components/SiteRouteTitle";
import BlogRouteChrome from "@/components/blogs/BlogRouteChrome";
import BlogSeriesNav from "@/components/blogs/BlogSeriesNav";
import BlogToc from "@/components/blogs/BlogToc";
import { getBlogSeriesBySlug } from "@/lib/blog-series";

type TocItem = { id: string; label?: string; value?: string; depth: number };

function normalizeToc(toc: TocItem[]) {
  return toc.map((item) => ({
    id: item.id,
    label: item.label ?? item.value ?? item.id,
    depth: item.depth,
  }));
}

/** Outer frame shared by hub, series, and article pages. */
export function BlogFrame({
  routeTitle,
  routeHref,
  children,
}: {
  routeTitle: string;
  routeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="blog-shell">
      <BlogRouteChrome />
      <SiteRouteTitle title={routeTitle} href={routeHref} />
      <div className="blog-shell-inner">{children}</div>
    </main>
  );
}

/** Hub or series index: title, series tabs, list content. */
export function BlogIndexLayout({
  title,
  description,
  series,
  showSeriesNav = true,
  children,
}: {
  title: string;
  description?: string;
  series?: string;
  showSeriesNav?: boolean;
  children: React.ReactNode;
}) {
  const seriesMeta = series ? getBlogSeriesBySlug(series) : null;

  return (
    <BlogFrame routeTitle="Blogs" routeHref="/blogs">
      <header className="blog-index-header">
        <h1 className="blog-shell-title">{title}</h1>
        {description ? <p className="blog-shell-description">{description}</p> : null}
        {showSeriesNav ? <BlogSeriesNav activeSeries={series ?? null} /> : null}
      </header>
      <div className="blog-index-body">{children}</div>
    </BlogFrame>
  );
}

/** Article reading layout: title, meta, flat prose, optional right TOC. */
export function BlogArticleLayout({
  title,
  description,
  series,
  publishedLabel,
  githubHref,
  toc,
  afterArticle,
  endMatter,
  children,
}: {
  title: string;
  description?: string;
  series?: string;
  publishedLabel?: string;
  githubHref?: string;
  toc: TocItem[];
  /** Tightly below the article (e.g. share). */
  afterArticle?: React.ReactNode;
  endMatter?: React.ReactNode;
  children: React.ReactNode;
}) {
  const seriesMeta = series ? getBlogSeriesBySlug(series) : null;
  const sections = normalizeToc(toc);
  const showToc = sections.length >= 2;

  return (
    <BlogFrame routeTitle="Blogs" routeHref="/blogs">
      <header className="blog-article-header">
        <h1 className="blog-shell-title">{title}</h1>
        {description ? <p className="blog-shell-description">{description}</p> : null}
        <div className="blog-article-meta">
          {publishedLabel ? <time className="blog-article-meta-item">{publishedLabel}</time> : null}
          {seriesMeta ? (
            <Link href={seriesMeta.href} className="blog-article-meta-item blog-article-meta-link">
              {seriesMeta.label}
            </Link>
          ) : null}
          {githubHref ? (
            <a
              href={githubHref}
              target="_blank"
              rel="noreferrer"
              className="blog-article-meta-item blog-article-meta-link"
            >
              View source
            </a>
          ) : null}
        </div>
        {showToc ? (
          <div className="blog-toc-mobile-wrap lg:hidden">
            <BlogToc sections={sections} variant="mobile" />
          </div>
        ) : null}
      </header>

      <div className={`blog-article-grid${showToc ? " blog-article-grid--with-toc" : ""}`}>
        <div className="blog-article-column">
          <article className="blog-mdx">{children}</article>
          {afterArticle ? <div className="blog-article-after">{afterArticle}</div> : null}
          {endMatter ? <div className="blog-article-end">{endMatter}</div> : null}
        </div>
        {showToc ? (
          <aside className="blog-article-toc" aria-label="On this page">
            <BlogToc sections={sections} variant="desktop" />
          </aside>
        ) : null}
      </div>
    </BlogFrame>
  );
}

/** @deprecated Prefer BlogIndexLayout / BlogArticleLayout. Kept for any stray imports. */
export default function BlogPageShell({
  title,
  description,
  series,
  toc,
  githubHref,
  sidebar: _sidebar,
  showTitle = false,
  children,
}: {
  title: string;
  description?: string;
  series?: string;
  toc: TocItem[];
  githubHref: string;
  sidebar?: React.ReactNode;
  showTitle?: boolean;
  children: React.ReactNode;
}) {
  if (showTitle) {
    return (
      <BlogArticleLayout
        title={title}
        description={description}
        series={series}
        githubHref={githubHref}
        toc={toc}
      >
        {children}
      </BlogArticleLayout>
    );
  }

  return (
    <BlogIndexLayout title={title} description={description} series={series}>
      <div className="blog-mdx">{children}</div>
    </BlogIndexLayout>
  );
}
