/**
 * Directional theme transition: full-viewport color sweep + header toggle 3D flip.
 *
 * Uses the View Transitions API when available. Forces `data-theme` on <html>
 * inside the update callback so next-themes' async effect does not leave the
 * "new" snapshot on the old palette. setTheme is wrapped in flushSync so React
 * re-renders (e.g. toggle icon) before the "new" snapshot is taken.
 */

import { flushSync } from "react-dom";

export type ThemeName = "dark" | "light" | "monochrome";
export type ThemeDirection = "ltr" | "rtl";

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

export function supportsViewTransitions(): boolean {
  return typeof document !== "undefined" && "startViewTransition" in document;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Light → dark sweeps/flips L→R; dark → light sweeps/flips R→L. Other paths: none. */
export function getThemeDirection(from: ThemeName, to: ThemeName): ThemeDirection | null {
  if (from === "light" && to === "dark") return "ltr";
  if (from === "dark" && to === "light") return "rtl";
  return null;
}

export function isThemeTransitioning(): boolean {
  return isTransitioning;
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

function clipPathKeyframes(direction: ThemeDirection): string[] {
  // New theme grows from the leading edge across the viewport.
  if (direction === "ltr") {
    return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
  }
  return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
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
 * LTR: old exits +90°, new enters from −90° (reads as left → right).
 * RTL: mirrored.
 */
function animateToggleFlip(direction: ThemeDirection, durationMs: number, easing: string) {
  const outDeg = direction === "ltr" ? 90 : -90;
  const inFromDeg = direction === "ltr" ? -90 : 90;

  document.documentElement.animate(
    {
      transform: [
        `perspective(420px) rotateY(0deg)`,
        `perspective(420px) rotateY(${outDeg}deg)`,
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
        `perspective(420px) rotateY(${inFromDeg}deg)`,
        `perspective(420px) rotateY(0deg)`,
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
  onFallbackFlipStart,
  onFallbackFlipEnd,
}: RunThemeTransitionOptions): Promise<void> {
  if (isTransitioning) return;

  const apply = () => {
    applyThemeAttribute(nextTheme);
    flushSync(() => {
      setTheme(nextTheme);
    });
  };

  // Monochrome and reduced-motion: instant swap, no directional motion language.
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

  isTransitioning = true;

  try {
    const transition = doc.startViewTransition(() => {
      apply();
    });

    await transition.ready;

    animateRootSweep(direction, durationMs, easing);
    animateToggleFlip(direction, durationMs, easing);

    await transition.finished;
  } catch {
    // If VT is interrupted (e.g. skipTransition), still ensure theme is applied.
    apply();
  } finally {
    isTransitioning = false;
  }
}
