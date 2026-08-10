import type { Metadata } from "next";
import SoftRedirect from "@/components/SoftRedirect";
import { blogMarkdownMetadata } from "@/lib/blog-markdown";

/** Alias of `/blogs` so `/blog` shares the same Open Graph link preview. */
export async function generateMetadata(): Promise<Metadata> {
  return blogMarkdownMetadata(
    "Blogs",
    "Updates, launch notes, and builder stories from Zcash Names.",
    { path: "/blogs" },
  );
}

export default function BlogAliasPage() {
  return <SoftRedirect href="/blogs" label="Continue to blogs" />;
}
