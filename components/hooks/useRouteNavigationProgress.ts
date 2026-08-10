"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { NAVIGATION_PROGRESS_START_EVENT } from "@/lib/navigation/navigationProgress";

export type NavigationProgressDirection = "ltr" | "rtl";

export type RouteNavigationProgress = {
  isLoading: boolean;
  progress: number;
  direction: NavigationProgressDirection;
};

/**
 * Tracks in-flight client navigations and exposes a 0–100 progress value for a
 * header fill bar. Completes when `usePathname()` changes; falls back after 15s.
 */
export function useRouteNavigationProgress(): RouteNavigationProgress {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<NavigationProgressDirection>("ltr");

  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef(0);
  const resetTimeoutRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const startPathnameRef = useRef<string>("/");
  const lastResolvedPathnameRef = useRef(pathname ?? "/");
  const isLoadingRef = useRef(false);

  const resolveInternalPathname = useCallback(
    (candidate: string | URL | null | undefined): string | null => {
      if (!candidate) return null;
      try {
        const nextUrl =
          candidate instanceof URL ? candidate : new URL(String(candidate), window.location.href);
        if (nextUrl.origin !== window.location.origin) return null;
        return nextUrl.pathname;
      } catch {
        return null;
      }
    },
    []
  );

  const clearAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
    if (fallbackTimeoutRef.current !== null) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  const startProgress = useCallback(
    (startPathname: string, nextDirection: NavigationProgressDirection = "ltr") => {
      if (isLoadingRef.current && startPathnameRef.current === startPathname) {
        return;
      }
      clearAnimation();
      startPathnameRef.current = startPathname;
      setDirection(nextDirection);
      setIsLoading(true);
      setProgress(0);
      animationStartRef.current = performance.now();

      const tick = (now: number) => {
        const elapsed = now - animationStartRef.current;
        const nextProgress = Math.min(97, 97 * (1 - Math.exp(-elapsed / 950)));
        setProgress(nextProgress);
        animationFrameRef.current = window.requestAnimationFrame(tick);
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
      fallbackTimeoutRef.current = window.setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
        setDirection("ltr");
        fallbackTimeoutRef.current = null;
        startPathnameRef.current = window.location.pathname;
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }, 15000);
    },
    [clearAnimation]
  );

  const finishProgress = useCallback(() => {
    clearAnimation();
    setProgress(100);
    resetTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setDirection("ltr");
      resetTimeoutRef.current = null;
      startPathnameRef.current = window.location.pathname;
    }, 180);
  }, [clearAnimation]);

  const startForTarget = useCallback(
    (candidate: string | URL, startPathname: string) => {
      const nextPathname = resolveInternalPathname(candidate);
      if (!nextPathname || nextPathname === startPathname) return;
      startProgress(startPathname);
    },
    [resolveInternalPathname, startProgress]
  );

  useEffect(() => {
    lastResolvedPathnameRef.current = pathname ?? "/";
  }, [pathname]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const handleNavigationProgressStart = () => {
      startProgress(lastResolvedPathnameRef.current);
    };

    window.addEventListener(NAVIGATION_PROGRESS_START_EVENT, handleNavigationProgressStart);
    return () => {
      window.removeEventListener(NAVIGATION_PROGRESS_START_EVENT, handleNavigationProgressStart);
    };
  }, [startProgress]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const currentPathname = window.location.pathname;
      startForTarget(anchor.href, currentPathname);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [startForTarget]);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const patchedPushState: History["pushState"] = function (data, unused, url) {
      const currentPathname = window.location.pathname;
      if (url) {
        const nextPathname = resolveInternalPathname(url);
        if (nextPathname && nextPathname !== currentPathname) {
          startProgress(currentPathname);
        }
      }
      originalPushState.call(window.history, data, unused, url);
    };

    const patchedReplaceState: History["replaceState"] = function (data, unused, url) {
      const currentPathname = window.location.pathname;
      if (url) {
        const nextPathname = resolveInternalPathname(url);
        if (nextPathname && nextPathname !== currentPathname) {
          startProgress(currentPathname);
        }
      }
      originalReplaceState.call(window.history, data, unused, url);
    };

    const handlePopState = () => {
      const previousPathname = lastResolvedPathnameRef.current;
      const nextPathname = window.location.pathname;
      if (nextPathname !== previousPathname) {
        startProgress(previousPathname);
      }
    };

    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [resolveInternalPathname, startProgress]);

  useEffect(() => {
    if (!isLoading) return;
    if (pathname && pathname !== startPathnameRef.current) {
      finishProgress();
    }
  }, [finishProgress, isLoading, pathname]);

  useEffect(
    () => () => {
      clearAnimation();
    },
    [clearAnimation]
  );

  return { isLoading, progress, direction };
}
