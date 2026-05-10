// Converts arbitrary text into a URL-safe kebab-case slug.
// Used by sharekit and roadmap parsers to generate stable unique IDs from headings.
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

// Strips a trailing slash so concatenated path segments don't produce double slashes.
export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}
