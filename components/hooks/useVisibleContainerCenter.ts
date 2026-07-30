"use client";

import { useEffect, useState } from "react";

type VisibleContainerCenter = {
  x: number;
  y: number;
};

function computeVisibleCenter(element: HTMLElement): VisibleContainerCenter {
  const rect = element.getBoundingClientRect();
  const visibleLeft = Math.max(rect.left, 0);
  const visibleRight = Math.min(rect.right, window.innerWidth);
  const visibleTop = Math.max(rect.top, 0);
  const visibleBottom = Math.min(rect.bottom, window.innerHeight);

  const hasVisibleArea = visibleRight > visibleLeft && visibleBottom > visibleTop;
  const centerX = hasVisibleArea ? (visibleLeft + visibleRight) / 2 : rect.left + rect.width / 2;
  const centerY = hasVisibleArea ? (visibleTop + visibleBottom) / 2 : rect.top + rect.height / 2;

  return {
    x: Math.min(Math.max(centerX - rect.left, 0), rect.width),
    y: Math.min(Math.max(centerY - rect.top, 0), rect.height),
  };
}

export default function useVisibleContainerCenter(
  element: HTMLElement | null,
  active: boolean,
): VisibleContainerCenter {
  const [center, setCenter] = useState<VisibleContainerCenter>({ x: 0, y: 0 });

  useEffect(() => {
    if (!element || !active) return;
    const target = element;

    let frameId = 0;
    let resizeObserver: ResizeObserver | null = null;

    function updateCenter() {
      setCenter(computeVisibleCenter(target));
    }

    function scheduleUpdate() {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        updateCenter();
      });
    }

    updateCenter();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("scroll", scheduleUpdate);
      window.visualViewport.addEventListener("resize", scheduleUpdate);
    }

    resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(target);

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("scroll", scheduleUpdate);
        window.visualViewport.removeEventListener("resize", scheduleUpdate);
      }
      resizeObserver?.disconnect();
    };
  }, [active, element]);

  return center;
}
