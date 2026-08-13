import "server-only";

import { execFile } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import {
  BLOG_LIST_VISIBILITY,
  filterVisibleBlogPosts,
  isValidIsoDateString,
  type BlogVisibilityFilter,
} from "@/lib/blog-visibility";
import {
  type BlogSeriesSlug,
  BLOG_SERIES,
  getBlogSeries,
} from "@/lib/blog-series";

const execFileAsync = promisify(execFile);
const BLOGS_CONTENT_ROOT = path.join(process.cwd(), "content", "blogs");

export type BlogPostSummary = {
  slug: string;
  title: string;
  href: string;
  series: BlogSeriesSlug;
  seriesLabel: string;
  /** Omitted only when frontmatter date and git history are both unavailable. */
  publishedLabel?: string;
  excerpt?: string;
};

export type BlogListOptions = {
  limit?: number;
  visibility?: BlogVisibilityFilter;
};

type InternalBlogPostSummary = BlogPostSummary & {
  frontmatterDate: string | null;
  modifiedAt: number;
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
    if (/^---$/.test(line)) continue;
    if (/^[a-zA-Z0-9_-]+:\s*/.test(line) && paragraphs.length === 0) continue;
    paragraphs.push(line);
  }

  const text = stripInlineMarkdown(paragraphs.join(" "));
  if (!text) return undefined;
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}…` : text;
}

function frontmatterDateFromMarkdown(markdown: string): string | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!match) return null;
  const dateLine = /^date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?\s*$/m.exec(match[1] ?? "");
  const value = dateLine?.[1];
  if (!value || !isValidIsoDateString(value)) return null;
  return value;
}

/**
 * Optional YAML frontmatter date, e.g.
 * ---
 * date: 2026-08-08
 * ---
 */
function dateFromFrontmatter(markdown: string): number | null {
  const value = frontmatterDateFromMarkdown(markdown);
  if (!value) return null;
  const ms = Date.parse(`${value}T12:00:00.000Z`);
  return Number.isFinite(ms) ? ms : null;
}

function formatPublishedLabel(timestampMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestampMs));
}

/**
 * Publication time for a post.
 *
 * Order of preference:
 * 1. Frontmatter `date` (authoritative; works in every environment)
 * 2. Git history (local/dev convenience when frontmatter is missing)
 *
 * Never use filesystem mtime. Vercel/serverless checkouts stamp artificial
 * mtimes (often the same bogus date for every file), and the marketing site
 * layout is dynamic (`cookies()`), so dates resolve at request time without
 * a usable `.git` directory — mtime was the production bug.
 *
 * Returns null when no reliable source exists so callers can omit the label
 * rather than invent a wrong date.
 */
async function resolvePostTimestampMs(
  filePath: string,
  markdown: string,
): Promise<number | null> {
  const fromFrontmatter = dateFromFrontmatter(markdown);
  if (fromFrontmatter != null) return fromFrontmatter;

  return getGitFileTimestampMs(filePath);
}

async function getGitFileTimestampMs(filePath: string): Promise<number | null> {
  const relativePath = path.relative(process.cwd(), filePath).split(path.sep).join("/");

  try {
    // Oldest commit that added the path = publication time.
    // git log is newest-first; take the last %ct line when following history.
    const { stdout: addedStdout } = await execFileAsync(
      "git",
      ["log", "--diff-filter=A", "--follow", "--format=%ct", "--", relativePath],
      { cwd: process.cwd(), windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const addedLines = addedStdout
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (addedLines.length > 0) {
      const oldestSec = Number(addedLines[addedLines.length - 1]);
      if (Number.isFinite(oldestSec) && oldestSec > 0) return oldestSec * 1000;
    }

    // Fallback: most recent commit that touched the file.
    const { stdout: recentStdout } = await execFileAsync(
      "git",
      ["log", "-1", "--format=%ct", "--", relativePath],
      { cwd: process.cwd(), windowsHide: true, maxBuffer: 1024 * 1024 },
    );
    const recentSec = Number(recentStdout.trim());
    if (Number.isFinite(recentSec) && recentSec > 0) return recentSec * 1000;
  } catch {
    // No git binary, shallow history without the path, or not a git checkout.
  }

  return null;
}

async function readSeriesPosts(
  series: BlogSeriesSlug,
): Promise<InternalBlogPostSummary[]> {
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
          const markdown = await fs.readFile(filePath, "utf8");
          const frontmatterDate = frontmatterDateFromMarkdown(markdown);
          const timestampMs = await resolvePostTimestampMs(filePath, markdown);
          // Sort key: real publish time when known; unknown dates sink to the bottom.
          const modifiedAt = timestampMs ?? 0;

          return {
            slug,
            title: titleFromMarkdown(markdown, slug),
            href: `/blogs/${series}/${slug}`,
            series,
            seriesLabel: seriesMeta.label,
            excerpt: firstParagraph(markdown),
            frontmatterDate,
            modifiedAt,
            publishedLabel:
              timestampMs != null ? formatPublishedLabel(timestampMs) : undefined,
          };
        }),
    );
  } catch {
    return [];
  }
}

function finalizeBlogPosts(
  posts: InternalBlogPostSummary[],
  { limit, visibility = BLOG_LIST_VISIBILITY }: BlogListOptions = {},
): BlogPostSummary[] {
  const visiblePosts = filterVisibleBlogPosts(posts, visibility);
  const sorted = visiblePosts.sort((a, b) => b.modifiedAt - a.modifiedAt);
  const sliced = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  return sliced.map(({ frontmatterDate: _frontmatterDate, modifiedAt: _modifiedAt, ...post }) => post);
}

export async function listBlogPosts(
  series: BlogSeriesSlug,
  options: BlogListOptions = {},
): Promise<BlogPostSummary[]> {
  const posts = await readSeriesPosts(series);
  return finalizeBlogPosts(posts, options);
}

export async function listRecentBlogPosts(
  series: BlogSeriesSlug,
  options: BlogListOptions = {},
): Promise<BlogPostSummary[]> {
  return listBlogPosts(series, {
    ...options,
    limit: options.limit ?? 5,
  });
}

export async function listAllBlogPosts(options: BlogListOptions = {}): Promise<BlogPostSummary[]> {
  const postsBySeries = await Promise.all(BLOG_SERIES.map((series) => readSeriesPosts(series)));
  return finalizeBlogPosts(postsBySeries.flat(), options);
}

export async function listLandingBlogPosts(options: BlogListOptions = {}): Promise<BlogPostSummary[]> {
  return listAllBlogPosts({
    ...options,
    limit: options.limit ?? 4,
  });
}

export async function listRecentBlogPostsAcrossAllSeries(
  options: BlogListOptions = {},
): Promise<BlogPostSummary[]> {
  return listAllBlogPosts({
    ...options,
    limit: options.limit ?? 8,
  });
}

export async function getBlogPostMeta(
  series: BlogSeriesSlug,
  postSlug: string,
): Promise<{ publishedLabel?: string } | null> {
  try {
    const filePath = path.join(BLOGS_CONTENT_ROOT, series, `${postSlug}.mdx`);
    const markdown = await fs.readFile(filePath, "utf8");
    const timestampMs = await resolvePostTimestampMs(filePath, markdown);
    return {
      publishedLabel:
        timestampMs != null ? formatPublishedLabel(timestampMs) : undefined,
    };
  } catch {
    return null;
  }
}
