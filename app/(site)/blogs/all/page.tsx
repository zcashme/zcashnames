import type { Metadata } from "next";
import BlogPageShell from "@/components/blogs/BlogPageShell";
import { getBlogGithubHref } from "@/lib/blog-series";
import { blogMarkdownMetadata, loadBlogMarkdown, renderBlogMarkdown } from "@/lib/blog-markdown";

export async function generateMetadata(): Promise<Metadata> {
  const blog = await loadBlogMarkdown(["index.mdx"], "Blogs");
  return blogMarkdownMetadata(blog.title, blog.description);
}

export default async function BlogsAllPage() {
  const blog = await loadBlogMarkdown(["index.mdx"], "Blogs");

  return (
    <BlogPageShell
      title={blog.title}
      description={blog.description}
      toc={blog.toc}
      githubHref={getBlogGithubHref()}
      showTitle={true}
    >
      {renderBlogMarkdown(blog.markdown)}
    </BlogPageShell>
  );
}
