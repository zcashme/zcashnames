"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { useTheme } from "next-themes";
import ShareDropdown from "@/components/ShareDropdown";
import { parseIsoDateUtc, type RoadmapPeriod } from "@/lib/roadmap";
import {
  buildRoadmapLayouts,
  buildRoadmapShareMessage,
  countCompletedRoadmapPeriods,
  type RoadmapPeriodLayout,
} from "@/lib/roadmap-status";

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const rangeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const ROADMAP_SHARE_URL = "https://www.zcashnames.com/roadmap";

type RoadmapSectionGroup = {
  title?: string;
  periods: RoadmapPeriodLayout[];
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

function periodsLastStart(periods: RoadmapPeriod[]): Date {
  let latest = parseIsoDateUtc(periods[0].startDate);

  for (const period of periods) {
    const date = parseIsoDateUtc(period.startDate);
    if (date.getTime() > latest.getTime()) latest = date;
  }

  return latest;
}

function chooseInitialPeriod(periods: RoadmapPeriod[], today: Date): string {
  const layouts = buildRoadmapLayouts(periods, today);
  const current = layouts.find((period) => period.isCurrent);
  if (current) return current.id;

  const upcoming = layouts.find((period) => period.isUpcoming);
  return upcoming?.id ?? periods[0].id;
}

function buildSectionGroups(periods: RoadmapPeriodLayout[]): RoadmapSectionGroup[] {
  const groups: RoadmapSectionGroup[] = [];

  for (const period of periods) {
    const previous = groups[groups.length - 1];
    if (previous && previous.title === period.sectionTitle) {
      previous.periods.push(period);
      continue;
    }

    groups.push({
      title: period.sectionTitle,
      periods: [period],
    });
  }

  return groups;
}

export default function RoadmapTimeline({ periods }: { periods: RoadmapPeriod[] }) {
  const { resolvedTheme } = useTheme();
  const monochrome = resolvedTheme === "monochrome";
  const light = resolvedTheme === "light";
  const flattenedSurfaceMode = monochrome || light;
  const today = toLocalUtcDate(new Date());
  const timelineStart = periodsStart(periods);
  const timelineEnd = periodsLastStart(periods);
  const layouts = buildRoadmapLayouts(periods, today);
  const [expandedIds, setExpandedIds] = useState<string[]>(() => [chooseInitialPeriod(periods, today)]);
  const currentPeriodRef = useRef<HTMLElement | null>(null);
  const activePeriods = layouts.filter((layout) => layout.isCurrent);
  const upcomingPeriod = layouts.find((layout) => layout.isUpcoming);
  const statusTarget = activePeriods[0] ?? upcomingPeriod;
  const currentPeriod =
    statusTarget ??
    layouts.find((layout) => expandedIds.includes(layout.id)) ??
    layouts[0];
  const statusTargetId = statusTarget?.id;
  const completedCount = countCompletedRoadmapPeriods(periods, today);
  const shareMessage = buildRoadmapShareMessage({
    currentFocusTitle: currentPeriod.title,
    completedCount,
    totalCount: periods.length,
    shareUrl: ROADMAP_SHARE_URL,
  });
  const showCurrentPhaseButton = activePeriods.length > 0;
  const sectionGroups = buildSectionGroups(layouts);

  function centerCurrentPeriod(behavior: ScrollBehavior) {
    currentPeriodRef.current?.scrollIntoView({ behavior, block: "center" });
  }

  function togglePeriod(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function expandCurrentPeriods() {
    const targetIds = statusTarget ? [statusTarget.id] : [];
    if (targetIds.length === 0) return;
    setExpandedIds(targetIds);
    window.requestAnimationFrame(() => centerCurrentPeriod("smooth"));
  }

  function focusCurrentPeriod() {
    if (!statusTarget) return;
    setExpandedIds((current) => (current.includes(statusTarget.id) ? current : [...current, statusTarget.id]));
    window.requestAnimationFrame(() => centerCurrentPeriod("smooth"));
  }

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => centerCurrentPeriod("auto"));
    return () => window.cancelAnimationFrame(handle);
  }, []);

  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-bold leading-tight text-fg-heading sm:text-5xl">
              Launch Sequence
            </h1>
          </div>
          <ShareDropdown
            label="Share"
            message={shareMessage}
            shareUrl={ROADMAP_SHARE_URL}
            emailSubject="ZcashNames Roadmap"
            menuAlign="right"
            buttonClassName="inline-flex min-h-11 items-center gap-2 rounded-md border border-border-muted bg-transparent px-4 py-2 text-sm font-semibold text-fg-heading transition-colors hover:border-fg-heading"
          />
        </div>

        {showCurrentPhaseButton ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandCurrentPeriods}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-border-muted px-4 py-2 text-sm font-semibold text-fg-body transition-colors hover:border-fg-heading hover:text-fg-heading ${
                flattenedSurfaceMode ? "bg-transparent" : "bg-[var(--color-raised)]"
              }`}
            >
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent-green)]" aria-hidden="true" />
              Current phase
            </button>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-lg border border-border-muted p-4 ${flattenedSurfaceMode ? "bg-transparent" : "bg-[var(--color-raised)]"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Outlook</p>
            <p className="mt-2 text-base font-semibold text-fg-heading">
              {monthFormatter.format(timelineStart)} to {monthFormatter.format(timelineEnd)}
            </p>
          </div>
          <div className={`rounded-lg border border-border-muted p-4 ${flattenedSurfaceMode ? "bg-transparent" : "bg-[var(--color-raised)]"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Current focus</p>
            <button
              type="button"
              onClick={focusCurrentPeriod}
              className="mt-2 inline-flex items-center gap-2 text-left text-base font-semibold text-fg-heading transition-colors hover:text-[var(--color-brand-blue)]"
            >
              {!activePeriods.length && upcomingPeriod ? (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent-yellow)]"
                  aria-hidden="true"
                />
              ) : null}
              {currentPeriod.title}
            </button>
          </div>
          <div className={`rounded-lg border border-border-muted p-4 ${flattenedSurfaceMode ? "bg-transparent" : "bg-[var(--color-raised)]"}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">Phases</p>
            <p className="mt-2 text-base font-semibold text-fg-heading">
              {completedCount} of {periods.length} complete
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-14 sm:gap-16">
        {sectionGroups.map((group) => (
          <section key={group.title ?? group.periods[0].id} className="flex flex-col gap-5 sm:gap-6">
            {group.title ? (
              <p className="text-3xl font-bold leading-tight text-fg-heading sm:text-[2rem]">
                {group.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-4">
              {group.periods.map((period) => (
                <ListRoadmapCard
                  key={period.id}
                  currentMarkerRef={period.id === statusTargetId ? currentPeriodRef : undefined}
                  period={period}
                  expanded={expandedIds.includes(period.id)}
                  onExpand={() => togglePeriod(period.id)}
                  monochrome={monochrome}
                  light={light}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ListRoadmapCard({
  period,
  expanded,
  onExpand,
  currentMarkerRef,
  monochrome,
  light,
}: {
  period: RoadmapPeriodLayout;
  expanded: boolean;
  onExpand: () => void;
  currentMarkerRef?: RefObject<HTMLElement | null>;
  monochrome: boolean;
  light: boolean;
}) {
  const panelId = `${period.id}-tasks`;
  const buttonId = `${period.id}-toggle`;
  const flattenedSurfaceMode = monochrome || light;
  const isHighlighted = period.isCurrent || period.isUpcoming;
  const highlightColor = period.isCurrent ? "var(--color-accent-green)" : "var(--color-accent-yellow)";
  const highlightBackground = flattenedSurfaceMode
    ? "transparent"
    : period.isCurrent
      ? "color-mix(in srgb, var(--color-card) 92%, var(--color-accent-green-light))"
      : "color-mix(in srgb, var(--color-card) 90%, var(--color-accent-yellow-light))";
  const highlightBoxShadow = period.isCurrent
    ? "0 0 0 1px color-mix(in srgb, var(--color-accent-green) 28%, transparent), 0 18px 40px rgba(0,0,0,0.14)"
    : "0 0 0 1px color-mix(in srgb, var(--color-accent-yellow) 28%, transparent), 0 18px 40px rgba(0,0,0,0.14)";
  const statusLabel = period.isCurrent ? "Active now" : null;
  const normalizedBadge = period.badgeLabel?.trim().toLowerCase();
  const isCompleteBadge = normalizedBadge === "complete";
  const isApplyBadge = normalizedBadge === "apply now";
  const isTbaBadge = normalizedBadge === "tba";
  const badgeClassName =
    isCompleteBadge || isApplyBadge
      ? "border-[color-mix(in_srgb,var(--color-accent-green)_40%,transparent)] bg-[var(--color-accent-green-light)] text-[var(--color-accent-green)]"
      : isTbaBadge
        ? monochrome
          ? "border-[color-mix(in_srgb,var(--color-accent-green)_40%,transparent)] bg-[var(--color-accent-green-light)] text-[var(--color-accent-green)]"
          : "border-[color-mix(in_srgb,#dc2626_36%,transparent)] bg-[rgba(220,38,38,0.12)] text-[#dc2626] [[data-theme=monochrome]_&]:border-border-muted [[data-theme=monochrome]_&]:bg-[var(--color-raised)] [[data-theme=monochrome]_&]:!text-[var(--fg-heading)]"
        : "border-border-muted bg-[var(--color-raised)] text-fg-heading";
  const applyBadgeClassName =
    "border-[color-mix(in_srgb,var(--color-accent-green)_40%,transparent)] bg-transparent text-[var(--color-accent-green)]";
  const taskMarkerClassName = isCompleteBadge
    ? monochrome
      ? "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--fg-muted)]"
      : "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent-green)]"
    : isTbaBadge
      ? monochrome
        ? "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--fg-muted)]"
        : "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#dc2626] [[data-theme=monochrome]_&]:bg-[var(--fg-muted)]"
      : period.isUpcoming
        ? "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent-yellow)]"
        : "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--fg-muted)]";

  return (
    <article
      ref={(node) => {
        if (currentMarkerRef) currentMarkerRef.current = node;
      }}
      className={`rounded-lg border p-4 transition-colors sm:p-5 ${
        isHighlighted ? "" : flattenedSurfaceMode ? "border-border-muted bg-transparent" : "border-border-muted bg-[var(--color-card)]"
      }`}
      style={{
        borderColor: isHighlighted ? highlightColor : undefined,
        background: isHighlighted ? highlightBackground : undefined,
        boxShadow: isHighlighted
          ? highlightBoxShadow
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
              {(period.isCurrent || period.isUpcoming) && (
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    period.isCurrent ? "bg-[var(--color-accent-green)]" : "bg-[var(--color-accent-yellow)]"
                  }`}
                  aria-hidden="true"
                />
              )}
              <span>{period.title}</span>
            </h2>
            {period.badgeLabel && period.badgeHref ? (
              <Link
                href="/beta/apply"
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:border-fg-heading ${isApplyBadge ? applyBadgeClassName : badgeClassName}`}
              >
                <span>{isCompleteBadge ? `✓ ${period.badgeLabel}` : period.badgeLabel}</span>
                {isApplyBadge ? <span aria-hidden="true">→</span> : null}
              </Link>
            ) : period.badgeLabel ? (
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeClassName}`}>
                {isCompleteBadge ? `✓ ${period.badgeLabel}` : period.badgeLabel}
              </span>
            ) : null}
            {statusLabel && (
              <span
                className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]"
                style={{
                  color: highlightColor,
                  border: `1px solid color-mix(in srgb, ${highlightColor} 40%, transparent)`,
                  background: period.isCurrent
                    ? "var(--color-accent-green-light)"
                    : "var(--color-accent-yellow-light)",
                }}
              >
                <span aria-hidden="true">→</span>
                <span>{statusLabel}</span>
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-fg-body sm:text-base">{period.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-fg-body">
            <span className="inline-flex rounded-full border border-border-muted px-3 py-1.5 font-semibold">
              {formatRange(period.startDate, period.endDate)}
            </span>
            <span
              className={`inline-flex rounded-full border border-border-muted px-3 py-1.5 font-semibold ${
                flattenedSurfaceMode ? "bg-transparent" : "bg-[var(--color-raised)]"
              }`}
            >
              {period.tasks.length} tasks
            </span>
          </div>
        </div>
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border-muted text-lg font-black text-fg-heading ${
            flattenedSurfaceMode ? "bg-transparent" : "bg-[var(--color-raised)]"
          } transition-colors duration-200 ease-out`}
          style={{
            boxShadow: "none",
          }}
          aria-hidden="true"
        >
          {expanded ? "-" : "+"}
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? "mt-5 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            aria-hidden={!expanded}
            className={`rounded-lg bg-transparent transition-all duration-300 ease-out ${
              expanded ? "translate-y-0 pt-0" : "-translate-y-1 pt-0"
            }`}
          >
            <ul className="grid gap-3">
              {period.tasks.map((task) => (
                <li
                  key={task}
                  className="flex items-start gap-3 rounded-2xl border border-border-muted bg-transparent px-3 py-3 text-sm leading-6 text-fg-body"
                >
                  <span className={taskMarkerClassName} aria-hidden="true" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
