"use client";

import { useEffect, useState } from "react";

const DEFAULT_INTERVAL_MS = 400;
const DOT_SEQUENCE = [1, 2, 3, 0] as const;

export function getAnimatedEllipsis(nowMs: number, intervalMs = DEFAULT_INTERVAL_MS): string {
  const safeInterval = intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS;
  const step = Math.floor(nowMs / safeInterval) % DOT_SEQUENCE.length;
  return ".".repeat(DOT_SEQUENCE[step] ?? 0);
}

export function useAnimatedEllipsis(active: boolean, intervalMs = DEFAULT_INTERVAL_MS): string {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [active, intervalMs]);

  return active ? getAnimatedEllipsis(nowMs, intervalMs) : "";
}

/** Trailing animated dots (., .., ..., empty) — use in place of a final period. */
export function AnimatedEllipsis({
  active = true,
  intervalMs = DEFAULT_INTERVAL_MS,
  emptyWidthCh = 3,
}: {
  active?: boolean;
  intervalMs?: number;
  emptyWidthCh?: number;
}) {
  const dots = useAnimatedEllipsis(active, intervalMs);
  if (!active) return null;
  return (
    <span
      className="inline-block text-left"
      style={{ width: `${emptyWidthCh}ch` }}
      aria-hidden="true"
    >
      {dots}
    </span>
  );
}

export default function AnimatedLoadingLabel({
  label,
  active,
  intervalMs = DEFAULT_INTERVAL_MS,
  emptyWidthCh = 3,
}: {
  label: string;
  active: boolean;
  intervalMs?: number;
  emptyWidthCh?: number;
}) {
  if (!active) return <>{label}</>;

  return (
    <>
      {label}
      <AnimatedEllipsis active intervalMs={intervalMs} emptyWidthCh={emptyWidthCh} />
    </>
  );
}
