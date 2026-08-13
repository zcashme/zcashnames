export const NAVIGATION_PROGRESS_START_EVENT = "zcashnames:navigation-progress-start";

/** Pathname + search, hash ignored. Used to start/finish the header fill. */
export function getLocationKey(pathname: string, search = ""): string {
  const normalizedSearch = !search || search === "?"
    ? ""
    : search.startsWith("?")
      ? search
      : `?${search}`;
  return `${pathname}${normalizedSearch}`;
}

export function locationKeyFromHref(
  href: string | URL,
  base = typeof window !== "undefined" ? window.location.href : "http://localhost/",
): string | null {
  try {
    const url = href instanceof URL ? href : new URL(String(href), base);
    if (typeof window !== "undefined" && url.origin !== window.location.origin) {
      return null;
    }
    return getLocationKey(url.pathname, url.search);
  } catch {
    return null;
  }
}

export function locationKeyFromWindow(): string {
  return getLocationKey(window.location.pathname, window.location.search);
}

export function shouldStartNavigationProgress(href: string | URL): boolean {
  if (typeof window === "undefined") return false;
  const nextKey = locationKeyFromHref(href);
  if (!nextKey) return false;
  return nextKey !== locationKeyFromWindow();
}

/** Fire when a client navigation starts outside normal link/history hooks. */
export function emitNavigationProgressStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_START_EVENT));
}

export function emitNavigationProgressStartForHref(href: string | URL): void {
  if (shouldStartNavigationProgress(href)) {
    emitNavigationProgressStart();
  }
}
