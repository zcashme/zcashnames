import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPageShell from "@/components/blogs/BlogPageShell";
import BlogRecentPostsSidebar from "@/components/blogs/BlogRecentPostsSidebar";
import UnpublishedPostFallback from "@/components/blogs/UnpublishedPostFallback";
import { BLOG_SERIES, getBlogGithubHref, getBlogSeries, isBlogSeriesSlug } from "@/lib/blog-series";
import { blogPostExists, listBlogPostSlugs, listRecentBlogPosts } from "@/lib/blogs";
import { blogMarkdownMetadata, loadBlogMarkdown, renderBlogMarkdown } from "@/lib/blog-markdown";

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
      title: "This isn't published yet | ZcashNames",
      description: `Subscribe for updates when ${postSlug} is published in the ${series} series.`,
    };
  }
  const blog = await loadBlogMarkdown([series, `${postSlug}.mdx`], postSlug);
  return blogMarkdownMetadata(blog.title, blog.description);
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ series: string; postSlug: string }>;
}) {
  const { series, postSlug } = await params;
  if (!isBlogSeriesSlug(series)) notFound();

  const published = await blogPostExists(series, postSlug);

  if (!published) {
    const recentPosts = await listRecentBlogPosts(series);
    return (
      <BlogPageShell
        title="This isn't published yet"
        description="Subscribe for updates when this series publishes a new post."
        series={series}
        toc={[]}
        githubHref={getBlogGithubHref(series)}
        sidebar={<BlogRecentPostsSidebar posts={recentPosts} seriesTitle={getBlogSeries(series).title} />}
        showTitle={true}
      >
        <UnpublishedPostFallback series={series} postSlug={postSlug} />
      </BlogPageShell>
    );
  }

  const blog = await loadBlogMarkdown([series, `${postSlug}.mdx`], postSlug);

  return (
    <BlogPageShell
      title={blog.title}
      description={blog.description}
      series={series}
      toc={blog.toc}
      githubHref={getBlogGithubHref(series, postSlug)}
      showTitle={true}
    >
      {renderBlogMarkdown(blog.markdown)}
    </BlogPageShell>
  );
}
