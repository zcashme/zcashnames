// Structured output of the share kit markdown parser.
// Sections group shareable draft posts by topic/category.

export type ShareKitDraft = {
  id: string;
  label: string;
  post: string;
};

export type ShareKitSection = {
  id: string;
  title: string;
  description: string;
  drafts: ShareKitDraft[];
};

import { slugify } from "@/lib/url";

function normalizeLineEndings(markdown: string): string {
  return markdown.replace(/\r\n?/g, "\n");
}

function isRule(line: string): boolean {
  return /^\s*---+\s*$/.test(line);
}

// Generates a collision-resistant ID from a slug base, appending a counter suffix on duplicates.
function createUniqueId(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

// Parses share kit markdown into structured sections and drafts.
// Expected format: `# Section Title` headings with description paragraphs, each containing `## Draft Label` posts.
// IDs are derived from slugified headings with collision counters for duplicate titles.
// Throws if a section lacks a description or has zero drafts.
export function parseShareKitMarkdown(markdown: string): ShareKitSection[] {
  const lines = normalizeLineEndings(markdown).split("\n");
  const sections: ShareKitSection[] = [];
  const sectionIds = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const currentLine = lines[index].trim();

    if (!currentLine || isRule(currentLine)) {
      index += 1;
      continue;
    }

    const sectionMatch = currentLine.match(/^#\s+(.+)$/);
    if (!sectionMatch) {
      index += 1;
      continue;
    }

    const title = sectionMatch[1].trim();
    index += 1;

    while (index < lines.length && !lines[index].trim()) index += 1;

    const descriptionLines: string[] = [];
    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();
      if (!trimmed) {
        if (descriptionLines.length > 0) break;
        index += 1;
        continue;
      }
      if (/^##\s+/.test(trimmed) || /^#\s+/.test(trimmed) || isRule(trimmed)) break;

      descriptionLines.push(line);
      index += 1;
    }

    const description = descriptionLines.join("\n").trim();
    const drafts: ShareKitDraft[] = [];
    const draftIds = new Map<string, number>();
    const sectionSlug = slugify(title);

    while (index < lines.length) {
      const trimmed = lines[index].trim();

      if (!trimmed || isRule(trimmed)) {
        index += 1;
        continue;
      }

      if (/^#\s+/.test(trimmed)) break;

      const draftMatch = trimmed.match(/^##\s+(.+)$/);
      if (!draftMatch) {
        index += 1;
        continue;
      }

      const label = draftMatch[1].trim();
      index += 1;

      while (index < lines.length && !lines[index].trim()) index += 1;

      const postLines: string[] = [];
      while (index < lines.length) {
        const line = lines[index];
        const nextTrimmed = line.trim();
        if (/^##\s+/.test(nextTrimmed) || /^#\s+/.test(nextTrimmed)) break;
        if (isRule(nextTrimmed)) {
          index += 1;
          break;
        }

        postLines.push(line);
        index += 1;
      }

      const post = postLines.join("\n").trim();
      if (!post) continue;

      drafts.push({
        id: createUniqueId(`${sectionSlug}-${slugify(label)}`, draftIds),
        label,
        post,
      });
    }

    if (!description) {
      throw new Error(`Share Kit section "${title}" is missing a description paragraph.`);
    }

    if (drafts.length === 0) {
      throw new Error(`Share Kit section "${title}" has no drafts.`);
    }

    sections.push({
      id: createUniqueId(slugify(title), sectionIds),
      title,
      description,
      drafts,
    });
  }

  return sections;
}
