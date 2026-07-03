import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  DEFAULT_REFERINFO_POST_SCHEDULE,
  type ReferinfoPostDestination,
  type ReferinfoPostRenderMode,
  type ReferinfoPostScheduleInput,
  type ReferinfoPostScheduleState,
  isReferinfoPostDestination,
  isReferinfoPostRenderMode,
} from "@/lib/referinfo-post/types";

const SCHEDULE_ROW_ID = "default";
const LOCK_TTL_MS = 30 * 60 * 1000;

type ScheduleRow = {
  enabled: boolean | null;
  destination: string | null;
  render_mode: string | null;
  schedule_mode: string | null;
  weekly_weekday: number | null;
  weekly_hour: number | null;
  weekly_minute: number | null;
  weekly_timezone: string | null;
  last_run_started_at: string | null;
  last_run_completed_at: string | null;
  last_run_status: string | null;
  last_error: string | null;
  lock_expires_at: string | null;
};

function normalizeDestination(value: string | null | undefined): ReferinfoPostDestination {
  return isReferinfoPostDestination(value) ? value : DEFAULT_REFERINFO_POST_SCHEDULE.destination;
}

function normalizeRenderMode(value: string | null | undefined): ReferinfoPostRenderMode {
  return isReferinfoPostRenderMode(value) ? value : DEFAULT_REFERINFO_POST_SCHEDULE.renderMode;
}

function normalizeWeekday(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6
    ? value
    : DEFAULT_REFERINFO_POST_SCHEDULE.weeklyWeekday;
}

function normalizeHour(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : DEFAULT_REFERINFO_POST_SCHEDULE.weeklyHour;
}

function normalizeMinute(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 59
    ? value
    : DEFAULT_REFERINFO_POST_SCHEDULE.weeklyMinute;
}

function normalizeTimezone(value: string | null | undefined): string {
  const next = typeof value === "string" && value.trim() ? value.trim() : DEFAULT_REFERINFO_POST_SCHEDULE.weeklyTimezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: next }).format(new Date());
    return next;
  } catch {
    return DEFAULT_REFERINFO_POST_SCHEDULE.weeklyTimezone;
  }
}

function isMissingReferinfoLockFunctionError(message: string): boolean {
  return (
    message.includes("acquire_referinfo_post_schedule_lock") ||
    message.includes("release_referinfo_post_schedule_lock")
  );
}

function formatReferinfoLockError(message: string): string {
  if (!isMissingReferinfoLockFunctionError(message)) return message;
  return "Referinfo-post schedule/lock database functions are missing. Apply the SQL migration `2026-07-01-referinfo-post-schedule.sql` in Supabase, then retry.";
}

function isMissingReferinfoScheduleColumnsError(message: string): boolean {
  return (
    message.includes("weekly_weekday") ||
    message.includes("weekly_hour") ||
    message.includes("weekly_minute") ||
    message.includes("weekly_timezone")
  );
}

function formatReferinfoScheduleError(message: string): string {
  if (!isMissingReferinfoScheduleColumnsError(message)) return message;
  return "Referinfo-post weekly schedule columns are missing. Apply the SQL migration `2026-07-01-referinfo-post-schedule.sql` in Supabase, then retry.";
}

function mapScheduleRow(row: ScheduleRow | null | undefined): ReferinfoPostScheduleState {
  if (!row) return { ...DEFAULT_REFERINFO_POST_SCHEDULE };

  return {
    enabled: row.enabled ?? DEFAULT_REFERINFO_POST_SCHEDULE.enabled,
    destination: normalizeDestination(row.destination),
    renderMode: normalizeRenderMode(row.render_mode),
    scheduleMode: "weekly_time",
    weeklyWeekday: normalizeWeekday(row.weekly_weekday),
    weeklyHour: normalizeHour(row.weekly_hour),
    weeklyMinute: normalizeMinute(row.weekly_minute),
    weeklyTimezone: normalizeTimezone(row.weekly_timezone),
    lastRunStartedAt: row.last_run_started_at ?? null,
    lastRunCompletedAt: row.last_run_completed_at ?? null,
    lastRunStatus: row.last_run_status ?? null,
    lastError: row.last_error ?? null,
    lockExpiresAt: row.lock_expires_at ?? null,
  };
}

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    dateKey: `${read("year")}-${read("month")}-${read("day")}`,
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    weekday: weekdayMap[read("weekday")] ?? 0,
  };
}

function zonedMinutes(date: Date, timeZone: string): { dateKey: string; minutes: number; weekday: number } {
  const parts = zonedParts(date, timeZone);
  return {
    dateKey: parts.dateKey,
    minutes: parts.hour * 60 + parts.minute,
    weekday: parts.weekday,
  };
}

export async function getReferinfoPostScheduleState(): Promise<ReferinfoPostScheduleState> {
  const { data, error } = await db
    .from("referinfo_post_schedule")
    .select("enabled, destination, render_mode, schedule_mode, weekly_weekday, weekly_hour, weekly_minute, weekly_timezone, last_run_started_at, last_run_completed_at, last_run_status, last_error, lock_expires_at")
    .eq("id", SCHEDULE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load referinfo-post schedule state: ${formatReferinfoScheduleError(error.message)}`);
  }

  return mapScheduleRow((data ?? null) as ScheduleRow | null);
}

export async function saveReferinfoPostScheduleSettings(input: ReferinfoPostScheduleInput): Promise<ReferinfoPostScheduleState> {
  const weeklyTimezone = normalizeTimezone(input.weeklyTimezone);
  const weeklyWeekday = normalizeWeekday(input.weeklyWeekday);
  const weeklyHour = normalizeHour(input.weeklyHour);
  const weeklyMinute = normalizeMinute(input.weeklyMinute);
  const destination = normalizeDestination(input.destination);
  const renderMode = normalizeRenderMode(input.renderMode);
  const nowIso = new Date().toISOString();

  const { error } = await db.from("referinfo_post_schedule").upsert(
    {
      id: SCHEDULE_ROW_ID,
      enabled: !!input.enabled,
      destination,
      render_mode: renderMode,
      schedule_mode: "weekly_time",
      weekly_weekday: weeklyWeekday,
      weekly_hour: weeklyHour,
      weekly_minute: weeklyMinute,
      weekly_timezone: weeklyTimezone,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to save referinfo-post schedule settings: ${formatReferinfoScheduleError(error.message)}`);
  }

  return getReferinfoPostScheduleState();
}

export function isReferinfoPostDue(schedule: ReferinfoPostScheduleState, now = new Date()): boolean {
  if (!schedule.enabled) return false;
  const current = zonedMinutes(now, schedule.weeklyTimezone);
  if (current.weekday !== schedule.weeklyWeekday) return false;
  const currentMinutes = current.minutes;
  const scheduledMinutes = schedule.weeklyHour * 60 + schedule.weeklyMinute;
  if (currentMinutes < scheduledMinutes) return false;

  const anchor = schedule.lastRunCompletedAt ?? schedule.lastRunStartedAt;
  if (!anchor) return true;
  const lastRun = new Date(anchor);
  if (Number.isNaN(lastRun.getTime())) return true;
  const lastRunLocal = zonedMinutes(lastRun, schedule.weeklyTimezone);
  if (lastRunLocal.dateKey !== current.dateKey) return true;
  return lastRunLocal.minutes < scheduledMinutes;
}

export async function acquireReferinfoPostRunLock(): Promise<{ token: string }> {
  const token = randomUUID();
  const lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();

  const { data, error } = await db.rpc("acquire_referinfo_post_schedule_lock", {
    p_lock_token: token,
    p_lock_expires_at: lockExpiresAt,
  });

  if (error) {
    throw new Error(`Failed to acquire referinfo-post run lock: ${formatReferinfoLockError(error.message)}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Another referinfo-post run is already in progress.");
  }

  return { token };
}

export async function releaseReferinfoPostRunLock(args: {
  token: string;
  status: string;
  errorMessage?: string | null;
}): Promise<ReferinfoPostScheduleState> {
  const { error } = await db.rpc("release_referinfo_post_schedule_lock", {
    p_lock_token: args.token,
    p_status: args.status,
    p_error: args.errorMessage ?? null,
  });

  if (error) {
    throw new Error(`Failed to release referinfo-post run lock: ${formatReferinfoLockError(error.message)}`);
  }

  return getReferinfoPostScheduleState();
}
