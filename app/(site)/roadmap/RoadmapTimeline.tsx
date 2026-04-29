"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useTheme } from "next-themes";
import { parseIsoDateUtc, type RoadmapPeriod } from "@/lib/roadmap";

type PeriodLayout = RoadmapPeriod & {
  isCurrent: boolean;
};

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const rangeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const PERIOD_ACCENTS = [
  {
    fill: "linear-gradient(135deg, rgba(244,183,40,0.96) 0%, rgba(255,214,102,0.88) 100%)",
    border: "rgba(244,183,40,0.85)",
    glow: "rgba(244,183,40,0.22)",
    chip: "rgba(244,183,40,0.16)",
  },
  {
    fill: "linear-gradient(135deg, rgba(46,129,255,0.95) 0%, rgba(103,196,255,0.86) 100%)",
    border: "rgba(103,196,255,0.82)",
    glow: "rgba(46,129,255,0.18)",
    chip: "rgba(46,129,255,0.16)",
  },
  {
    fill: "linear-gradient(135deg, rgba(74,222,128,0.92) 0%, rgba(125,240,185,0.82) 100%)",
    border: "rgba(74,222,128,0.82)",
    glow: "rgba(74,222,128,0.18)",
    chip: "rgba(74,222,128,0.16)",
  },
  {
    fill: "linear-gradient(135deg, rgba(168,85,247,0.9) 0%, rgba(224,170,255,0.84) 100%)",
    border: "rgba(192,132,252,0.82)",
    glow: "rgba(168,85,247,0.18)",
    chip: "rgba(168,85,247,0.16)",
  },
];

const MONO_ACCENT = {
  fill: "linear-gradient(135deg, rgba(155,188,15,0.92) 0%, rgba(139,172,15,0.84) 100%)",
  border: "rgba(155,188,15,0.82)",
  glow: "rgba(155,188,15,0.18)",
  chip: "rgba(155,188,15,0.16)",
};

function toLocalUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function formatRange(startIso: string, endIso: string): string {
  const start = parseIsoDateUtc(startIso);
  const end = parseIsoDateUtc(endIso);
  return `${rangeFormatter.format(start)} - ${rangeFormatter.format(end)}`;
}

function periodsStart(periods: RoadmapPeriod[]): Date {
  let earliest = parseIsoDateUtc(periods[0].startDate);

  for (const period of periods) {
    const date = parseIsoDateUtc(period.startDate);
    if (date.getTime() < earliest.getTime()) earliest = date;
  }

  return earliest;
}

function periodsEnd(periods: RoadmapPeriod[]): Date {
  let latest = parseIsoDateUtc(periods[0].endDate);

  for (const period of periods) {
    const date = parseIsoDateUtc(period.endDate);
    if (date.getTime() > latest.getTime()) latest = date;
  }

  return latest;
}

function buildLayouts(periods: RoadmapPeriod[], today: Date): PeriodLayout[] {
  return periods.map((period) => {
    const start = parseIsoDateUtc(period.startDate);
    const end = parseIsoDateUtc(period.endDate);

    return {
      ...period,
      isCurrent: today.getTime() >= start.getTime() && today.getTime() <= end.getTime(),
    };
  });
}

function chooseInitialPeriod(periods: RoadmapPeriod[], today: Date): string {
  const current = periods.find((period) => {
    const start = parseIsoDateUtc(period.startDate);
    const end = parseIsoDateUtc(period.endDate);
    return today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
  });
  if (current) return current.id;

  const upcoming = periods.find((period) => parseIsoDateUtc(period.startDate).getTime() > today.getTime());
  return upcoming?.id ?? periods[0].id;
}

export default function RoadmapTimeline({ periods }: { periods: RoadmapPeriod[] }) {
  const { resolvedTheme } = useTheme();
  const today = toLocalUtcDate(new Date());
  const timelineStart = periodsStart(periods);
  const timelineEnd = periodsEnd(periods);
  const layouts = buildLayouts(periods, today);
  const [expandedIds, setExpandedIds] = useState<string[]>(() => [chooseInitialPeriod(periods, today)]);
  const currentPeriodRef = useRef<HTMLElement | null>(null);
  const activePeriods = layouts.filter((layout) => layout.isCurrent);
  const currentPeriod =
    activePeriods[0] ??
    layouts.find((layout) => expandedIds.includes(layout.id)) ??
    layouts[0];
  const firstCurrentPeriodId = activePeriods[0]?.id;
  const isMonochrome = resolvedTheme === "monochrome";

  function centerCurrentPeriod(behavior: ScrollBehavior) {
    currentPeriodRef.current?.scrollIntoView({ behavior, block: "center" });
  }

  function togglePeriod(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function expandCurrentPeriods() {
    setExpandedIds(activePeriods.map((period) => period.id));
    window.requestAnimationFrame(() => centerCurrentPeriod("smooth"));
  }

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => centerCurrentPeriod("auto"));
    return () => window.cancelAnimationFrame(handle);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[28px] border border-border-muted bg-[var(--color-card)] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
              Product roadmap
            </h1>
            <p className="mt-3 text-base leading-7 text-fg-body sm:text-lg">
              Phases are anchored to real calendar dates and expand to show the work inside them.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandCurrentPeriods}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-muted bg-[var(--color-raised)] px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent-green)]" aria-hidden="true" />
              Current phase
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border-muted bg-[var(--color-raised)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Visible range</p>
            <p className="mt-2 text-base font-semibold text-fg-heading">
              {monthFormatter.format(timelineStart)} to {monthFormatter.format(timelineEnd)}
            </p>
          </div>
          <div className="rounded-2xl border border-border-muted bg-[var(--color-raised)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Current focus</p>
            <p className="mt-2 text-base font-semibold text-fg-heading">{currentPeriod.title}</p>
          </div>
          <div className="rounded-2xl border border-border-muted bg-[var(--color-raised)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Phases</p>
            <p className="mt-2 text-base font-semibold text-fg-heading">{periods.length} mapped</p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border-muted bg-[var(--color-card)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:p-5">
        <div className="flex flex-col gap-4">
          {layouts.map((period, index) => (
            <ListRoadmapCard
              key={period.id}
              currentMarkerRef={period.id === firstCurrentPeriodId ? currentPeriodRef : undefined}
              period={period}
              accent={isMonochrome ? MONO_ACCENT : PERIOD_ACCENTS[index % PERIOD_ACCENTS.length]}
              expanded={expandedIds.includes(period.id)}
              onExpand={() => togglePeriod(period.id)}
              monochrome={isMonochrome}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ListRoadmapCard({
  period,
  accent,
  expanded,
  onExpand,
  currentMarkerRef,
  monochrome,
}: {
  period: PeriodLayout;
  accent: typeof MONO_ACCENT;
  expanded: boolean;
  onExpand: () => void;
  currentMarkerRef?: RefObject<HTMLElement | null>;
  monochrome: boolean;
}) {
  const panelId = `${period.id}-tasks`;
  const buttonId = `${period.id}-toggle`;

  return (
    <article
      ref={(node) => {
        if (currentMarkerRef) currentMarkerRef.current = node;
      }}
      className={`rounded-[24px] border p-4 transition-colors sm:p-5 ${
        period.isCurrent ? "" : "border-border-muted bg-[var(--color-card)]"
      }`}
      style={{
        borderColor: period.isCurrent ? "var(--color-accent-green)" : undefined,
        background: period.isCurrent
          ? "color-mix(in srgb, var(--color-card) 92%, var(--color-accent-green-light))"
          : undefined,
        boxShadow: period.isCurrent
          ? "0 0 0 1px color-mix(in srgb, var(--color-accent-green) 28%, transparent), 0 18px 40px rgba(0,0,0,0.14)"
          : "0 18px 40px rgba(0,0,0,0.14)",
      }}
    >
      <button
        id={buttonId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onExpand}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-fg-heading">
              {period.isCurrent && (
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent-green)]" aria-hidden="true" />
              )}
              <span>{period.title}</span>
            </h2>
            {period.isCurrent && (
              <span
                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-green)]"
                style={{
                  border: "1px solid color-mix(in srgb, var(--color-accent-green) 40%, transparent)",
                  background: "var(--color-accent-green-light)",
                }}
              >
                Active now
              </span>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-fg-body sm:text-base">{period.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-fg-body">
            <span className="inline-flex rounded-full border border-border-muted px-3 py-1.5 font-semibold">
              {formatRange(period.startDate, period.endDate)}
            </span>
            <span
              className="inline-flex rounded-full px-3 py-1.5 font-semibold"
              style={{
                background: monochrome ? "var(--color-raised)" : accent.chip,
                border: monochrome ? "1px solid var(--border-muted)" : undefined,
              }}
            >
              {period.tasks.length} tasks
            </span>
          </div>
        </div>
        <span
          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-black text-[var(--color-background)]"
          style={{
            background: monochrome ? "var(--color-raised)" : accent.fill,
            borderColor: monochrome ? "var(--border-muted)" : accent.border,
            boxShadow: monochrome
              ? "none"
              : `0 0 0 1px ${accent.border}, 0 14px 28px ${accent.glow}`,
            color: monochrome ? "var(--fg-heading)" : "var(--color-background)",
          }}
          aria-hidden="true"
        >
          {expanded ? "-" : "+"}
        </span>
      </button>

      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="mt-4 rounded-[18px] border border-border-muted bg-[var(--color-raised)] p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
            Tasks in this phase
          </p>
          <ul className="mt-3 grid gap-3">
            {period.tasks.map((task) => (
              <li
                key={task}
                className="flex items-start gap-3 rounded-2xl border border-border-muted bg-[var(--color-card)] px-3 py-3 text-sm leading-6 text-fg-body"
              >
                <span
                  className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: monochrome ? "var(--fg-muted)" : accent.border }}
                  aria-hidden="true"
                />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
