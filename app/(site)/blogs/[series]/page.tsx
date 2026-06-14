import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPageShell from "@/components/blogs/BlogPageShell";
import BlogRecentPostsSidebar from "@/components/blogs/BlogRecentPostsSidebar";
import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import { BLOG_SERIES, getBlogGithubHref, isBlogSeriesSlug } from "@/lib/blog-series";
import { getBlogSeries } from "@/lib/blog-series";
import { listRecentBlogPosts } from "@/lib/blogs";
import { blogMarkdownMetadata, loadBlogMarkdown, renderBlogMarkdown } from "@/lib/blog-markdown";

export function generateStaticParams() {
  return BLOG_SERIES.map((series) => ({ series }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string }>;
}): Promise<Metadata> {
  const { series } = await params;
  if (!isBlogSeriesSlug(series)) return {};
  const blog = await loadBlogMarkdown([series, "index.mdx"], series);
  return blogMarkdownMetadata(blog.title, blog.description);
}

export default async function BlogSeriesPage({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series } = await params;
  if (!isBlogSeriesSlug(series)) notFound();
  const blog = await loadBlogMarkdown([series, "index.mdx"], series);
  const recentPosts = await listRecentBlogPosts(series);
  const seriesMeta = getBlogSeries(series);

  return (
    <BlogPageShell
      title={blog.title}
      description={blog.description}
      series={series}
      toc={blog.toc}
      githubHref={getBlogGithubHref(series)}
      sidebar={<BlogRecentPostsSidebar posts={recentPosts} seriesTitle={seriesMeta.title} />}
      showTitle={true}
    >
      {renderBlogMarkdown(blog.markdown)}
      <BlogSubscribeCallout
        defaultSeries={series}
        title={`Subscribe to ${seriesMeta.title}`}
        body={`Get new posts from ${seriesMeta.title} by email.`}
      />
    </BlogPageShell>
  );
}
