import "server-only";

import path from "node:path";
import { promises as fs } from "node:fs";
import {
  type BlogSeriesSlug,
  BLOG_SERIES,
  getBlogSeries,
} from "@/lib/blog-series";

const BLOGS_CONTENT_ROOT = path.join(process.cwd(), "content", "blogs");

export type BlogPostSummary = {
  slug: string;
  title: string;
  href: string;
  series: BlogSeriesSlug;
  seriesLabel: string;
  publishedLabel: string;
  excerpt?: string;
};

export async function blogSeriesDirectoryExists(series: BlogSeriesSlug): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(BLOGS_CONTENT_ROOT, series));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function blogPostExists(series: BlogSeriesSlug, postSlug: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path.join(BLOGS_CONTENT_ROOT, series, `${postSlug}.mdx`));
    return stat.isFile();
  } catch {
    return false;
  }
}

export async function listBlogPostSlugs(series: BlogSeriesSlug): Promise<string[]> {
  const dir = path.join(BLOGS_CONTENT_ROOT, series);
  const entries = await fs.readdir(dir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "index.mdx")
    .map((entry) => entry.name.replace(/\.mdx$/, ""))
    .sort();
}

function titleFromMarkdown(markdown: string, fallback: string): string {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  return match?.[1]?.trim() || fallback;
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function firstParagraph(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/);
  const paragraphs: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (paragraphs.length > 0) break;
      continue;
    }
    if (/^#/.test(line)) continue;
    if (/^import\s+/.test(line)) continue;
    if (/^[-*]\s+/.test(line)) continue;
    if (/^\|/.test(line)) continue;
    paragraphs.push(line);
  }

  const text = stripInlineMarkdown(paragraphs.join(" "));
  if (!text) return undefined;
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

function formatPublishedLabel(modifiedAt: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(modifiedAt));
}

async function readSeriesPosts(series: BlogSeriesSlug): Promise<Array<BlogPostSummary & { modifiedAt: number }>> {
  const dir = path.join(BLOGS_CONTENT_ROOT, series);
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const seriesMeta = getBlogSeries(series);

    return Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "index.mdx")
        .map(async (entry) => {
          const slug = entry.name.replace(/\.mdx$/, "");
          const filePath = path.join(dir, entry.name);
          const [stat, markdown] = await Promise.all([
            fs.stat(filePath),
            fs.readFile(filePath, "utf8"),
          ]);

          return {
            slug,
            title: titleFromMarkdown(markdown, slug),
            href: `/blogs/${series}/${slug}`,
            series,
            seriesLabel: seriesMeta.label,
            excerpt: firstParagraph(markdown),
            modifiedAt: stat.mtimeMs,
            publishedLabel: formatPublishedLabel(stat.mtimeMs),
          };
        }),
    );
  } catch {
    return [];
  }
}

export async function listBlogPosts(
  series: BlogSeriesSlug,
  limit?: number,
): Promise<BlogPostSummary[]> {
  const posts = await readSeriesPosts(series);
  const sorted = posts.sort((a, b) => b.modifiedAt - a.modifiedAt);
  const sliced = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  return sliced.map(({ modifiedAt: _modifiedAt, ...post }) => post);
}

export async function listRecentBlogPosts(
  series: BlogSeriesSlug,
  limit = 5,
): Promise<BlogPostSummary[]> {
  return listBlogPosts(series, limit);
}

export async function listAllBlogPosts(limit?: number): Promise<BlogPostSummary[]> {
  const postsBySeries = await Promise.all(BLOG_SERIES.map((series) => readSeriesPosts(series)));
  const sorted = postsBySeries.flat().sort((a, b) => b.modifiedAt - a.modifiedAt);
  const sliced = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  return sliced.map(({ modifiedAt: _modifiedAt, ...post }) => post);
}

export async function listRecentBlogPostsAcrossAllSeries(limit = 8): Promise<BlogPostSummary[]> {
  return listAllBlogPosts(limit);
}

export async function getBlogPostMeta(
  series: BlogSeriesSlug,
  postSlug: string,
): Promise<{ publishedLabel: string } | null> {
  try {
    const filePath = path.join(BLOGS_CONTENT_ROOT, series, `${postSlug}.mdx`);
    const stat = await fs.stat(filePath);
    return { publishedLabel: formatPublishedLabel(stat.mtimeMs) };
  } catch {
    return null;
  }
}
