import { expect, test } from "@playwright/test";
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  BLOG_LIST_VISIBILITY,
  isBlogPostDateVisible,
  isValidIsoDateString,
} from "../lib/blog-visibility";
import { prepareBlogMarkdown } from "../lib/prepare-blog-markdown";

const FIXED_NOW_MS = Date.parse("2026-08-13T12:00:00.000Z");
const BLOGS_CONTENT_ROOT = path.join(process.cwd(), "content", "blogs");

async function collectBlogPostFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectBlogPostFiles(fullPath);
      if (entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "index.mdx") {
        return [fullPath];
      }
      return [];
    }),
  );

  return files.flat();
}

test("default blog visibility stays open-ended from August 1, 2026 and hides future dates", () => {
  expect(BLOG_LIST_VISIBILITY.startDateInclusive).toBe("2026-08-01");
  expect(BLOG_LIST_VISIBILITY.endDateExclusive).toBeUndefined();
  expect(BLOG_LIST_VISIBILITY.hideFutureDated).toBe(true);

  expect(isBlogPostDateVisible("2026-06-14", BLOG_LIST_VISIBILITY, FIXED_NOW_MS)).toBe(false);
  expect(isBlogPostDateVisible("2026-07-31", BLOG_LIST_VISIBILITY, FIXED_NOW_MS)).toBe(false);
  expect(isBlogPostDateVisible("2026-08-01", BLOG_LIST_VISIBILITY, FIXED_NOW_MS)).toBe(true);
  expect(isBlogPostDateVisible("2026-08-10", BLOG_LIST_VISIBILITY, FIXED_NOW_MS)).toBe(true);
  expect(isBlogPostDateVisible("2026-08-14", BLOG_LIST_VISIBILITY, FIXED_NOW_MS)).toBe(false);
  expect(isBlogPostDateVisible("2026-09-01", BLOG_LIST_VISIBILITY, FIXED_NOW_MS)).toBe(false);
  expect(
    isBlogPostDateVisible(
      "2026-08-15",
      {
        startDateInclusive: "2026-08-01",
        endDateExclusive: "2026-08-16",
        hideFutureDated: false,
      },
      FIXED_NOW_MS,
    ),
  ).toBe(true);
  expect(
    isBlogPostDateVisible(
      "2026-08-16",
      {
        startDateInclusive: "2026-08-01",
        endDateExclusive: "2026-08-16",
        hideFutureDated: false,
      },
      FIXED_NOW_MS,
    ),
  ).toBe(false);
});

test("every blog post file has a valid frontmatter date", async () => {
  const files = await collectBlogPostFiles(BLOGS_CONTENT_ROOT);
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const markdown = await fs.readFile(file, "utf8");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
    expect(frontmatter, `${file} is missing frontmatter`).toBeTruthy();
    const dateLine = /^date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?\s*$/m.exec(frontmatter?.[1] ?? "");
    expect(dateLine?.[1], `${file} is missing a valid date field`).toBeTruthy();
    expect(isValidIsoDateString(dateLine?.[1] ?? ""), `${file} has an invalid date value`).toBe(true);
  }
});

test("current blog content resolves to the expected visible August set", async () => {
  const files = await collectBlogPostFiles(BLOGS_CONTENT_ROOT);
  const visibleSlugs: string[] = [];
  const hiddenSlugs: string[] = [];

  for (const file of files) {
    const markdown = await fs.readFile(file, "utf8");
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
    const dateLine = /^date:\s*['"]?(\d{4}-\d{2}-\d{2})['"]?\s*$/m.exec(frontmatter?.[1] ?? "");
    const slug = path.basename(file, ".mdx");

    if (isBlogPostDateVisible(dateLine?.[1], BLOG_LIST_VISIBILITY, FIXED_NOW_MS)) {
      visibleSlugs.push(slug);
    } else {
      hiddenSlugs.push(slug);
    }
  }

  expect(hiddenSlugs).toEqual(
    expect.arrayContaining([
      "community-signal-checkpoint",
      "mainnet-beta-roundup",
      "wallet-briefs-and-feedback",
      "public-launch-readiness",
      "pricing-context",
      "release-sequence-notes",
    ]),
  );
  expect(visibleSlugs).toEqual(
    expect.arrayContaining([
      "early-access",
      "how-protected-names-work",
      "how-name-actions-work",
    ]),
  );
});

test("early-access markdown does not leak MDX import remnants", async () => {
  const markdown = await fs.readFile(
    path.join(BLOGS_CONTENT_ROOT, "users", "early-access.mdx"),
    "utf8",
  );
  const prepared = prepareBlogMarkdown(markdown);

  expect(prepared).not.toMatch(/from\s+["']@\/lib\/waitlist/);
  expect(prepared).not.toContain("RESERVED_DIRECT_REFERRAL_SPOT_PHRASE");
  expect(prepared).not.toContain("RESERVED_INDIRECT_REFERRAL_SPOT_PHRASE");
  expect(prepared).not.toContain("WAITLIST_VIEW_EARLY_ACCESS_LABEL");
  expect(prepared).toContain("September 15, 2026 at 12:00 PM Eastern");
  expect(prepared).toContain("each direct reserved referral");
  expect(prepared).toContain("every 3 indirect reserved referrals");
  expect(prepared.trimStart().startsWith("# Early Access")).toBe(true);
});
