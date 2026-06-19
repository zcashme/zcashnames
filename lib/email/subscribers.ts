import "server-only";

import { db } from "@/lib/db";
import { buildSubscriberConfirmToken } from "@/lib/email/subscriber-confirm-token";
import { EMAIL_SUBSCRIPTION_SERIES, type EmailSubscriptionSeries } from "@/lib/email/subscription-series";
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
  series: EmailSubscriptionSeries;
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

async function getSubscriber(
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
  const subscriber = await getSubscriber(email, series);
  if (!subscriber) return null;
  if (subscriber.unsubscribed_at) return null;
  if (!subscriber.confirmed_at) return null;
  return subscriber;
}

export async function listSubscriberPreferences(
  email: string,
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

  return EMAIL_SUBSCRIPTION_SERIES.map((series) => {
    const row = rows.get(series);
    return {
      series,
      isSubscribed: Boolean(row?.confirmed_at) && !row?.unsubscribed_at,
      isConfirmed: Boolean(row?.confirmed_at),
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
  const existing = await getSubscriber(normalizedEmail, args.series);

  if (existing) {
    const { error: updateError } = await db
      .from("email_subscribers")
      .update({
        email_verified: Boolean(existing.email_verified) || Boolean(args.emailVerified),
        source: args.source ?? existing.source,
        confirmed_at: args.confirmedAt ?? existing.confirmed_at,
        confirm_token_sent_at: args.confirmTokenSentAt ?? existing.confirm_token_sent_at,
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
  series: EmailSubscriptionSeries;
  source?: string | null;
  baseUrl?: string;
}): Promise<void> {
  const normalizedEmail = normalizeEmail(args.email);
  const nowIso = new Date().toISOString();
  await upsertSubscriber({
    email: normalizedEmail,
    series: args.series,
    emailVerified: false,
    source: args.source ?? "unsubscribe_preferences",
    confirmTokenSentAt: nowIso,
  });

  const token = buildSubscriberConfirmToken({
    email: normalizedEmail,
    series: args.series,
  });
  const confirmUrl = `${(args.baseUrl ?? resolveSiteUrl()).replace(/\/$/, "")}/unsubscribe/confirm?token=${encodeURIComponent(token)}`;
  await sendSubscriberConfirmationEmail({
    email: normalizedEmail,
    series: args.series,
    confirmUrl,
  });
}

export async function confirmSubscriberSeries(args: {
  email: string;
  series: EmailSubscriptionSeries;
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
  const subscriber = await getSubscriber(email, series);
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

export async function unsubscribeAll(email: string): Promise<number> {
  let updated = 0;
  for (const series of EMAIL_SUBSCRIPTION_SERIES) {
    updated += await unsubscribeSeries(email, series);
  }
  return updated;
}

export async function applySubscriberPreferences(args: {
  email: string;
  desiredSeries: Record<EmailSubscriptionSeries, boolean>;
  source?: string | null;
  baseUrl?: string;
}): Promise<{
  confirmationRequested: EmailSubscriptionSeries[];
  unsubscribed: EmailSubscriptionSeries[];
}> {
  const confirmationRequested: EmailSubscriptionSeries[] = [];
  const unsubscribed: EmailSubscriptionSeries[] = [];
  const normalizedEmail = normalizeEmail(args.email);

  for (const series of EMAIL_SUBSCRIPTION_SERIES) {
    if (args.desiredSeries[series]) {
      const active = await getActiveSubscriber(normalizedEmail, series);
      if (!active) {
        await requestSubscriberConfirmation({
          email: normalizedEmail,
          series,
          source: args.source ?? "unsubscribe_preferences",
          baseUrl: args.baseUrl,
        });
        confirmationRequested.push(series);
      }
      continue;
    }

    await unsubscribeSeries(normalizedEmail, series);
    unsubscribed.push(series);
  }

  return { confirmationRequested, unsubscribed };
}
