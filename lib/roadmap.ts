export type RoadmapPeriod = {
  id: string;
  title: string;
  summary: string;
  startDate: string;
  endDate: string;
  tasks: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeLineEndings(markdown: string): string {
  return markdown.replace(/\r\n?/g, "\n");
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "period";
}

function createUniqueId(base: string, seen: Map<string, number>): string {
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function parseDateField(value: string, field: "Start" | "End", title: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Roadmap period "${title}" has an invalid ${field.toLowerCase()} date: "${value}".`);
  }

  parseIsoDateUtc(trimmed);
  return trimmed;
}

function finalizePeriod(
  sectionIds: Map<string, number>,
  title: string,
  summaryLines: string[],
  startDate: string | null,
  endDate: string | null,
  tasks: string[],
): RoadmapPeriod {
  const summary = summaryLines.join(" ").replace(/\s+/g, " ").trim();
  if (!summary) {
    throw new Error(`Roadmap period "${title}" is missing a summary paragraph.`);
  }
  if (!startDate) {
    throw new Error(`Roadmap period "${title}" is missing a Start date.`);
  }
  if (!endDate) {
    throw new Error(`Roadmap period "${title}" is missing an End date.`);
  }
  if (tasks.length === 0) {
    throw new Error(`Roadmap period "${title}" must include at least one task.`);
  }

  const start = parseIsoDateUtc(startDate);
  const end = parseIsoDateUtc(endDate);
  if (end.getTime() < start.getTime()) {
    throw new Error(`Roadmap period "${title}" has an End date before its Start date.`);
  }

  return {
    id: createUniqueId(slugify(title), sectionIds),
    title,
    summary,
    startDate,
    endDate,
    tasks,
  };
}

export function parseRoadmapMarkdown(markdown: string): RoadmapPeriod[] {
  const lines = normalizeLineEndings(markdown).split("\n");
  const periods: RoadmapPeriod[] = [];
  const sectionIds = new Map<string, number>();
  let index = 0;

  while (index < lines.length) {
    const current = lines[index].trim();
    if (!current) {
      index += 1;
      continue;
    }

    const headingMatch = current.match(/^#\s+(.+)$/);
    if (!headingMatch) {
      index += 1;
      continue;
    }

    const title = headingMatch[1].trim();
    const summaryLines: string[] = [];
    const tasks: string[] = [];
    let startDate: string | null = null;
    let endDate: string | null = null;
    index += 1;

    while (index < lines.length) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        index += 1;
        continue;
      }

      if (/^#\s+/.test(trimmed)) break;

      const startMatch = trimmed.match(/^Start:\s*(.+)$/i);
      if (startMatch) {
        startDate = parseDateField(startMatch[1], "Start", title);
        index += 1;
        continue;
      }

      const endMatch = trimmed.match(/^End:\s*(.+)$/i);
      if (endMatch) {
        endDate = parseDateField(endMatch[1], "End", title);
        index += 1;
        continue;
      }

      const taskMatch = trimmed.match(/^-\s+(.+)$/);
      if (taskMatch) {
        tasks.push(taskMatch[1].trim());
        index += 1;
        continue;
      }

      if (tasks.length > 0) {
        throw new Error(`Roadmap period "${title}" contains unsupported content after its task list.`);
      }

      summaryLines.push(trimmed);
      index += 1;
    }

    periods.push(finalizePeriod(sectionIds, title, summaryLines, startDate, endDate, tasks));
  }

  if (periods.length === 0) {
    throw new Error("Roadmap markdown does not contain any periods.");
  }

  return periods;
}

export function parseIsoDateUtc(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid ISO date: "${value}".`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, monthIndex, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ISO date: "${value}".`);
  }

  return date;
}

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function startOfUtcWeek(date: Date): Date {
  const day = date.getUTCDay();
  const offset = (day + 6) % 7;
  return addUtcDays(date, -offset);
}

export function endOfUtcWeek(date: Date): Date {
  return addUtcDays(startOfUtcWeek(date), 6);
}

export function diffUtcWeeks(start: Date, end: Date): number {
  return Math.floor((startOfUtcWeek(end).getTime() - startOfUtcWeek(start).getTime()) / (7 * DAY_MS));
}
