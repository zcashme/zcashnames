import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogIndexLayout } from "@/components/blogs/BlogPageShell";
import BlogPostList from "@/components/blogs/BlogPostList";
import BlogSubscribeCallout from "@/components/blogs/BlogSubscribeCallout";
import {
  BLOG_SERIES,
  getBlogSeries,
  isBlogSeriesSlug,
} from "@/lib/blog-series";
import { listBlogPosts } from "@/lib/blogs";
import { blogMarkdownMetadata } from "@/lib/blog-markdown";

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
  const seriesMeta = getBlogSeries(series);
  return blogMarkdownMetadata(seriesMeta.title, seriesMeta.description, {
    path: `/blogs/${series}`,
  });
}

export default async function BlogSeriesPage({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series } = await params;
  if (!isBlogSeriesSlug(series)) notFound();

  const seriesMeta = getBlogSeries(series);
  const posts = await listBlogPosts(series);

  return (
    <BlogIndexLayout
      title={seriesMeta.title}
      description={seriesMeta.description}
      series={series}
    >
      <BlogPostList
        posts={posts}
        showSeries={false}
        emptyLabel={`No posts in ${seriesMeta.label} yet.`}
      />
      <BlogSubscribeCallout
        defaultSeries={series}
        body={`Get new ${seriesMeta.label.toLowerCase()} posts by email.`}
      />
    </BlogIndexLayout>
  );
}
