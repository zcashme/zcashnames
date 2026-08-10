/**
 * Previously portaled "/ {page name}" into the site header.
 * The header is now chrome-only (menu, brand, toggles) with no page titles.
 * Kept as a no-op so existing page imports remain valid.
 */
export default function SiteRouteTitle(_props: { title: string; href?: string }) {
  return null;
}
