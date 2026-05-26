"use client";

import { useEffect, useRef } from "react";

// Gated polling primitive. One effect, one timer, fresh callback each tick.
// Pass enabled=false to pause; the timer is torn down and re-created when
// enabled flips. Callbacks fire immediately on enable, then every intervalMs.
export function usePoll(enabled: boolean, fn: () => void | Promise<void>, intervalMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await fnRef.current();
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled, intervalMs]);
}
