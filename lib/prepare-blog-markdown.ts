import {
  WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL,
  WAITLIST_VIEW_EARLY_ACCESS_LABEL,
} from "./waitlist/early-access";
import {
  RESERVED_DIRECT_REFERRAL_SPOT_PHRASE,
  RESERVED_INDIRECT_REFERRAL_SPOT_PHRASE,
} from "./waitlist/referral-spots";

/**
 * Tokens blog markdown can use so dates and waitlist referral thresholds stay tied to shared constants.
 * Supports both:
 * - `{{EARLY_ACCESS_LABEL}}` (mustache-style; not valid alone under Nextra MDX)
 * - `{WAITLIST_VIEW_EARLY_ACCESS_LABEL}` (MDX expression after import — dual-rendered posts)
 */
const BLOG_MARKDOWN_TOKENS: Record<string, string> = {
  EARLY_ACCESS_LABEL: WAITLIST_VIEW_EARLY_ACCESS_LABEL,
  EARLY_ACCESS_DATE_LABEL: WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL,
  WAITLIST_VIEW_EARLY_ACCESS_LABEL,
  WAITLIST_VIEW_EARLY_ACCESS_DATE_LABEL,
  RESERVED_DIRECT_REFERRAL_SPOT_PHRASE,
  RESERVED_INDIRECT_REFERRAL_SPOT_PHRASE,
};

function stripYamlFrontmatter(markdown: string): string {
  // Drop leading `--- ... ---` so publication metadata never renders as body content.
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

/**
 * Site blogs are rendered as Markdown, not compiled MDX.
 * A line-only `/^import ...$/` regex misses multiline named imports and leaves
 * remnants like `RESERVED_DIRECT_REFERRAL_SPOT_PHRASE, } from "..."` in the body.
 */
function stripMdxImports(markdown: string): string {
  return markdown.replace(
    /^import(?:\s+type)?\s+(?:[\s\S]*?)\s+from\s+["'][^"']+["']\s*;?[ \t]*(?:\r?\n|$)/gm,
    "",
  );
}

export function prepareBlogMarkdown(markdown: string): string {
  const withoutFrontmatter = stripYamlFrontmatter(markdown);
  const withoutImports = stripMdxImports(withoutFrontmatter).replace(/^\s*\r?\n+/, "");

  // `{{TOKEN}}` mustache form
  const withMustache = withoutImports.replace(
    /\{\{\s*([A-Z0-9_]+)\s*\}\}/g,
    (match, key: string) =>
      Object.prototype.hasOwnProperty.call(BLOG_MARKDOWN_TOKENS, key)
        ? BLOG_MARKDOWN_TOKENS[key]
        : match,
  );

  // `{CONST}` form used when the same file is dual-rendered via Nextra MDX
  return withMustache.replace(
    /\{([A-Z][A-Z0-9_]*)\}/g,
    (match, key: string) =>
      Object.prototype.hasOwnProperty.call(BLOG_MARKDOWN_TOKENS, key)
        ? BLOG_MARKDOWN_TOKENS[key]
        : match,
  );
}
