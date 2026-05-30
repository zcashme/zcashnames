"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";

type UsePointerProximityOptions = {
  radius?: number;
  maxScaleBoost?: number;
  maxShadowOpacity?: number;
};

const DEFAULTS: Required<UsePointerProximityOptions> = {
  radius: 160,
  maxScaleBoost: 0.12,
  maxShadowOpacity: 0.18,
};

function applyReset(node: HTMLElement) {
  node.style.setProperty("--prox-scale", "1");
  node.style.setProperty("--prox-shadow-opacity", "0");
}

export function usePointerProximity<T extends HTMLElement>(options?: UsePointerProximityOptions) {
  const settings = { ...DEFAULTS, ...options };
  const nodeRefs = useRef(new Map<string, T>());

  const register = (key: string, node: T | null) => {
    if (node) {
      nodeRefs.current.set(key, node);
      applyReset(node);
      return;
    }
    nodeRefs.current.delete(key);
  };

  const reset = () => {
    for (const node of nodeRefs.current.values()) {
      applyReset(node);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;

    for (const node of nodeRefs.current.values()) {
      const rect = node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      const influence = Math.max(0, 1 - distance / settings.radius);
      const eased = influence * influence;

      node.style.setProperty("--prox-scale", `${1 + eased * settings.maxScaleBoost}`);
      node.style.setProperty("--prox-shadow-opacity", `${eased * settings.maxShadowOpacity}`);
    }
  };

  return {
    register,
    reset,
    handlePointerMove,
    handlePointerLeave: reset,
  };
}
