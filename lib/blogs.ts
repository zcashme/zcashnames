import "server-only";

import path from "node:path";
import { promises as fs } from "node:fs";
import { type BlogSeriesSlug, BLOG_SERIES } from "@/lib/blog-series";

const BLOGS_CONTENT_ROOT = path.join(process.cwd(), "content", "blogs");

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

export async function listRecentBlogPosts(series: BlogSeriesSlug, limit = 5): Promise<Array<{
  slug: string;
  title: string;
  href: string;
  publishedLabel: string;
}>> {
  const dir = path.join(BLOGS_CONTENT_ROOT, series);
  const entries = await fs.readdir(dir, { withFileTypes: true });

  const posts = await Promise.all(
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
          modifiedAt: stat.mtimeMs,
        };
      }),
  );

  return posts
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, limit)
    .map(({ slug, title, href, modifiedAt }) => ({
      slug,
      title,
      href,
      publishedLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(modifiedAt)),
    }));
}

export async function listRecentBlogPostsAcrossAllSeries(limit = 8): Promise<Array<{
  slug: string;
  title: string;
  href: string;
  publishedLabel: string;
}>> {
  const postsBySeries = await Promise.all(
    BLOG_SERIES.map(async (series) => {
      const dir = path.join(BLOGS_CONTENT_ROOT, series);
      const entries = await fs.readdir(dir, { withFileTypes: true });

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
              modifiedAt: stat.mtimeMs,
            };
          }),
      );
    }),
  );

  return postsBySeries
    .flat()
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, limit)
    .map(({ slug, title, href, modifiedAt }) => ({
      slug,
      title,
      href,
      publishedLabel: new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(modifiedAt)),
    }));
}
