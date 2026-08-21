import "server-only";

import { db } from "@/lib/db";
import { buildSubscriberConfirmToken } from "@/lib/email/subscriber-confirm-token";
import { listDistinctSubscriberSeriesWithToken } from "@/lib/email/subscriber-series";
import {
  EMAIL_SUBSCRIPTION_SERIES,
  normalizeEmailSeries,
  type EmailSubscriptionSeries,
} from "@/lib/email/subscription-series";
import { resolveSiteUrl } from "@/lib/site-url";
import { sendSubscriberConfirmationEmail } from "@/lib/email/waitlist";

export const DEFAULT_EMAIL_SERIES: EmailSubscriptionSeries = "general";

export interface EmailSubscriberRecord {
  id: string;
  email: string;
  series: string;
  email_verified: boolean | null;
  confirm_token_sent_at: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  resubscribed_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriberSeriesPreference {
  series: string;
  isSubscribed: boolean;
  isConfirmed: boolean;
  isPendingConfirmation: boolean;
  unsubscribedAt: string | null;
  confirmedAt: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mapSubscriber(row: Record<string, unknown>): EmailSubscriberRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    series: String(row.series),
    email_verified: row.email_verified === null ? null : Boolean(row.email_verified),
    confirm_token_sent_at: row.confirm_token_sent_at ? String(row.confirm_token_sent_at) : null,
    confirmed_at: row.confirmed_at ? String(row.confirmed_at) : null,
    unsubscribed_at: row.unsubscribed_at ? String(row.unsubscribed_at) : null,
    unsubscribe_reason: row.unsubscribe_reason ? String(row.unsubscribe_reason) : null,
    resubscribed_at: row.resubscribed_at ? String(row.resubscribed_at) : null,
    source: row.source ? String(row.source) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getSubscriberRecord(
  email: string,
  series: string,
): Promise<EmailSubscriberRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await db
    .from("email_subscribers")
    .select("*")
    .eq("email", normalizedEmail)
    .eq("series", series)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSubscriber(data as Record<string, unknown>) : null;
}

export async function getActiveSubscriber(
  email: string,
  series: string,
): Promise<EmailSubscriberRecord | null> {
  const subscriber = await getSubscriberRecord(email, series);
  if (!subscriber) return null;
  if (subscriber.unsubscribed_at) return null;
  if (!subscriber.confirmed_at) return null;
  return subscriber;
}

export async function listSubscriberPreferences(
  email: string,
  seriesList?: string[],
): Promise<SubscriberSeriesPreference[]> {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await db
    .from("email_subscribers")
    .select("*")
    .eq("email", normalizedEmail);
  if (error) throw new Error(error.message);

  const rows = new Map<string, EmailSubscriberRecord>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const mapped = mapSubscriber(row);
    rows.set(mapped.series, mapped);
  }

  const effectiveSeries = (seriesList && seriesList.length > 0 ? seriesList : EMAIL_SUBSCRIPTION_SERIES).map(
    (series) => series.trim(),
  );

  return effectiveSeries.map((series) => {
    const row = rows.get(series);
    const isWaitlistOptOut = series === "waitlist";
    return {
      series,
      isSubscribed: isWaitlistOptOut
        ? !row?.unsubscribed_at
        : Boolean(row?.confirmed_at) && !row?.unsubscribed_at,
      isConfirmed: isWaitlistOptOut ? !row?.unsubscribed_at : Boolean(row?.confirmed_at),
      isPendingConfirmation: Boolean(row?.confirm_token_sent_at) && !row?.confirmed_at,
      unsubscribedAt: row?.unsubscribed_at ?? null,
      confirmedAt: row?.confirmed_at ?? null,
    };
  });
}

export async function upsertSubscriber(args: {
  email: string;
  series: string;
  emailVerified?: boolean;
  source?: string | null;
  confirmedAt?: string | null;
  confirmTokenSentAt?: string | null;
  unsubscribedAt?: string | null;
  unsubscribeReason?: string | null;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const normalizedEmail = normalizeEmail(args.email);
  const existing = await getSubscriberRecord(normalizedEmail, args.series);

  if (existing) {
    const { error: updateError } = await db
      .from("email_subscribers")
      .update({
        email_verified: Boolean(existing.email_verified) || Boolean(args.emailVerified),
        source: args.source ?? existing.source,
        confirmed_at: args.confirmedAt !== undefined ? args.confirmedAt : existing.confirmed_at,
        confirm_token_sent_at:
          args.confirmTokenSentAt !== undefined
            ? args.confirmTokenSentAt
            : existing.confirm_token_sent_at,
        unsubscribed_at:
          args.unsubscribedAt !== undefined ? args.unsubscribedAt : existing.unsubscribed_at,
        unsubscribe_reason:
          args.unsubscribeReason !== undefined
            ? args.unsubscribeReason
            : existing.unsubscribe_reason,
        resubscribed_at: args.confirmedAt ? nowIso : existing.resubscribed_at,
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (updateError) throw new Error(updateError.message);
    return;
  }

  const { error: insertError } = await db.from("email_subscribers").insert({
    email: normalizedEmail,
    series: args.series,
    email_verified: args.emailVerified ?? false,
    source: args.source ?? null,
    confirmed_at: args.confirmedAt ?? null,
    confirm_token_sent_at: args.confirmTokenSentAt ?? null,
    unsubscribed_at: args.unsubscribedAt ?? null,
    unsubscribe_reason: args.unsubscribeReason ?? null,
    resubscribed_at: args.confirmedAt ? nowIso : null,
    updated_at: nowIso,
  });
  if (insertError) throw new Error(insertError.message);
}

export async function requestSubscriberConfirmation(args: {
  email: string;
  series: string | string[];
  source?: string | null;
  baseUrl?: string;
}): Promise<string[]> {
  const normalizedEmail = normalizeEmail(args.email);
  const seriesList = [
    ...new Set(
      (Array.isArray(args.series) ? args.series : [args.series])
        .map((value) => normalizeEmailSeries(value))
        .filter((value) => value && value !== "waitlist"),
    ),
  ];
  if (seriesList.length === 0) return [];

  const nowIso = new Date().toISOString();
  for (const series of seriesList) {
    await upsertSubscriber({
      email: normalizedEmail,
      series,
      emailVerified: false,
      source: args.source ?? "blog_subscribe",
      confirmTokenSentAt: nowIso,
    });
  }

  const token = buildSubscriberConfirmToken({
    email: normalizedEmail,
    series: seriesList,
  });
  const confirmUrl = `${(args.baseUrl ?? resolveSiteUrl()).replace(/\/$/, "")}/subscribe/confirm?token=${encodeURIComponent(token)}`;
  await sendSubscriberConfirmationEmail({
    email: normalizedEmail,
    series: seriesList,
    confirmUrl,
  });
  return seriesList;
}

export async function confirmSubscriberSeries(args: {
  email: string;
  series: string;
  source?: string | null;
}): Promise<void> {
  await upsertSubscriber({
    email: args.email,
    series: args.series,
    emailVerified: true,
    source: args.source ?? "subscriber_confirm",
    confirmedAt: new Date().toISOString(),
    confirmTokenSentAt: null,
    unsubscribedAt: null,
    unsubscribeReason: null,
  });
}

export async function unsubscribeSeries(email: string, series: string): Promise<number> {
  const subscriber = await getSubscriberRecord(email, series);
  const nowIso = new Date().toISOString();
  if (!subscriber) {
    await upsertSubscriber({
      email,
      series,
      unsubscribedAt: nowIso,
      unsubscribeReason: "preferences_page",
      source: "unsubscribe_preferences",
    });
    return 1;
  }

  const { data, error } = await db
    .from("email_subscribers")
    .update({
      unsubscribed_at: nowIso,
      unsubscribe_reason: "preferences_page",
      updated_at: nowIso,
    })
    .eq("id", subscriber.id)
    .select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

export async function unsubscribeAll(email: string, seriesList?: string[]): Promise<number> {
  let updated = 0;
  const effectiveSeries = seriesList && seriesList.length > 0 ? seriesList : EMAIL_SUBSCRIPTION_SERIES;
  for (const series of effectiveSeries) {
    updated += await unsubscribeSeries(email, series);
  }
  return updated;
}

export async function isVerifiedWaitlistEmail(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await db
    .from("zn_waitlist")
    .select("id, email_verified")
    .eq("email", normalizedEmail)
    .limit(50);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ email_verified?: boolean | null }>).some((row) =>
    Boolean(row.email_verified),
  );
}

export async function listPreferenceSeriesForEmail(
  email: string,
  tokenSeries?: string | null,
): Promise<string[]> {
  const series = await listDistinctSubscriberSeriesWithToken(tokenSeries);
  const tokenIsWaitlist = normalizeEmailSeries(tokenSeries ?? "") === "waitlist";
  if (tokenIsWaitlist || (await isVerifiedWaitlistEmail(email))) return series;
  return series.filter((value) => value !== "waitlist");
}

async function restoreWaitlistVerifiedSeries(email: string, series: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const existing = await getSubscriberRecord(email, series);
  await upsertSubscriber({
    email,
    series,
    emailVerified: true,
    source: "unsubscribe_preferences",
    confirmedAt: existing?.confirmed_at ?? nowIso,
    unsubscribedAt: null,
    unsubscribeReason: null,
  });
}

export async function applySubscriberPreferences(args: {
  email: string;
  desiredSeries: Record<string, boolean>;
  seriesList: string[];
  source?: string | null;
}): Promise<{ subscribed: string[]; unsubscribed: string[]; restored: string[] }> {
  const subscribed: string[] = [];
  const unsubscribed: string[] = [];
  const restored: string[] = [];
  const normalizedEmail = normalizeEmail(args.email);

  for (const series of args.seriesList.map(normalizeEmailSeries)) {
    const desired = Boolean(args.desiredSeries[series]);
    if (series === "waitlist") {
      if (desired) {
        const existing = await getSubscriberRecord(normalizedEmail, series);
        if (existing?.unsubscribed_at) {
          await restoreWaitlistVerifiedSeries(normalizedEmail, series);
          restored.push(series);
        }
        continue;
      }
      await unsubscribeSeries(normalizedEmail, series);
      unsubscribed.push(series);
      continue;
    }

    if (desired) {
      const active = await getActiveSubscriber(normalizedEmail, series);
      if (active) continue;
      await confirmSubscriberSeries({
        email: normalizedEmail,
        series,
        source: args.source ?? "unsubscribe_preferences",
      });
      subscribed.push(series);
      continue;
    }

    await unsubscribeSeries(normalizedEmail, series);
    unsubscribed.push(series);
  }

  return { subscribed, unsubscribed, restored };
}
