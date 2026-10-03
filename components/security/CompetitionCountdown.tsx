"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function countdownParts(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function CompetitionCountdown({
  startAt,
  endAt,
}: {
  startAt: number | null;
  endAt: number | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const nextBoundary = [startAt, endAt]
      .filter((instant): instant is number => instant != null && instant > Date.now())
      .sort((left, right) => left - right)[0];
    if (nextBoundary == null) return;
    const delay = Math.min(nextBoundary - Date.now() + 1000, 2_147_000_000);
    const timeout = window.setTimeout(() => router.refresh(), delay);
    return () => window.clearTimeout(timeout);
  }, [startAt, endAt, router]);

  if (startAt == null || endAt == null) {
    return <p className="mt-2 text-sm" style={{ color: "var(--fg-muted)" }}>Competition dates are not set.</p>;
  }

  const current = now ?? startAt;
  const phase = current < startAt ? "before" : current < endAt ? "open" : "after";
  const target = phase === "before" ? startAt : phase === "open" ? endAt : null;
  const label = phase === "before" ? "Starts in" : phase === "open" ? "Ends in" : "Competition ended";
  const parts = target == null ? null : countdownParts(target - current);

  return (
    <div className="mt-4" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--fg-muted)" }}>{label}</p>
      {parts ? (
        <div className="mt-2 flex justify-center gap-2 sm:gap-3" aria-label={`${parts.days} days, ${parts.hours} hours, ${parts.minutes} minutes, ${parts.seconds} seconds`}>
          {([ ["Days", parts.days], ["Hours", parts.hours], ["Minutes", parts.minutes], ["Seconds", parts.seconds] ] as const).map(([unit, value]) => (
            <div key={unit} className="min-w-[3.6rem] rounded-xl border px-2 py-2 sm:min-w-[4.25rem]" style={{ borderColor: "var(--faq-border)" }}>
              <div className="font-mono text-xl font-bold tabular-nums" style={{ color: "var(--fg-heading)" }}>{String(value).padStart(2, "0")}</div>
              <div className="text-[0.65rem] uppercase tracking-wide" style={{ color: "var(--fg-muted)" }}>{unit}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
