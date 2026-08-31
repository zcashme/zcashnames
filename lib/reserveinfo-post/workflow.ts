import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { renderReserveinfoImage, reserveinfoCaption } from "@/lib/reserveinfo-post/deterministic";
import { buildReserveinfoXPostBody } from "@/lib/reserveinfo-post/x-delivery";
import type { ReserveinfoPostTemplateVariant } from "@/lib/reserveinfo-post/template-variant";
import { buildCompletedReserveinfoWindow, buildReserveinfoSchedule, normalizeReservedNames, paginateReservedNames, parseReservedNameMemo } from "@/lib/reserveinfo-post/planning";
import {
  acquireReserveinfoPostRunLock, createReserveinfoBatch, getReserveinfoBatch, getReserveinfoPostScheduleState,
  getReserveinfoQueue, releaseReserveinfoPostRunLock, updateReserveinfoQueueItem,
} from "@/lib/reserveinfo-post/store";
import {
  expandReserveinfoPostDestination,
  DEFAULT_RESERVEINFO_POST_SCHEDULE,
  type ReserveinfoName, type ReserveinfoPlannedPost, type ReserveinfoPostDestination, type ReserveinfoPostResult, type ReserveinfoPostScheduleState,
} from "@/lib/reserveinfo-post/types";

type TelegramConfig = { token: string; chatId: string };
type XConfig = { apiKey: string; apiSecret: string; accessToken: string; accessTokenSecret: string };
type Config = { outputDir: string; bucket: string; prefix: string };

const PROTECTION_REPLY = "See any names that should be protected to help prevent fraud, phishing, impersonation, or other abuse? Submit them here: ZcashNames.com/protect";

function required(name: string): string { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing required environment variable: ${name}.`); return value; }
function config(): Config {
  const bucket = process.env.RESERVEINFO_POST_STORAGE_BUCKET?.trim() || process.env.REFERINFO_POST_STORAGE_BUCKET?.trim() || process.env.BLOCKINFO_POST_STORAGE_BUCKET?.trim();
  if (!bucket) throw new Error("Reserveinfo storage configuration is missing RESERVEINFO_POST_STORAGE_BUCKET (or a referinfo/blockinfo fallback).");
  return { outputDir: path.resolve(process.env.RESERVEINFO_POST_OUTPUT_DIR?.trim() || (process.env.VERCEL ? "/tmp/reserveinfo-post" : "output/reserveinfo-post")), bucket, prefix: (process.env.RESERVEINFO_POST_STORAGE_PREFIX?.trim() || "reserveinfo/weekly").replace(/^\/+|\/+$/g, "") };
}
function telegram(): TelegramConfig { return { token: required("TELEGRAM_BOT_TOKEN"), chatId: required("TELEGRAM_CHAT_ID") }; }
function xConfig(): XConfig { return { apiKey: required("X_API_KEY"), apiSecret: required("X_API_SECRET"), accessToken: required("X_ACCESS_TOKEN"), accessTokenSecret: required("X_ACCESS_TOKEN_SECRET") }; }

function percentEncode(value: string) { return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`); }
function oauthHeader(args: { url: string; bodyParams?: Record<string, string>; config: XConfig }) {
  const oauth: Record<string, string> = { oauth_consumer_key: args.config.apiKey, oauth_nonce: randomBytes(16).toString("hex"), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: Math.floor(Date.now() / 1000).toString(), oauth_token: args.config.accessToken, oauth_version: "1.0" };
  const params = Object.entries({ ...(args.bodyParams ?? {}), ...oauth }).map(([key, value]) => [percentEncode(key), percentEncode(value)] as const).sort(([a, av], [b, bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&");
  oauth.oauth_signature = createHmac("sha1", `${percentEncode(args.config.apiSecret)}&${percentEncode(args.config.accessTokenSecret)}`).update(`POST&${percentEncode(args.url)}&${percentEncode(params)}`).digest("base64");
  return `OAuth ${Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`).join(", ")}`;
}

async function sendTelegram(buffer: Buffer, caption: string, fileName: string): Promise<number | null> {
  const auth = telegram(); const body = new FormData();
  body.append("chat_id", auth.chatId); body.append("caption", caption); body.append("photo", new Blob([new Uint8Array(buffer)], { type: "image/png" }), fileName);
  const response = await fetch(`https://api.telegram.org/bot${auth.token}/sendPhoto`, { method: "POST", body });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!response.ok || !payload.ok) throw new Error(`Telegram send failure: ${payload.description ?? response.statusText}`);
  return payload.result?.message_id ?? null;
}

async function sendTelegramReply(text: string, replyToMessageId: number): Promise<number | null> {
  const auth = telegram();
  const response = await fetch(`https://api.telegram.org/bot${auth.token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: auth.chatId, text, disable_web_page_preview: true, reply_to_message_id: replyToMessageId }),
  });
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!response.ok || !payload.ok) throw new Error(`Telegram protection reply failure: ${payload.description ?? response.statusText}`);
  return payload.result?.message_id ?? null;
}

async function createXPost(args: { text: string; mediaId?: string; replyTo?: string | null; quoteTweetId?: string | null }): Promise<string | null> {
  const auth = xConfig();
  const postUrl = "https://api.x.com/2/tweets";
  const response = await fetch(postUrl, {
    method: "POST",
    headers: { Authorization: oauthHeader({ url: postUrl, config: auth }), "Content-Type": "application/json" },
    body: JSON.stringify(buildReserveinfoXPostBody(args)),
  });
  const payload = await response.json().catch(() => ({})) as { data?: { id?: string }; detail?: string; title?: string };
  if (!response.ok || !payload.data?.id) throw new Error(`X post creation failure: ${payload.detail ?? payload.title ?? response.statusText}`);
  return payload.data.id ?? null;
}

async function sendX(buffer: Buffer, caption: string, quoteTweetId: string | null): Promise<string | null> {
  const auth = xConfig(); const uploadUrl = "https://upload.twitter.com/1.1/media/upload.json"; const params = { media_data: buffer.toString("base64") };
  const upload = await fetch(uploadUrl, { method: "POST", headers: { Authorization: oauthHeader({ url: uploadUrl, bodyParams: params, config: auth }), "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }, body: new URLSearchParams(params).toString() });
  const uploadPayload = await upload.json().catch(() => ({})) as { media_id_string?: string; errors?: Array<{ message?: string }> };
  if (!upload.ok || !uploadPayload.media_id_string) throw new Error(`X media upload failure: ${uploadPayload.errors?.map((entry) => entry.message).filter(Boolean).join("; ") ?? upload.statusText}`);
  return createXPost({ text: caption, mediaId: uploadPayload.media_id_string, quoteTweetId });
}

async function sendXProtectionReply(replyTo: string): Promise<string | null> {
  return createXPost({ text: PROTECTION_REPLY, replyTo });
}

async function fetchReservedNames(report: ReturnType<typeof buildCompletedReserveinfoWindow>): Promise<ReserveinfoName[]> {
  const rows: ReserveinfoName[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("zn_waitlist_reserves_transactions")
      .select("memo, detected_at")
      .eq("status", "confirmed")
      .eq("is_outgoing", false)
      .like("memo", "ZNS:RESERVE|Name::%")
      .gte("detected_at", report.weekStartIso)
      .lt("detected_at", report.weekEndIso)
      .order("detected_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`Failed to query reserve transactions from zn_waitlist_reserves_transactions: ${error.message}`);
    const page = (data ?? []) as Array<{ memo: string | null; detected_at: string | null }>;
    rows.push(...page.flatMap((row) => {
      const name = parseReservedNameMemo(row.memo);
      return name && row.detected_at ? [{ name, reservedAt: row.detected_at }] : [];
    }));
    if (page.length < 1000) break;
  }
  return normalizeReservedNames(rows);
}

function makePosts(names: ReserveinfoName[], report: ReturnType<typeof buildCompletedReserveinfoWindow>, output?: Config): ReserveinfoPlannedPost[] {
  const pages = paginateReservedNames(names); const times = buildReserveinfoSchedule(pages.length, report.weekStartDateKey, report.timeZone);
  return pages.map((page, pageIndex) => {
    const fileName = `reserveinfo-post-${report.weekStartDateKey}-${String(pageIndex + 1).padStart(2, "0")}.png`;
    const localFilePath = output ? path.join(output.outputDir, fileName) : "";
    const storageObjectPath = output ? `${output.prefix}/${report.weekStartDateKey}/${fileName}` : "";
    const post = { pageIndex, names: page.names, shownStart: page.shownStart, shownEnd: page.shownEnd, totalNames: names.length, scheduledAt: times[pageIndex], weekLabel: report.weekLabel, caption: "", localFilePath, storageObjectPath } satisfies ReserveinfoPlannedPost;
    return { ...post, caption: reserveinfoCaption(post) };
  });
}

export async function buildReserveinfoPreview(now = new Date(), scheduleOverride?: { weeklyTimezone: string }) {
  const schedule: ReserveinfoPostScheduleState = scheduleOverride
    ? { ...DEFAULT_RESERVEINFO_POST_SCHEDULE, ...scheduleOverride }
    : await getReserveinfoPostScheduleState().catch(() => ({ ...DEFAULT_RESERVEINFO_POST_SCHEDULE }));
  const reportWindow = buildCompletedReserveinfoWindow(now, schedule.weeklyTimezone); const names = await fetchReservedNames(reportWindow);
  return { schedule, reportWindow, names, plannedPosts: makePosts(names, reportWindow) };
}

async function ensureQueue(now: Date, scheduleDestination: ReserveinfoPostDestination) {
  const schedule = await getReserveinfoPostScheduleState(); const report = buildCompletedReserveinfoWindow(now, schedule.weeklyTimezone);
  const existing = await getReserveinfoBatch(report);
  if (existing) return { report, queue: await getReserveinfoQueue(report), created: false };
  const names = await fetchReservedNames(report); const prepared = makePosts(names, report, config());
  return { report, queue: await createReserveinfoBatch({ report, names, posts: prepared, destination: scheduleDestination }), created: true };
}

function incomplete(post: ReserveinfoPlannedPost, destination: ReserveinfoPostDestination): boolean {
  return expandReserveinfoPostDestination(destination).some((channel) => channel === "telegram"
    ? !post.telegramMessageId || !post.telegramProtectionMessageId
    : !post.xPostId || !post.xProtectionPostId);
}

function isWeekdayInZone(now: Date, timeZone: string): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  return weekday !== "Sat" && weekday !== "Sun";
}

export async function runReserveinfoPost(args: { mode: "run" | "dry-run"; destination?: ReserveinfoPostDestination; templateVariant?: ReserveinfoPostTemplateVariant; scheduled?: boolean; now?: Date }): Promise<ReserveinfoPostResult> {
  const now = args.now ?? new Date(); const schedule = args.mode === "dry-run"
    ? await getReserveinfoPostScheduleState().catch(() => ({ ...DEFAULT_RESERVEINFO_POST_SCHEDULE }))
    : await getReserveinfoPostScheduleState();
  const requested = args.destination ?? schedule.destination;
  if (args.mode === "dry-run") {
    const preview = await buildReserveinfoPreview(now, schedule);
    return { ok: true, mode: "dry-run", destinationsRequested: requested, reportWindow: preview.reportWindow, totalNames: preview.names.length, plannedPosts: preview.plannedPosts, schedule: preview.schedule };
  }
  let token: string | null = null;
  try {
    token = (await acquireReserveinfoPostRunLock()).token;
    if (args.scheduled && !isWeekdayInZone(now, schedule.weeklyTimezone)) {
      const released = await releaseReserveinfoPostRunLock({ token, status: "weekend_skip" }); token = null;
      return { ok: true, mode: "run", destinationsRequested: requested, scheduled: true, skipped: true, skipReason: "Reserveinfo posts run Monday through Friday.", plannedPosts: [], schedule: released };
    }
    const { report, queue } = await ensureQueue(now, schedule.destination);
    if (queue.length === 0) {
      const released = await releaseReserveinfoPostRunLock({ token, status: "empty_week" }); token = null;
      return { ok: true, mode: "run", destinationsRequested: requested, scheduled: !!args.scheduled, skipped: true, skipReason: "No reserved names in the completed week.", reportWindow: report, totalNames: 0, plannedPosts: [], schedule: released };
    }
    const due = queue.filter((post) => !args.scheduled || new Date(post.scheduledAt) <= now);
    const post = due.find((entry) => incomplete(entry, args.scheduled ? entry.destination ?? requested : requested));
    if (!post) {
      const released = await releaseReserveinfoPostRunLock({ token, status: "nothing_due" }); token = null;
      return { ok: true, mode: "run", destinationsRequested: requested, scheduled: !!args.scheduled, skipped: true, skipReason: args.scheduled ? "No queued page is due." : "All requested channels are complete.", reportWindow: report, totalNames: queue[0].totalNames, plannedPosts: queue, schedule: released };
    }
    const deliveryDestination = args.scheduled ? post.destination ?? requested : requested;
    if ((deliveryDestination === "x" || deliveryDestination === "both") && post.pageIndex > 0 && !queue[post.pageIndex - 1]?.xPostId) {
      const released = await releaseReserveinfoPostRunLock({ token, status: "waiting_for_x_thread" }); token = null;
      return { ok: true, mode: "run", destinationsRequested: requested, scheduled: !!args.scheduled, skipped: true, skipReason: "The preceding X thread page has not been published yet.", reportWindow: report, totalNames: post.totalNames, plannedPosts: queue, schedule: released };
    }
    const output = config();
    const buffer = await renderReserveinfoImage(post, args.templateVariant ?? schedule.templateVariant); const fileName = path.basename(post.localFilePath || `reserveinfo-post-${report.weekStartDateKey}-${String(post.pageIndex + 1).padStart(2, "0")}.png`);
    const localPath = post.localFilePath || path.join(output.outputDir, fileName); const storagePath = post.storageObjectPath || `${output.prefix}/${report.weekStartDateKey}/${fileName}`;
    await mkdir(path.dirname(localPath), { recursive: true }); await writeFile(localPath, buffer);
    const { error: storageError } = await db.storage.from(output.bucket).upload(storagePath, buffer, { contentType: "image/png", upsert: true });
    if (storageError) throw new Error(`Supabase Storage upload failure: ${storageError.message}`);
    await updateReserveinfoQueueItem(post, { image_status: "generated", image_generated_at: new Date().toISOString(), local_file_path: localPath, storage_object_path: storagePath });
    const next = { ...post, localFilePath: localPath, storageObjectPath: storagePath, imageStatus: "generated" };
    const errors: string[] = [];
    if (deliveryDestination === "telegram" || deliveryDestination === "both") {
      if (!post.telegramMessageId) {
        try { next.telegramMessageId = await sendTelegram(buffer, next.caption, fileName); await updateReserveinfoQueueItem(post, { telegram_message_id: next.telegramMessageId, telegram_error: null }); }
        catch (error) { next.telegramError = error instanceof Error ? error.message : String(error); errors.push(next.telegramError); await updateReserveinfoQueueItem(post, { telegram_error: next.telegramError }); }
      }
      if (next.telegramMessageId && !post.telegramProtectionMessageId) {
        try { next.telegramProtectionMessageId = await sendTelegramReply(PROTECTION_REPLY, next.telegramMessageId); await updateReserveinfoQueueItem(post, { telegram_protection_message_id: next.telegramProtectionMessageId, telegram_protection_error: null }); }
        catch (error) { next.telegramProtectionError = error instanceof Error ? error.message : String(error); errors.push(next.telegramProtectionError); await updateReserveinfoQueueItem(post, { telegram_protection_error: next.telegramProtectionError }); }
      }
    }
    if (deliveryDestination === "x" || deliveryDestination === "both") {
      if (!post.xPostId) {
        try { next.xPostId = await sendX(buffer, next.caption, post.pageIndex > 0 ? queue[post.pageIndex - 1]?.xPostId ?? null : null); await updateReserveinfoQueueItem(post, { x_post_id: next.xPostId, x_error: null }); }
        catch (error) { next.xError = error instanceof Error ? error.message : String(error); errors.push(next.xError); await updateReserveinfoQueueItem(post, { x_error: next.xError }); }
      }
      if (next.xPostId && !post.xProtectionPostId) {
        try { next.xProtectionPostId = await sendXProtectionReply(next.xPostId); await updateReserveinfoQueueItem(post, { x_protection_post_id: next.xProtectionPostId, x_protection_error: null }); }
        catch (error) { next.xProtectionError = error instanceof Error ? error.message : String(error); errors.push(next.xProtectionError); await updateReserveinfoQueueItem(post, { x_protection_error: next.xProtectionError }); }
      }
    }
    const released = await releaseReserveinfoPostRunLock({ token, status: errors.length ? "partial_failure" : "succeeded", errorMessage: errors.join(" | ") || null }); token = null;
    return { ok: errors.length === 0, mode: "run", destinationsRequested: requested, scheduled: !!args.scheduled, error: errors.join(" | ") || undefined, reportWindow: report, totalNames: post.totalNames, plannedPosts: [next], schedule: released };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error); const released = token ? await releaseReserveinfoPostRunLock({ token, status: "failed", errorMessage: message }).catch(() => undefined) : await getReserveinfoPostScheduleState().catch(() => undefined);
    return { ok: false, mode: "run", destinationsRequested: requested, scheduled: !!args.scheduled, error: message, plannedPosts: [], schedule: released };
  }
}
