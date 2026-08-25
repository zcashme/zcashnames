import type { ReserveinfoPostTemplateVariant } from "@/lib/reserveinfo-post/template-variant";

export const RESERVEINFO_POST_DESTINATIONS = ["telegram", "x", "both"] as const;

export type ReserveinfoPostDestination = (typeof RESERVEINFO_POST_DESTINATIONS)[number];
export type ReserveinfoPostChannel = "telegram" | "x";
export type ReserveinfoPostMode = "run" | "dry-run";

export type ReserveinfoName = {
  name: string;
  reservedAt: string;
};

export type ReserveinfoReportWindow = {
  timeZone: string;
  weekStartIso: string;
  weekEndIso: string;
  weekStartDateKey: string;
  weekEndDateKey: string;
  weekLabel: string;
};

export type ReserveinfoPlannedPost = {
  queueId?: string;
  destination?: ReserveinfoPostDestination;
  pageIndex: number;
  names: ReserveinfoName[];
  shownStart: number;
  shownEnd: number;
  totalNames: number;
  scheduledAt: string;
  weekLabel: string;
  caption: string;
  localFilePath: string;
  storageObjectPath: string;
  telegramMessageId?: number | null;
  telegramProtectionMessageId?: number | null;
  xPostId?: string | null;
  xProtectionPostId?: string | null;
  telegramError?: string | null;
  telegramProtectionError?: string | null;
  xError?: string | null;
  xProtectionError?: string | null;
  imageStatus?: string | null;
};

export type ReserveinfoPostScheduleState = {
  enabled: boolean;
  destination: ReserveinfoPostDestination;
  templateVariant: ReserveinfoPostTemplateVariant;
  weeklyTimezone: string;
  lastRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunStatus: string | null;
  lastError: string | null;
  lockExpiresAt: string | null;
};

export const DEFAULT_RESERVEINFO_POST_SCHEDULE: ReserveinfoPostScheduleState = {
  enabled: false,
  destination: "both",
  templateVariant: "original",
  weeklyTimezone: "America/New_York",
  lastRunStartedAt: null,
  lastRunCompletedAt: null,
  lastRunStatus: null,
  lastError: null,
  lockExpiresAt: null,
};

export type ReserveinfoPostResult = {
  ok: boolean;
  mode: ReserveinfoPostMode;
  destinationsRequested: ReserveinfoPostDestination;
  scheduled?: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  reportWindow?: ReserveinfoReportWindow;
  totalNames?: number;
  plannedPosts: ReserveinfoPlannedPost[];
  schedule?: ReserveinfoPostScheduleState;
};

export function isReserveinfoPostDestination(value: string | null | undefined): value is ReserveinfoPostDestination {
  return value === "telegram" || value === "x" || value === "both";
}

export function expandReserveinfoPostDestination(destination: ReserveinfoPostDestination): ReserveinfoPostChannel[] {
  return destination === "both" ? ["telegram", "x"] : [destination];
}
