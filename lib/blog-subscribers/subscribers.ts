"use server";

import { headers } from "next/headers";
import {
  CAPTCHA_ERROR_MESSAGE,
  CAPTCHA_FAILED_CODE,
  verifyRequestCaptcha,
} from "@/lib/captcha/http";
import { db } from "@/lib/db";
import { isBlogSubscriptionSlug, type BlogSubscriptionSlug } from "@/lib/blog-series";
import {
  isBlogSubscriberConfirmSignatureValid,
  isBlogSubscriberConfirmTokenExpired,
  parseBlogSubscriberConfirmToken,
} from "@/lib/blog-subscribers/confirm-token";
import { sendBlogSubscriberConfirmationEmail } from "@/lib/email/blog-subscribers";
import {
  buildSubscriberConfirmToken,
  isSubscriberConfirmSignatureValid,
  isSubscriberConfirmTokenExpired,
  parseSubscriberConfirmToken,
} from "@/lib/email/subscriber-confirm-token";
import { confirmSubscriberSeries, getActiveSubscriber } from "@/lib/email/subscribers";
import { normalizeEmailSeries } from "@/lib/email/subscription-series";
import { resolveSiteUrl } from "@/lib/site-url";

const GENERIC_ERROR = "Something went wrong. Please try again.";

type EmailSubscriberRow = {
  id: string;
  email: string;
  series: BlogSubscriptionSlug;
  email_verified: boolean;
  unsubscribed_at: string | null;
};

export type SubmitBlogSubscriptionResult =
  | { status: "submitted"; message: string }
  | { status: "resent"; message: string }
  | { status: "already"; message: string }
  | { status: "error"; error: string; code?: string };

export type ConfirmBlogSubscriptionResult =
  | { status: "success"; series: string[]; email: string }
  | { status: "already"; series: string[]; email: string }
  | { status: "invalid" };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

async function findSubscription(email: string, series: BlogSubscriptionSlug): Promise<EmailSubscriberRow | null> {
  const { data, error } = await db
    .from("email_subscribers")
    .select("id, email, series, email_verified, unsubscribed_at")
    .eq("email", email)
    .eq("series", series)
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (error) {
    console.error("Blog subscription lookup error:", error.message);
    return null;
  }

  return (data as EmailSubscriberRow | null) ?? null;
}

async function sendConfirmationEmail(
  email: string,
  seriesList: BlogSubscriptionSlug[],
): Promise<boolean> {
  if (seriesList.length === 0) return true;

  try {
    const headerStore = await headers();
    const baseUrl = resolveSiteUrl(headerStore);
    const token = buildSubscriberConfirmToken({
      email,
      series: seriesList,
    });
    const confirmUrl = `${baseUrl}/subscribe/confirm?token=${encodeURIComponent(token)}`;

    await sendBlogSubscriberConfirmationEmail({
      email,
      series: seriesList,
      confirmUrl,
    });

    const now = new Date().toISOString();
    const { error } = await db
      .from("email_subscribers")
      .update({
        confirm_token_sent_at: now,
        updated_at: now,
      })
      .eq("email", email)
      .in("series", seriesList);
    if (error) {
      console.error("Blog subscription confirm-token timestamp error:", error.message);
    }

    return true;
  } catch (error) {
    console.error("Blog subscription confirmation email error:", error);
    return false;
  }
}

export async function submitBlogSubscription(input: {
  email: string;
  series: string[];
  captcha_token: string;
  captcha_answer: string;
}): Promise<SubmitBlogSubscriptionResult> {
  if (
    !verifyRequestCaptcha({
      captcha_token: input.captcha_token,
      captcha_answer: input.captcha_answer,
    })
  ) {
    return {
      status: "error",
      error: CAPTCHA_ERROR_MESSAGE,
      code: CAPTCHA_FAILED_CODE,
    };
  }

  const email = normalizeEmail(input.email);
  const rawSeriesValues = input.series.map((value) => value.trim().toLowerCase());
  const uniqueSeriesValues = Array.from(new Set(rawSeriesValues));

  if (!isValidEmail(email)) {
    return { status: "error", error: "Please enter a valid email address." };
  }

  if (uniqueSeriesValues.length === 0 || uniqueSeriesValues.some((value) => !isBlogSubscriptionSlug(value))) {
    return { status: "error", error: GENERIC_ERROR };
  }

  const subscriptionSeries = uniqueSeriesValues as BlogSubscriptionSlug[];
  const pendingSeries: BlogSubscriptionSlug[] = [];

  for (const seriesValue of subscriptionSeries) {
    const active = await getActiveSubscriber(email, seriesValue);
    if (active) continue;

    let existing = await findSubscription(email, seriesValue);
    if (!existing) {
      const { data, error } = await db
        .from("email_subscribers")
        .insert({
          email,
          series: seriesValue,
          email_verified: false,
          source: "blog_subscribe",
        })
        .select("id, email, series, email_verified, unsubscribed_at")
        .single();

      if (error || !data) {
        if (!isUniqueViolation(error)) {
          console.error("Blog subscription insert error:", error?.message ?? "Missing subscriber row");
          return { status: "error", error: GENERIC_ERROR };
        }

        existing = await findSubscription(email, seriesValue);
        if (!existing) return { status: "error", error: GENERIC_ERROR };
      }
    }

    pendingSeries.push(seriesValue);
  }

  if (pendingSeries.length > 0) {
    const mailed = await sendConfirmationEmail(email, pendingSeries);
    if (!mailed) return { status: "error", error: GENERIC_ERROR };
    return {
      status: "submitted",
      message: "Check your inbox for the confirmation link.",
    };
  }

  return { status: "already", message: "You're already subscribed to the selected series." };
}

async function confirmSeriesList(
  email: string,
  seriesList: string[],
): Promise<ConfirmBlogSubscriptionResult> {
  const normalized = [
    ...new Set(seriesList.map((value) => normalizeEmailSeries(value)).filter(Boolean)),
  ];
  if (normalized.length === 0) return { status: "invalid" };

  const confirmed: string[] = [];
  const already: string[] = [];

  for (const series of normalized) {
    const wasActive = Boolean(await getActiveSubscriber(email, series));
    await confirmSubscriberSeries({
      email,
      series,
      source: "subscriber_confirm_link",
    });
    if (wasActive) already.push(series);
    else confirmed.push(series);
  }

  if (confirmed.length === 0) {
    return { status: "already", series: already, email };
  }
  return { status: "success", series: [...confirmed, ...already], email };
}

export async function confirmBlogSubscription(token: string): Promise<ConfirmBlogSubscriptionResult> {
  const parsed = parseSubscriberConfirmToken(token);
  if (parsed) {
    if (isSubscriberConfirmTokenExpired(parsed) || !isSubscriberConfirmSignatureValid(parsed)) {
      return { status: "invalid" };
    }
    return confirmSeriesList(parsed.email, parsed.seriesList);
  }

  const legacy = parseBlogSubscriberConfirmToken(token);
  if (!legacy || isBlogSubscriberConfirmTokenExpired(legacy)) {
    return { status: "invalid" };
  }

  const { data, error } = await db
    .from("email_subscribers")
    .select("id, email, series, email_verified, unsubscribed_at")
    .eq("id", legacy.subscriberId)
    .single();

  if (error || !data) return { status: "invalid" };

  const row = data as EmailSubscriberRow;
  if (!isBlogSubscriptionSlug(row.series)) return { status: "invalid" };
  if (!isBlogSubscriberConfirmSignatureValid(legacy, row.email, row.series)) {
    return { status: "invalid" };
  }

  return confirmSeriesList(row.email, [row.series]);
}
