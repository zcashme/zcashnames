import "server-only";

import { cache } from "react";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { resolveSiteUrl } from "@/lib/site-url";

export type CareerJobStatus = "draft" | "open" | "closed";
export type CareerApplicationMode = "native" | "external";
export type CareerEngagement = "Full-time" | "Part-time" | "Contract" | "Fractional";

export interface CareerScreeningQuestion {
  id: string;
  prompt: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}

export interface CareerJob {
  slug: string;
  title: string;
  team: string;
  employmentType: CareerEngagement;
  location: string;
  compensation?: string | null;
  status: CareerJobStatus;
  summary: string;
  descriptionMarkdown: string;
  applicationMode: CareerApplicationMode;
  jobUrl: string;
  applicationUrl: string;
  postedAt: string;
  updatedAt: string;
  screeningQuestions: CareerScreeningQuestion[];
}

type FrontmatterScalar = string | number | boolean | null;
type FrontmatterObject = Record<string, FrontmatterScalar>;
type FrontmatterValue = FrontmatterScalar | FrontmatterObject[];

type ParsedContentFile = {
  frontmatter: Record<string, FrontmatterValue>;
  body: string;
};

const SITE_URL = resolveSiteUrl();
const CAREERS_DIR = path.join(process.cwd(), "content", "careers");

function buildJobUrl(slug: string): string {
  return `${SITE_URL}/careers/${slug}`;
}

function buildApplicationUrl(slug: string): string {
  return `${SITE_URL}/careers/${slug}/apply`;
}

function slugifyCareerTitle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`"'.,!?()[\]{}:;/\\]+/g, "")
    .replace(/\s+/g, "-");
}

function isCareerJobStatus(value: unknown): value is CareerJobStatus {
  return value === "draft" || value === "open" || value === "closed";
}

function isCareerApplicationMode(value: unknown): value is CareerApplicationMode {
  return value === "native" || value === "external";
}

function normalizeEngagement(value: string): CareerEngagement {
  const normalized = value.trim().toLowerCase();

  if (normalized === "full-time" || normalized === "full time") return "Full-time";
  if (normalized === "part-time" || normalized === "part time") return "Part-time";
  if (normalized === "fractional") return "Fractional";
  return "Contract";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(raw: string): FrontmatterScalar {
  const value = stripWrappingQuotes(raw);

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function parseObjectField(raw: string): { key: string; value: FrontmatterScalar } | null {
  const match = raw.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
  if (!match) return null;
  return {
    key: match[1],
    value: parseScalar(match[2]),
  };
}

function parseObjectList(lines: string[], startIndex: number, baseIndent: number): [FrontmatterObject[], number] {
  const items: FrontmatterObject[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const indent = getIndent(line);
    if (indent < baseIndent) break;

    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) break;

    const item: FrontmatterObject = {};
    const firstField = parseObjectField(trimmed.slice(2));
    if (firstField) {
      item[firstField.key] = firstField.value;
    }
    index += 1;

    while (index < lines.length) {
      const childLine = lines[index];
      if (!childLine.trim()) {
        index += 1;
        continue;
      }

      const childIndent = getIndent(childLine);
      if (childIndent <= indent) break;

      const childField = parseObjectField(childLine.trim());
      if (childField) {
        item[childField.key] = childField.value;
      }
      index += 1;
    }

    items.push(item);
  }

  return [items, index];
}

function parseFrontmatter(source: string): ParsedContentFile {
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) {
    return { frontmatter: {}, body: source.trim() };
  }

  const lines = source.split(/\r?\n/);
  if (lines[0].trim() !== "---") {
    return { frontmatter: {}, body: source.trim() };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingIndex === -1) {
    return { frontmatter: {}, body: source.trim() };
  }

  const frontmatterLines = lines.slice(1, closingIndex);
  const body = lines.slice(closingIndex + 1).join("\n").trim();
  const frontmatter: Record<string, FrontmatterValue> = {};

  let index = 0;
  while (index < frontmatterLines.length) {
    const line = frontmatterLines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const match = trimmed.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      index += 1;
      continue;
    }

    const key = match[1];
    const rawValue = match[2];

    if (rawValue) {
      frontmatter[key] = parseScalar(rawValue);
      index += 1;
      continue;
    }

    const nextLine = frontmatterLines[index + 1];
    if (nextLine && nextLine.trim().startsWith("- ")) {
      const [items, nextIndex] = parseObjectList(frontmatterLines, index + 1, getIndent(nextLine));
      frontmatter[key] = items;
      index = nextIndex;
      continue;
    }

    frontmatter[key] = "";
    index += 1;
  }

  return { frontmatter, body };
}

function normalizeQuestion(value: unknown): CareerScreeningQuestion | null {
  if (!isObject(value)) return null;
  const id = typeof value.id === "string" ? value.id.trim() : "";
  const prompt = typeof value.prompt === "string" ? value.prompt.trim() : "";

  if (!id || !prompt) return null;

  return {
    id,
    prompt,
    placeholder: typeof value.placeholder === "string" ? value.placeholder.trim() : undefined,
    required: value.required === true,
    maxLength:
      typeof value.maxLength === "number" && Number.isFinite(value.maxLength)
        ? Math.max(1, Math.floor(value.maxLength))
        : undefined,
  };
}

function normalizeQuestions(value: unknown): CareerScreeningQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeQuestion).filter((question): question is CareerScreeningQuestion => Boolean(question));
}

function toIsoDate(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return new Date().toISOString();
}

function normalizeCareerJob(fileName: string, parsed: ParsedContentFile): CareerJob | null {
  const { frontmatter, body } = parsed;
  const title = typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";
  const team = typeof frontmatter.team === "string" ? frontmatter.team.trim() : "";
  const employmentTypeRaw =
    typeof frontmatter.employmentType === "string" ? frontmatter.employmentType.trim() : "";
  const location = typeof frontmatter.location === "string" ? frontmatter.location.trim() : "";
  const summary = typeof frontmatter.summary === "string" ? frontmatter.summary.trim() : "";

  if (!title || !team || !employmentTypeRaw || !location || !summary || !body) {
    console.error(`[careers] invalid career content in ${fileName}`);
    return null;
  }

  const slug = slugifyCareerTitle(title);
  if (!slug) {
    console.error(`[careers] empty slug derived from title in ${fileName}`);
    return null;
  }

  const status = isCareerJobStatus(frontmatter.status) ? frontmatter.status : "draft";
  const applicationMode = isCareerApplicationMode(frontmatter.applicationMode)
    ? frontmatter.applicationMode
    : "native";

  return {
    slug,
    title,
    team,
    employmentType: normalizeEngagement(employmentTypeRaw),
    location,
    compensation: typeof frontmatter.compensation === "string" ? frontmatter.compensation.trim() : null,
    status,
    summary,
    descriptionMarkdown: body,
    applicationMode,
    jobUrl: buildJobUrl(slug),
    applicationUrl: buildApplicationUrl(slug),
    postedAt: toIsoDate(frontmatter.postedAt),
    updatedAt: toIsoDate(frontmatter.updatedAt),
    screeningQuestions: normalizeQuestions(frontmatter.screeningQuestions),
  };
}

async function readCareerContentFiles(): Promise<CareerJob[]> {
  const entries = await readdir(CAREERS_DIR, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".mdx")))
    .map((entry) => entry.name);

  const jobs = await Promise.all(
    fileNames.map(async (fileName) => {
      const source = await readFile(path.join(CAREERS_DIR, fileName), "utf8");
      return normalizeCareerJob(fileName, parseFrontmatter(source));
    }),
  );

  return jobs
    .filter((job): job is CareerJob => Boolean(job))
    .sort((left, right) => right.postedAt.localeCompare(left.postedAt));
}

export const listCareerJobs = cache(async (): Promise<CareerJob[]> => {
  try {
    return await readCareerContentFiles();
  } catch (error) {
    console.error("[careers] failed to read repo career content:", error);
    return [];
  }
});

export async function listOpenCareerJobs(): Promise<CareerJob[]> {
  const jobs = await listCareerJobs();
  return jobs.filter((job) => job.status === "open");
}

export async function getCareerJobBySlug(slug: string): Promise<CareerJob | null> {
  const jobs = await listCareerJobs();
  return jobs.find((job) => job.slug === slug) ?? null;
}

export async function getOpenCareerJobBySlug(slug: string): Promise<CareerJob | null> {
  const job = await getCareerJobBySlug(slug);
  if (!job || job.status !== "open") return null;
  return job;
}
