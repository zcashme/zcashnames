import { randomUUID } from "crypto";
import type { EvidenceInput, EvidenceItem } from "@/lib/protected-names/types";

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Stable-ish id for legacy URL-only evidence entries (not cryptographically unique). */
function legacyIdForUrl(url: string): string {
  // Prefer a readable deterministic placeholder; new admin writes use real UUIDs.
  let hash = 0;
  for (let i = 0; i < url.length; i += 1) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `legacy-${hex}-${url.length.toString(16)}`;
}

export function normalizeEvidenceItem(value: unknown): EvidenceItem | null {
  if (typeof value === "string") {
    const url = value.trim();
    if (!url) return null;
    return {
      id: legacyIdForUrl(url),
      title: url,
      url,
      publisher: null,
      sourceType: null,
      summary: null,
      publishedAt: null,
      retrievedAt: null,
    };
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const url = asTrimmedString(record.url);
  const title = asTrimmedString(record.title) ?? url;
  if (!url || !title) return null;

  return {
    id: asTrimmedString(record.id) ?? legacyIdForUrl(url),
    title,
    url,
    publisher: asTrimmedString(record.publisher),
    sourceType: asTrimmedString(record.sourceType),
    summary: asTrimmedString(record.summary),
    publishedAt: asTrimmedString(record.publishedAt),
    retrievedAt: asTrimmedString(record.retrievedAt),
  };
}

export function normalizeEvidenceArray(value: unknown): EvidenceItem[] {
  if (!Array.isArray(value)) return [];
  const items: EvidenceItem[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    const item = normalizeEvidenceItem(entry);
    if (!item) continue;
    if (seen.has(item.id)) {
      item.id = randomUUID();
    }
    seen.add(item.id);
    items.push(item);
  }

  return items;
}

export function validateEvidenceInput(input: EvidenceInput): {
  item: EvidenceInput;
  error: string | null;
} {
  const title = input.title.trim();
  const url = input.url.trim();
  const publisher = input.publisher?.trim() || null;
  const sourceType = input.sourceType?.trim() || null;
  const summary = input.summary?.trim() || null;
  const publishedAt = input.publishedAt?.trim() || null;
  const retrievedAt = input.retrievedAt?.trim() || null;

  if (!title) {
    return {
      item: { title, url, publisher, sourceType, summary, publishedAt, retrievedAt },
      error: "Evidence title must not be blank.",
    };
  }

  if (!url || !isHttpUrl(url)) {
    return {
      item: { title, url, publisher, sourceType, summary, publishedAt, retrievedAt },
      error: "Evidence URL must use http or https.",
    };
  }

  return {
    item: { title, url, publisher, sourceType, summary, publishedAt, retrievedAt },
    error: null,
  };
}

export function evidenceInputToRpcPayload(input: EvidenceInput): Record<string, unknown> {
  return {
    title: input.title.trim(),
    url: input.url.trim(),
    publisher: input.publisher?.trim() || null,
    sourceType: input.sourceType?.trim() || null,
    summary: input.summary?.trim() || null,
    publishedAt: input.publishedAt?.trim() || null,
    retrievedAt: input.retrievedAt?.trim() || null,
  };
}
