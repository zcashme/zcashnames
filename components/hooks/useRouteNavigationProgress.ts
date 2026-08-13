"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  NAVIGATION_PROGRESS_START_EVENT,
  getLocationKey,
  locationKeyFromHref,
  locationKeyFromWindow,
} from "@/lib/navigation/navigationProgress";

export type NavigationProgressDirection = "ltr" | "rtl";

export type RouteNavigationProgress = {
  isLoading: boolean;
  progress: number;
  direction: NavigationProgressDirection;
};

/**
 * Tracks in-flight client navigations and exposes a 0–100 progress value for a
 * header fill bar. Completes when pathname or search changes; falls back after 15s.
 */
export function useRouteNavigationProgress(): RouteNavigationProgress {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locationKey = getLocationKey(pathname ?? "/", searchParams.toString() ? `?${searchParams.toString()}` : "");

  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState<NavigationProgressDirection>("ltr");

  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef(0);
  const resetTimeoutRef = useRef<number | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const startLocationKeyRef = useRef<string>("/");
  const lastResolvedLocationKeyRef = useRef(locationKey);
  const isLoadingRef = useRef(false);

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
    (startLocationKey: string, nextDirection: NavigationProgressDirection = "ltr") => {
      if (isLoadingRef.current && startLocationKeyRef.current === startLocationKey) {
        return;
      }
      clearAnimation();
      startLocationKeyRef.current = startLocationKey;
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
        startLocationKeyRef.current = locationKeyFromWindow();
        if (animationFrameRef.current !== null) {
          window.cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }, 15000);
    },
    [clearAnimation],
  );

  const finishProgress = useCallback(() => {
    clearAnimation();
    setProgress(100);
    resetTimeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
      setDirection("ltr");
      resetTimeoutRef.current = null;
      startLocationKeyRef.current = locationKeyFromWindow();
    }, 180);
  }, [clearAnimation]);

  const startForTarget = useCallback(
    (candidate: string | URL, startLocationKey: string) => {
      const nextKey = locationKeyFromHref(candidate);
      if (!nextKey || nextKey === startLocationKey) return;
      startProgress(startLocationKey);
    },
    [startProgress],
  );

  useEffect(() => {
    lastResolvedLocationKeyRef.current = locationKey;
  }, [locationKey]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const handleNavigationProgressStart = () => {
      startProgress(lastResolvedLocationKeyRef.current);
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

      startForTarget(anchor.href, locationKeyFromWindow());
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [startForTarget]);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const startIfLocationChanges = (url: string | URL | null | undefined) => {
      if (!url) return;
      const currentKey = locationKeyFromWindow();
      const nextKey = locationKeyFromHref(url);
      // Pathname changes are enough to start here. Search-only history writes
      // are often instant client filters (no RSC); those start via Link clicks
      // or useAppRouter instead, so the bar can finish on React search updates.
      if (!nextKey) return;
      const currentPath = currentKey.split("?")[0] ?? currentKey;
      const nextPath = nextKey.split("?")[0] ?? nextKey;
      if (nextPath !== currentPath) {
        startProgress(currentKey);
      }
    };

    const patchedPushState: History["pushState"] = function (data, unused, url) {
      startIfLocationChanges(url);
      originalPushState.call(window.history, data, unused, url);
    };

    const patchedReplaceState: History["replaceState"] = function (data, unused, url) {
      startIfLocationChanges(url);
      originalReplaceState.call(window.history, data, unused, url);
    };

    const handlePopState = () => {
      const previousKey = lastResolvedLocationKeyRef.current;
      const nextKey = locationKeyFromWindow();
      if (nextKey !== previousKey) {
        startProgress(previousKey);
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
  }, [startProgress]);

  useEffect(() => {
    if (!isLoading) return;
    if (locationKey && locationKey !== startLocationKeyRef.current) {
      finishProgress();
    }
  }, [finishProgress, isLoading, locationKey]);

  useEffect(
    () => () => {
      clearAnimation();
    },
    [clearAnimation],
  );

  return { isLoading, progress, direction };
}
