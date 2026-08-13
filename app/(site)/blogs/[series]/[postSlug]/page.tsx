import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogArticleLayout } from "@/components/blogs/BlogPageShell";
import BlogRelatedPosts from "@/components/blogs/BlogRelatedPosts";
import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import ShareDropdown from "@/components/ShareDropdown";
import {
  BLOG_SERIES,
  getBlogGithubHref,
  getBlogSeries,
  isBlogSeriesSlug,
} from "@/lib/blog-series";
import {
  blogPostExists,
  getBlogPostMeta,
  listBlogPostSlugs,
  listBlogPosts,
} from "@/lib/blogs";
import { blogMarkdownMetadata, loadBlogMarkdown, renderBlogMarkdown } from "@/lib/blog-markdown";
import { BRAND } from "@/lib/zns/brand";

export async function generateStaticParams() {
  const params = await Promise.all(
    BLOG_SERIES.map(async (series) => {
      const slugs = await listBlogPostSlugs(series);
      return slugs.map((postSlug) => ({ series, postSlug }));
    }),
  );

  return params.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string; postSlug: string }>;
}): Promise<Metadata> {
  const { series, postSlug } = await params;
  if (!isBlogSeriesSlug(series)) return {};
  if (!(await blogPostExists(series, postSlug))) {
    return {
      title: "This isn't published yet | Zcash Names",
      description: `Subscribe for updates when ${postSlug} is published in the ${series} series.`,
    };
  }
  const blog = await loadBlogMarkdown([series, `${postSlug}.mdx`], postSlug);
  return blogMarkdownMetadata(blog.title, blog.description, {
    path: `/blogs/${series}/${postSlug}`,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ series: string; postSlug: string }>;
}) {
  const { series, postSlug } = await params;
  if (!isBlogSeriesSlug(series)) notFound();

  const seriesMeta = getBlogSeries(series);
  const relatedPosts = await listBlogPosts(series, { limit: 5 });
  const published = await blogPostExists(series, postSlug);

  if (!published) {
    return (
      <BlogArticleLayout
        title="This isn't published yet"
        description={`${postSlug} is not published in ${seriesMeta.title} yet.`}
        series={series}
        githubHref={getBlogGithubHref(series)}
        toc={[]}
        endMatter={
          <BlogSubscribeCallout
            defaultSeries={series}
            body="We'll email you when a new post in this series goes live."
          />
        }
      >
        <p>
          There is no published entry for this path yet. You can subscribe below, or browse{" "}
          <Link href={seriesMeta.href}>{seriesMeta.label}</Link> for live posts.
        </p>
      </BlogArticleLayout>
    );
  }

  const blog = await loadBlogMarkdown([series, `${postSlug}.mdx`], postSlug);
  const meta = await getBlogPostMeta(series, postSlug);
  const postHref = `/blogs/${series}/${postSlug}`;
  const shareUrl = `${BRAND.url.replace(/\/$/, "")}${postHref}`;
  const shareMessage = `Read about "${blog.title}" in the ${seriesMeta.title} blog on Zcash Names ${shareUrl}`;
  const xShareMessage = `Read about "${blog.title}" in the ${seriesMeta.title} blog on @ZcashNames ${shareUrl}`;

  return (
    <BlogArticleLayout
      title={blog.title}
      description={blog.description}
      series={series}
      publishedLabel={meta?.publishedLabel}
      githubHref={getBlogGithubHref(series, postSlug)}
      toc={blog.toc}
      afterArticle={
        <div className="blog-article-share">
          <ShareDropdown
            label="Share"
            message={shareMessage}
            xMessage={xShareMessage}
            shareUrl={shareUrl}
            emailSubject={blog.title}
            menuAlign="left"
            buttonClassName="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-border-muted bg-transparent px-3 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-[var(--color-accent-interactive)] hover:text-[var(--color-accent-interactive)]"
          />
        </div>
      }
      endMatter={
        <>
          <BlogRelatedPosts
            posts={relatedPosts}
            title={`More in ${seriesMeta.title}`}
            excludeHref={postHref}
          />
          <BlogSubscribeCallout
            defaultSeries={series}
            body={`Get new posts from ${seriesMeta.title} by email.`}
          />
        </>
      }
    >
      {renderBlogMarkdown(blog.markdown)}
    </BlogArticleLayout>
  );
}
