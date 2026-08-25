import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  DEFAULT_BLOCKINFO_POST_SCHEDULE,
  type BlockinfoPostDestination,
  type BlockinfoPostRenderMode,
  type BlockinfoPostScheduleInput,
  type BlockinfoPostScheduleState,
  isBlockinfoPostDestination,
  isBlockinfoPostRenderMode,
} from "@/lib/blockinfo-post/types";
import { normalizeBlockinfoPostTemplateVariant } from "@/lib/blockinfo-post/template-variant";

const SCHEDULE_ROW_ID = "default";
const LOCK_TTL_MS = 30 * 60 * 1000;

type ScheduleRow = {
  enabled: boolean | null;
  destination: string | null;
  render_mode: string | null;
  template_variant: string | null;
  schedule_mode: string | null;
  interval_hours: number | null;
  daily_hour: number | null;
  daily_minute: number | null;
  daily_timezone: string | null;
  last_run_started_at: string | null;
  last_run_completed_at: string | null;
  last_run_status: string | null;
  last_error: string | null;
  lock_expires_at: string | null;
};

const DEFAULT_SCHEDULE: BlockinfoPostScheduleState = DEFAULT_BLOCKINFO_POST_SCHEDULE;

function isMissingBlockinfoLockFunctionError(message: string): boolean {
  return (
    message.includes("acquire_blockinfo_post_schedule_lock") ||
    message.includes("release_blockinfo_post_schedule_lock")
  );
}

function formatBlockinfoLockError(message: string): string {
  if (!isMissingBlockinfoLockFunctionError(message)) {
    return message;
  }

  return "Blockinfo-post schedule/lock database functions are missing. Apply the SQL migrations for `2026-06-28-blockinfo-post-schedule.sql` and `2026-06-28-blockinfo-post-render-mode.sql` in Supabase, then retry.";
}

function isMissingBlockinfoScheduleColumnsError(message: string): boolean {
  return (
    message.includes("schedule_mode") ||
    message.includes("daily_hour") ||
    message.includes("daily_minute") ||
    message.includes("daily_timezone")
  );
}

function formatBlockinfoScheduleError(message: string): string {
  if (!isMissingBlockinfoScheduleColumnsError(message)) {
    return message;
  }

  return "Blockinfo-post daily schedule columns are missing. Apply the SQL migration `2026-06-30-blockinfo-post-daily-schedule.sql` in Supabase, then retry.";
}

function normalizeDestination(value: string | null | undefined): BlockinfoPostDestination {
  return isBlockinfoPostDestination(value) ? value : DEFAULT_SCHEDULE.destination;
}

function normalizeRenderMode(value: string | null | undefined): BlockinfoPostRenderMode {
  return isBlockinfoPostRenderMode(value) ? value : DEFAULT_SCHEDULE.renderMode;
}

function normalizeTemplateVariant(value: string | null | undefined) {
  return normalizeBlockinfoPostTemplateVariant(value);
}

function normalizeScheduleMode(value: string | null | undefined): BlockinfoPostScheduleState["scheduleMode"] {
  return value === "daily_time" || value === "interval" ? value : DEFAULT_SCHEDULE.scheduleMode;
}

function normalizeDailyHour(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23
    ? value
    : DEFAULT_SCHEDULE.dailyHour;
}

function normalizeDailyMinute(value: number | null | undefined): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 59
    ? value
    : DEFAULT_SCHEDULE.dailyMinute;
}

function normalizeDailyTimezone(value: string | null | undefined): string {
  const next = typeof value === "string" && value.trim() ? value.trim() : DEFAULT_SCHEDULE.dailyTimezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: next }).format(new Date());
    return next;
  } catch {
    return DEFAULT_SCHEDULE.dailyTimezone;
  }
}

function mapScheduleRow(row: ScheduleRow | null | undefined): BlockinfoPostScheduleState {
  if (!row) return { ...DEFAULT_SCHEDULE };

  return {
    enabled: row.enabled ?? DEFAULT_SCHEDULE.enabled,
    destination: normalizeDestination(row.destination),
    renderMode: normalizeRenderMode(row.render_mode),
    templateVariant: normalizeTemplateVariant(row.template_variant),
    scheduleMode: normalizeScheduleMode(row.schedule_mode),
    intervalHours:
      typeof row.interval_hours === "number" && Number.isInteger(row.interval_hours) && row.interval_hours > 0
        ? row.interval_hours
        : DEFAULT_SCHEDULE.intervalHours,
    dailyHour: normalizeDailyHour(row.daily_hour),
    dailyMinute: normalizeDailyMinute(row.daily_minute),
    dailyTimezone: normalizeDailyTimezone(row.daily_timezone),
    lastRunStartedAt: row.last_run_started_at ?? null,
    lastRunCompletedAt: row.last_run_completed_at ?? null,
    lastRunStatus: row.last_run_status ?? null,
    lastError: row.last_error ?? null,
    lockExpiresAt: row.lock_expires_at ?? null,
  };
}

function normalizeIntervalHours(value: number): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Interval hours must be a positive whole number.");
  }
  return value;
}

function normalizeDailyScheduleInput(args: {
  scheduleMode: BlockinfoPostScheduleInput["scheduleMode"];
  dailyHour: number;
  dailyMinute: number;
  dailyTimezone: string;
}) {
  const scheduleMode = args.scheduleMode === "daily_time" ? "daily_time" : "interval";
  const dailyHour = normalizeDailyHour(args.dailyHour);
  const dailyMinute = normalizeDailyMinute(args.dailyMinute);
  const dailyTimezone = typeof args.dailyTimezone === "string" && args.dailyTimezone.trim()
    ? args.dailyTimezone.trim()
    : DEFAULT_SCHEDULE.dailyTimezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: dailyTimezone }).format(new Date());
  } catch {
    throw new Error("Daily timezone must be a valid IANA timezone, such as America/New_York.");
  }
  return { scheduleMode, dailyHour, dailyMinute, dailyTimezone };
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
  });
  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const year = read("year");
  const month = read("month");
  const day = read("day");
  const hour = Number(read("hour"));
  const minute = Number(read("minute"));
  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

function zonedMinutes(date: Date, timeZone: string): { dateKey: string; minutes: number } {
  const parts = zonedParts(date, timeZone);
  return {
    dateKey: parts.dateKey,
    minutes: parts.hour * 60 + parts.minute,
  };
}

export async function getBlockinfoPostScheduleState(): Promise<BlockinfoPostScheduleState> {
  const { data, error } = await db
    .from("blockinfo_post_schedule")
    .select("enabled, destination, render_mode, template_variant, schedule_mode, interval_hours, daily_hour, daily_minute, daily_timezone, last_run_started_at, last_run_completed_at, last_run_status, last_error, lock_expires_at")
    .eq("id", SCHEDULE_ROW_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load blockinfo-post schedule state: ${formatBlockinfoScheduleError(error.message)}`);
  }

  return mapScheduleRow((data ?? null) as ScheduleRow | null);
}

export async function saveBlockinfoPostScheduleSettings(
  input: BlockinfoPostScheduleInput,
): Promise<BlockinfoPostScheduleState> {
  const destination = normalizeDestination(input.destination);
  const renderMode = normalizeRenderMode(input.renderMode);
  const templateVariant = normalizeTemplateVariant(input.templateVariant);
  const intervalHours = normalizeIntervalHours(input.intervalHours);
  const { scheduleMode, dailyHour, dailyMinute, dailyTimezone } = normalizeDailyScheduleInput(input);
  const nowIso = new Date().toISOString();

  const { error } = await db.from("blockinfo_post_schedule").upsert(
    {
      id: SCHEDULE_ROW_ID,
      enabled: !!input.enabled,
      destination,
      render_mode: renderMode,
      template_variant: templateVariant,
      schedule_mode: scheduleMode,
      interval_hours: intervalHours,
      daily_hour: dailyHour,
      daily_minute: dailyMinute,
      daily_timezone: dailyTimezone,
      updated_at: nowIso,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw new Error(`Failed to save blockinfo-post schedule settings: ${formatBlockinfoScheduleError(error.message)}`);
  }

  return getBlockinfoPostScheduleState();
}

export function isBlockinfoPostDue(schedule: BlockinfoPostScheduleState, now = new Date()): boolean {
  if (!schedule.enabled) return false;

  if (schedule.scheduleMode === "daily_time") {
    const current = zonedMinutes(now, schedule.dailyTimezone);
    const currentMinutes = current.minutes;
    const scheduledMinutes = schedule.dailyHour * 60 + schedule.dailyMinute;
    if (currentMinutes < scheduledMinutes) return false;

    const anchor = schedule.lastRunCompletedAt ?? schedule.lastRunStartedAt;
    if (!anchor) return true;

    const lastRun = new Date(anchor);
    if (Number.isNaN(lastRun.getTime())) return true;
    const lastRunLocal = zonedMinutes(lastRun, schedule.dailyTimezone);
    if (lastRunLocal.dateKey !== current.dateKey) return true;
    return lastRunLocal.minutes < scheduledMinutes;
  }

  const anchor = schedule.lastRunCompletedAt ?? schedule.lastRunStartedAt;
  if (!anchor) return true;
  const nextDueAt = new Date(anchor).getTime() + schedule.intervalHours * 60 * 60 * 1000;
  return now.getTime() >= nextDueAt;
}

export async function acquireBlockinfoPostRunLock(): Promise<{ token: string }> {
  const token = randomUUID();
  const lockExpiresAt = new Date(Date.now() + LOCK_TTL_MS).toISOString();

  const { data, error } = await db.rpc("acquire_blockinfo_post_schedule_lock", {
    p_lock_token: token,
    p_lock_expires_at: lockExpiresAt,
  });

  if (error) {
    throw new Error(`Failed to acquire blockinfo-post run lock: ${formatBlockinfoLockError(error.message)}`);
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Another blockinfo-post run is already in progress.");
  }

  return { token };
}

export async function releaseBlockinfoPostRunLock(args: {
  token: string;
  status: string;
  errorMessage?: string | null;
}): Promise<BlockinfoPostScheduleState> {
  const { error } = await db.rpc("release_blockinfo_post_schedule_lock", {
    p_lock_token: args.token,
    p_status: args.status,
    p_error: args.errorMessage ?? null,
  });

  if (error) {
    throw new Error(`Failed to release blockinfo-post run lock: ${formatBlockinfoLockError(error.message)}`);
  }

  return getBlockinfoPostScheduleState();
}
