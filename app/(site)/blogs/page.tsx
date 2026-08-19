import type { Metadata } from "next";
import { BlogIndexLayout } from "@/components/blogs/BlogPageShell";
import BlogPostList from "@/components/blogs/BlogPostList";
import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import { listAllBlogPosts } from "@/lib/blogs";
import { blogMarkdownMetadata } from "@/lib/blog-markdown";

export async function generateMetadata(): Promise<Metadata> {
  return blogMarkdownMetadata(
    "Blogs",
    "User and builder stories from Zcash Names.",
    { path: "/blogs" },
  );
}

export default async function BlogsIndexPage() {
  const posts = await listAllBlogPosts();

  return (
    <BlogIndexLayout title="Blogs">
      <BlogPostList posts={posts} showSeries />
      <BlogSubscribeCallout
        defaultSeries="general"
        body="Occasional notes on product, launches, and community. No spam."
      />
    </BlogIndexLayout>
  );
}
