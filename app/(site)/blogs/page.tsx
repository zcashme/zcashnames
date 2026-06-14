import type { Metadata } from "next";
import BlogPageShell from "@/components/blogs/BlogPageShell";
import BlogRecentPostsSidebar from "@/components/blogs/BlogRecentPostsSidebar";
import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import { getBlogGithubHref } from "@/lib/blog-series";
import { listRecentBlogPostsAcrossAllSeries } from "@/lib/blogs";
import { blogMarkdownMetadata, loadBlogMarkdown, renderBlogMarkdown } from "@/lib/blog-markdown";

export async function generateMetadata(): Promise<Metadata> {
  const blog = await loadBlogMarkdown(["index.mdx"], "Blogs");
  return blogMarkdownMetadata(blog.title, blog.description);
}

export default async function BlogsIndexPage() {
  const blog = await loadBlogMarkdown(["index.mdx"], "Blogs");
  const recentPosts = await listRecentBlogPostsAcrossAllSeries();

  return (
    <BlogPageShell
      title={blog.title}
      description={blog.description}
      toc={blog.toc}
      githubHref={getBlogGithubHref()}
      sidebar={<BlogRecentPostsSidebar posts={recentPosts} seriesTitle="All blogs" />}
      showTitle={true}
    >
      {renderBlogMarkdown(blog.markdown)}
      <BlogSubscribeCallout
        defaultSeries="general"
        title="Subscribe for general updates"
        body="Get general ZcashNames product notes, launch updates, builder stories, and community news in your inbox."
      />
    </BlogPageShell>
  );
}
