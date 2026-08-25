import "server-only";

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  DEFAULT_RESERVEINFO_POST_SCHEDULE,
  isReserveinfoPostDestination,
  type ReserveinfoName,
  type ReserveinfoPlannedPost,
  type ReserveinfoPostDestination,
  type ReserveinfoPostScheduleState,
  type ReserveinfoReportWindow,
} from "@/lib/reserveinfo-post/types";
import { normalizeReserveinfoPostTemplateVariant } from "@/lib/reserveinfo-post/template-variant";

const SCHEDULE_ROW_ID = "default";
const LOCK_TTL_MS = 30 * 60 * 1000;

type ScheduleRow = {
  enabled: boolean | null; destination: string | null; template_variant: string | null; weekly_timezone: string | null;
  last_run_started_at: string | null; last_run_completed_at: string | null; last_run_status: string | null;
  last_error: string | null; lock_expires_at: string | null;
};

type QueueRow = {
  id: string; page_index: number; names: ReserveinfoName[]; shown_start: number; shown_end: number; total_names: number;
  scheduled_at: string; week_label: string | null; destination: string; caption: string; local_file_path: string | null; storage_object_path: string | null;
  image_status: string | null; telegram_message_id: number | null; telegram_protection_message_id: number | null; telegram_error: string | null; telegram_protection_error: string | null;
  x_post_id: string | null; x_protection_post_id: string | null; x_error: string | null; x_protection_error: string | null;
};

function destination(value: string | null | undefined): ReserveinfoPostDestination {
  return isReserveinfoPostDestination(value) ? value : DEFAULT_RESERVEINFO_POST_SCHEDULE.destination;
}

function timezone(value: string | null | undefined): string {
  const next = value?.trim() || DEFAULT_RESERVEINFO_POST_SCHEDULE.weeklyTimezone;
  try { new Intl.DateTimeFormat("en-US", { timeZone: next }).format(); return next; } catch { return DEFAULT_RESERVEINFO_POST_SCHEDULE.weeklyTimezone; }
}

function setupError(message: string): string {
  return message.includes("reserveinfo_post_") || message.includes("acquire_reserveinfo") || message.includes("release_reserveinfo")
    ? "Reserveinfo-post tables or lock functions are missing. Apply `sql/2026-08-24-reserveinfo-post-schedule.sql` in Supabase, then retry."
    : message;
}

function mapSchedule(row: ScheduleRow | null): ReserveinfoPostScheduleState {
  if (!row) return { ...DEFAULT_RESERVEINFO_POST_SCHEDULE };
  return {
    enabled: row.enabled ?? false, destination: destination(row.destination), templateVariant: normalizeReserveinfoPostTemplateVariant(row.template_variant), weeklyTimezone: timezone(row.weekly_timezone),
    lastRunStartedAt: row.last_run_started_at, lastRunCompletedAt: row.last_run_completed_at, lastRunStatus: row.last_run_status,
    lastError: row.last_error, lockExpiresAt: row.lock_expires_at,
  };
}

function mapQueue(row: QueueRow): ReserveinfoPlannedPost {
  return {
    queueId: row.id,
    destination: destination(row.destination),
    pageIndex: row.page_index, names: row.names ?? [], shownStart: row.shown_start, shownEnd: row.shown_end, totalNames: row.total_names,
    scheduledAt: row.scheduled_at, weekLabel: row.week_label ?? "", caption: row.caption, localFilePath: row.local_file_path ?? "", storageObjectPath: row.storage_object_path ?? "",
    imageStatus: row.image_status, telegramMessageId: row.telegram_message_id, telegramProtectionMessageId: row.telegram_protection_message_id,
    telegramError: row.telegram_error, telegramProtectionError: row.telegram_protection_error, xPostId: row.x_post_id,
    xProtectionPostId: row.x_protection_post_id, xError: row.x_error, xProtectionError: row.x_protection_error,
  };
}

export async function getReserveinfoPostScheduleState(): Promise<ReserveinfoPostScheduleState> {
  const { data, error } = await db.from("reserveinfo_post_schedule").select("enabled, destination, template_variant, weekly_timezone, last_run_started_at, last_run_completed_at, last_run_status, last_error, lock_expires_at").eq("id", SCHEDULE_ROW_ID).maybeSingle();
  if (error) throw new Error(`Failed to load reserveinfo-post schedule state: ${setupError(error.message)}`);
  return mapSchedule(data as ScheduleRow | null);
}

export async function saveReserveinfoPostScheduleSettings(input: Pick<ReserveinfoPostScheduleState, "enabled" | "destination" | "templateVariant" | "weeklyTimezone">): Promise<ReserveinfoPostScheduleState> {
  const { error } = await db.from("reserveinfo_post_schedule").upsert({ id: SCHEDULE_ROW_ID, enabled: input.enabled, destination: destination(input.destination), template_variant: normalizeReserveinfoPostTemplateVariant(input.templateVariant), weekly_timezone: timezone(input.weeklyTimezone), updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw new Error(`Failed to save reserveinfo-post schedule: ${setupError(error.message)}`);
  return getReserveinfoPostScheduleState();
}

export async function acquireReserveinfoPostRunLock(): Promise<{ token: string }> {
  const token = randomUUID();
  const { data, error } = await db.rpc("acquire_reserveinfo_post_schedule_lock", { p_lock_token: token, p_lock_expires_at: new Date(Date.now() + LOCK_TTL_MS).toISOString() });
  if (error) throw new Error(`Failed to acquire reserveinfo-post run lock: ${setupError(error.message)}`);
  if (!Array.isArray(data) || data.length === 0) throw new Error("Another reserveinfo-post run is already in progress.");
  return { token };
}

export async function releaseReserveinfoPostRunLock(args: { token: string; status: string; errorMessage?: string | null }): Promise<ReserveinfoPostScheduleState> {
  const { error } = await db.rpc("release_reserveinfo_post_schedule_lock", { p_lock_token: args.token, p_status: args.status, p_error: args.errorMessage ?? null });
  if (error) throw new Error(`Failed to release reserveinfo-post run lock: ${setupError(error.message)}`);
  return getReserveinfoPostScheduleState();
}

export async function getReserveinfoBatch(report: ReserveinfoReportWindow): Promise<{ id: string; totalNames: number } | null> {
  const { data, error } = await db.from("reserveinfo_post_batches").select("id, total_names").eq("source_week_start", report.weekStartDateKey).maybeSingle();
  if (error) throw new Error(`Failed to load reserveinfo batch: ${setupError(error.message)}`);
  return data ? { id: data.id as string, totalNames: data.total_names as number } : null;
}

export async function getReserveinfoQueue(report: ReserveinfoReportWindow): Promise<ReserveinfoPlannedPost[]> {
  const batch = await getReserveinfoBatch(report);
  if (!batch) return [];
  const { data, error } = await db.from("reserveinfo_post_queue").select("id, page_index, names, shown_start, shown_end, total_names, scheduled_at, week_label, destination, caption, local_file_path, storage_object_path, image_status, telegram_message_id, telegram_protection_message_id, telegram_error, telegram_protection_error, x_post_id, x_protection_post_id, x_error, x_protection_error").eq("batch_id", batch.id).order("page_index");
  if (error) throw new Error(`Failed to load reserveinfo queue: ${setupError(error.message)}`);
  return ((data ?? []) as QueueRow[]).map(mapQueue);
}

export async function createReserveinfoBatch(args: { report: ReserveinfoReportWindow; names: ReserveinfoName[]; posts: ReserveinfoPlannedPost[]; destination: ReserveinfoPostDestination }): Promise<ReserveinfoPlannedPost[]> {
  const existing = await getReserveinfoBatch(args.report);
  if (existing) return getReserveinfoQueue(args.report);
  const { data: batch, error: batchError } = await db.from("reserveinfo_post_batches").insert({ source_week_start: args.report.weekStartDateKey, source_week_end: args.report.weekEndDateKey, weekly_timezone: args.report.timeZone, total_names: args.names.length, names: args.names }).select("id").single();
  if (batchError) throw new Error(`Failed to create reserveinfo batch: ${setupError(batchError.message)}`);
  const { error: queueError } = await db.from("reserveinfo_post_queue").insert(args.posts.map((post) => ({ batch_id: batch.id, page_index: post.pageIndex, names: post.names, shown_start: post.shownStart, shown_end: post.shownEnd, total_names: post.totalNames, scheduled_at: post.scheduledAt, week_label: post.weekLabel, destination: args.destination, caption: post.caption, local_file_path: post.localFilePath || null, storage_object_path: post.storageObjectPath || null, image_status: "pending" })));
  if (queueError) throw new Error(`Failed to create reserveinfo queue: ${setupError(queueError.message)}`);
  return getReserveinfoQueue(args.report);
}

export async function updateReserveinfoQueueItem(page: ReserveinfoPlannedPost, values: Record<string, unknown>): Promise<void> {
  if (!page.queueId) throw new Error("Reserveinfo queue item is missing its persistent id.");
  const { error } = await db.from("reserveinfo_post_queue").update({ ...values, updated_at: new Date().toISOString() }).eq("id", page.queueId);
  if (error) throw new Error(`Failed to update reserveinfo queue item: ${setupError(error.message)}`);
}
