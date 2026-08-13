export type BlogVisibilityFilter = {
  startDateInclusive?: string;
  endDateExclusive?: string | null;
  hideFutureDated?: boolean;
};

// Central list visibility policy for public blog surfaces.
export const BLOG_LIST_VISIBILITY: BlogVisibilityFilter = {
  startDateInclusive: "2026-08-01",
  hideFutureDated: true,
};

export function isValidIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestampMs = Date.parse(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(timestampMs)) return false;
  return new Date(timestampMs).toISOString().slice(0, 10) === value;
}

export function getCurrentUtcDateString(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function isBlogPostDateVisible(
  publishedDate: string | null | undefined,
  visibility: BlogVisibilityFilter = BLOG_LIST_VISIBILITY,
  nowMs = Date.now(),
): boolean {
  if (!publishedDate || !isValidIsoDateString(publishedDate)) return false;

  if (visibility.startDateInclusive && publishedDate < visibility.startDateInclusive) {
    return false;
  }

  if (visibility.endDateExclusive && publishedDate >= visibility.endDateExclusive) {
    return false;
  }

  if (visibility.hideFutureDated && publishedDate > getCurrentUtcDateString(nowMs)) {
    return false;
  }

  return true;
}

export function filterVisibleBlogPosts<T extends { frontmatterDate: string | null }>(
  posts: T[],
  visibility: BlogVisibilityFilter = BLOG_LIST_VISIBILITY,
  nowMs = Date.now(),
): T[] {
  return posts.filter((post) => isBlogPostDateVisible(post.frontmatterDate, visibility, nowMs));
}
