import { parseIsoDateUtc, type RoadmapPeriod } from "./roadmap";

export type RoadmapPeriodLayout = RoadmapPeriod & {
  isCurrent: boolean;
  isUpcoming: boolean;
};

export function buildRoadmapLayouts(periods: RoadmapPeriod[], today: Date): RoadmapPeriodLayout[] {
  const currentIds = new Set(
    periods
      .filter((period) => {
        const start = parseIsoDateUtc(period.startDate);
        const end = parseIsoDateUtc(period.endDate);
        return today.getTime() >= start.getTime() && today.getTime() <= end.getTime();
      })
      .map((period) => period.id),
  );
  const upcomingId =
    currentIds.size === 0
      ? periods.find((period) => parseIsoDateUtc(period.startDate).getTime() > today.getTime())?.id
      : undefined;

  return periods.map((period) => ({
    ...period,
    isCurrent: currentIds.has(period.id),
    isUpcoming: period.id === upcomingId,
  }));
}

export function countCompletedRoadmapPeriods(periods: RoadmapPeriod[], today: Date): number {
  return periods.filter((period) => parseIsoDateUtc(period.endDate).getTime() < today.getTime()).length;
}

export function buildRoadmapShareMessage({
  currentFocusTitle,
  completedCount,
  totalCount,
  shareUrl,
}: {
  currentFocusTitle: string;
  completedCount: number;
  totalCount: number;
  shareUrl: string;
}): string {
  return `ZcashNames is currently focusing on their ${currentFocusTitle}, having completed ${completedCount} of the ${totalCount} phases in their roadmap so far. Check it out: ${shareUrl}`;
}
