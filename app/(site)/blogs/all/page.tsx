import type { Metadata } from "next";
import { BlogIndexLayout } from "@/components/blogs/BlogPageShell";
import BlogPostList from "@/components/blogs/BlogPostList";
import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import { listAllBlogPosts } from "@/lib/blogs";
import { blogMarkdownMetadata } from "@/lib/blog-markdown";

export async function generateMetadata(): Promise<Metadata> {
  return blogMarkdownMetadata(
    "All posts",
    "Every Zcash Names blog post in one list.",
    { path: "/blogs/all" },
  );
}

export default async function BlogsAllPage() {
  const posts = await listAllBlogPosts();

  return (
    <BlogIndexLayout
      title="All posts"
      description="Every published post across Users and Builders."
    >
      <BlogPostList posts={posts} showSeries />
      <BlogSubscribeCallout
        defaultSeries="general"
        body="Occasional notes on product, launch, and community. No spam."
      />
    </BlogIndexLayout>
  );
}
