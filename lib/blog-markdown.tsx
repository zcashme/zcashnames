import path from "node:path";
import { promises as fs } from "node:fs";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BLOGS_CONTENT_ROOT = path.join(process.cwd(), "content", "blogs");

export type BlogHeading = {
  id: string;
  label: string;
  depth: number;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`"'.,!?()[\]{}:;/\\]+/g, "")
    .replace(/\s+/g, "-");
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseHeadings(markdown: string): BlogHeading[] {
  const lines = markdown.split(/\r?\n/);
  const seen = new Map<string, number>();
  const headings: BlogHeading[] = [];

  for (const line of lines) {
    const match = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const depth = match[1]?.length ?? 2;
    const label = stripInlineMarkdown(match[2] ?? "");
    if (!label) continue;
    const baseId = slugify(label);
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    headings.push({
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      label,
      depth,
    });
  }

  return headings;
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
    if (/^[-*]\s+/.test(line)) continue;
    paragraphs.push(line);
  }

  const text = stripInlineMarkdown(paragraphs.join(" "));
  return text || undefined;
}

function titleFromMarkdown(markdown: string, fallback: string): string {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  return stripInlineMarkdown(match?.[1] ?? "") || fallback;
}

async function readBlogFile(parts: string[]): Promise<string> {
  const filePath = path.join(BLOGS_CONTENT_ROOT, ...parts);
  return fs.readFile(filePath, "utf8");
}

export async function loadBlogMarkdown(parts: string[], fallbackTitle: string): Promise<{
  markdown: string;
  title: string;
  description?: string;
  toc: BlogHeading[];
}> {
  const markdown = await readBlogFile(parts);
  return {
    markdown,
    title: titleFromMarkdown(markdown, fallbackTitle),
    description: firstParagraph(markdown),
    toc: parseHeadings(markdown),
  };
}

export function blogMarkdownMetadata(title: string, description?: string): Metadata {
  return {
    title: `${title} | ZcashNames`,
    description,
  };
}

export function renderBlogMarkdown(markdown: string) {
  const seen = new Map<string, number>();

  function headingId(text: string): string {
    const baseId = slugify(text);
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    return count === 0 ? baseId : `${baseId}-${count + 1}`;
  }

  function textFromChildren(children: ReactNode): string {
    return Array.isArray(children)
      ? children.map((child) => textFromChildren(child)).join("")
      : typeof children === "string" || typeof children === "number"
        ? String(children)
        : "";
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1() {
          return null;
        },
        h2({ children }) {
          const text = textFromChildren(children);
          return <h2 id={headingId(text)}>{children}</h2>;
        },
        h3({ children }) {
          const text = textFromChildren(children);
          return <h3 id={headingId(text)}>{children}</h3>;
        },
        h4({ children }) {
          const text = textFromChildren(children);
          return <h4 id={headingId(text)}>{children}</h4>;
        },
        h5({ children }) {
          const text = textFromChildren(children);
          return <h5 id={headingId(text)}>{children}</h5>;
        },
        h6({ children }) {
          const text = textFromChildren(children);
          return <h6 id={headingId(text)}>{children}</h6>;
        },
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
