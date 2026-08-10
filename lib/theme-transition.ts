/**
 * Directional theme transition: full-viewport color sweep + header toggle 3D flip.
 *
 * Uses the View Transitions API when available. Forces `data-theme` on <html>
 * inside the update callback so next-themes' async effect does not leave the
 * "new" snapshot on the old palette. setTheme is wrapped in flushSync so React
 * re-renders (e.g. toggle icon) before the "new" snapshot is taken.
 *
 * Motion language:
 * - light ↔ dark: horizontal sweep + rotateY flip (ltr / rtl)
 * - enter monochrome: top → bottom sweep + rotateX flip (ttb)
 * - leave monochrome: bottom → top sweep + rotateX flip (btt)
 */

import { flushSync } from "react-dom";

export type ThemeName = "dark" | "light" | "monochrome";
export type ThemeDirection = "ltr" | "rtl" | "ttb" | "btt";

type SetTheme = (theme: string) => void;

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void | Promise<void>) => ViewTransition;
};

const DEFAULT_DURATION_MS = 500;
const DEFAULT_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

let isTransitioning = false;
let activeTransition: ViewTransition | null = null;
/** Bumped on each new run / force-skip so aborted transitions do not clear a newer run's lock. */
let transitionGeneration = 0;

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * light → dark: L→R; dark → light: R→L;
 * * → monochrome (triple-tap easter egg): top→bottom;
 * monochrome → *: bottom→top.
 */
export function getThemeDirection(from: ThemeName, to: ThemeName): ThemeDirection | null {
  if (from === to) return null;
  if (to === "monochrome") return "ttb";
  if (from === "monochrome") return "btt";
  if (from === "light" && to === "dark") return "ltr";
  if (from === "dark" && to === "light") return "rtl";
  return null;
}

export function isThemeTransitioning(): boolean {
  return isTransitioning;
}

/** Abort an in-flight View Transition so a higher-priority theme change can run. */
export function skipActiveThemeTransition(): void {
  if (!activeTransition) return;
  try {
    activeTransition.skipTransition();
  } catch {
    // Already finished or unsupported.
  }
  activeTransition = null;
  isTransitioning = false;
  transitionGeneration += 1;
}

export function getThemeMotionTokens(): { durationMs: number; easing: string } {
  if (typeof window === "undefined") {
    return { durationMs: DEFAULT_DURATION_MS, easing: DEFAULT_EASING };
  }

  const styles = getComputedStyle(document.documentElement);
  const durationRaw = styles.getPropertyValue("--theme-transition-duration").trim() || `${DEFAULT_DURATION_MS}ms`;
  const easing = styles.getPropertyValue("--theme-transition-easing").trim() || DEFAULT_EASING;

  let durationMs = DEFAULT_DURATION_MS;
  if (durationRaw.endsWith("ms")) {
    durationMs = Number.parseFloat(durationRaw) || DEFAULT_DURATION_MS;
  } else if (durationRaw.endsWith("s")) {
    durationMs = (Number.parseFloat(durationRaw) || 0.5) * 1000;
  }

  return { durationMs, easing };
}

function applyThemeAttribute(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme);
}

function isVertical(direction: ThemeDirection): boolean {
  return direction === "ttb" || direction === "btt";
}

function clipPathKeyframes(direction: ThemeDirection): string[] {
  // New theme grows from the leading edge across the viewport.
  switch (direction) {
    case "ltr":
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
    case "ttb":
      // Top → bottom: start fully clipped from the bottom edge.
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
    case "btt":
      // Bottom → top: start fully clipped from the top edge.
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
  }
}

function animateRootSweep(direction: ThemeDirection, durationMs: number, easing: string) {
  document.documentElement.animate(
    { clipPath: clipPathKeyframes(direction) },
    {
      duration: durationMs,
      easing,
      fill: "both",
      pseudoElement: "::view-transition-new(root)",
    },
  );
}

/**
 * Directional 3D flip on the named `theme-toggle` view-transition group.
 * Horizontal (ltr/rtl): rotateY. Vertical (ttb/btt): rotateX.
 * Positive out angle / negative in angle for "forward" feel on each axis.
 */
function animateToggleFlip(direction: ThemeDirection, durationMs: number, easing: string) {
  const vertical = isVertical(direction);
  const axis = vertical ? "rotateX" : "rotateY";
  // ltr / ttb: out +90, in from −90; rtl / btt: mirrored
  const forward = direction === "ltr" || direction === "ttb";
  const outDeg = forward ? 90 : -90;
  const inFromDeg = forward ? -90 : 90;

  document.documentElement.animate(
    {
      transform: [
        `perspective(420px) ${axis}(0deg)`,
        `perspective(420px) ${axis}(${outDeg}deg)`,
      ],
      opacity: [1, 0],
    },
    {
      duration: durationMs,
      easing,
      fill: "both",
      pseudoElement: "::view-transition-old(theme-toggle)",
    },
  );

  document.documentElement.animate(
    {
      transform: [
        `perspective(420px) ${axis}(${inFromDeg}deg)`,
        `perspective(420px) ${axis}(0deg)`,
      ],
      opacity: [0, 1],
    },
    {
      duration: durationMs,
      easing,
      fill: "both",
      pseudoElement: "::view-transition-new(theme-toggle)",
    },
  );
}

export type RunThemeTransitionOptions = {
  nextTheme: ThemeName;
  direction: ThemeDirection | null;
  setTheme: SetTheme;
  /**
   * When true, abort any in-flight transition and run this one
   * (used so monochrome easter-egg can preempt a light/dark sweep).
   */
  force?: boolean;
  /** Called when a live CSS fallback flip should start (no View Transitions). */
  onFallbackFlipStart?: (direction: ThemeDirection) => void;
  /** Called when fallback flip should reset after theme is applied. */
  onFallbackFlipEnd?: () => void;
};

/**
 * Apply theme with optional directional viewport sweep + toggle flip.
 * Returns a promise that resolves when the transition finishes (or immediately).
 */
export async function runThemeTransition({
  nextTheme,
  direction,
  setTheme,
  force = false,
  onFallbackFlipStart,
  onFallbackFlipEnd,
}: RunThemeTransitionOptions): Promise<void> {
  if (isTransitioning) {
    if (!force) return;
    skipActiveThemeTransition();
  }

  const apply = () => {
    applyThemeAttribute(nextTheme);
    flushSync(() => {
      setTheme(nextTheme);
    });
  };

  // No direction (same theme) or reduced motion: instant swap.
  if (!direction || prefersReducedMotion()) {
    apply();
    return;
  }

  const doc = document as DocumentWithViewTransition;
  const { durationMs, easing } = getThemeMotionTokens();

  if (!doc.startViewTransition) {
    // CSS 3D flip on the live control + instant theme (no page sweep).
    onFallbackFlipStart?.(direction);
    apply();
    await new Promise<void>((resolve) => {
      window.setTimeout(() => {
        onFallbackFlipEnd?.();
        resolve();
      }, durationMs);
    });
    return;
  }

  const generation = ++transitionGeneration;
  isTransitioning = true;

  try {
    const transition = doc.startViewTransition(() => {
      apply();
    });
    activeTransition = transition;

    await transition.ready;

    // Aborted / superseded while waiting for ready.
    if (generation !== transitionGeneration) return;

    animateRootSweep(direction, durationMs, easing);
    animateToggleFlip(direction, durationMs, easing);

    await transition.finished;
  } catch {
    // If VT is interrupted (e.g. skipTransition), still ensure theme is applied
    // unless a newer transition already owns the lock.
    if (generation === transitionGeneration) {
      apply();
    }
  } finally {
    if (generation === transitionGeneration) {
      activeTransition = null;
      isTransitioning = false;
    }
  }
}
