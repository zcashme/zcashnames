export const NAVIGATION_PROGRESS_START_EVENT = "zcashnames:navigation-progress-start";

/** Fire when a client navigation starts outside normal link/history hooks. */
export function emitNavigationProgressStart(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NAVIGATION_PROGRESS_START_EVENT));
}
