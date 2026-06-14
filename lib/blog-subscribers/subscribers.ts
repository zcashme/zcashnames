"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { isBlogSubscriptionSlug, type BlogSubscriptionSlug } from "@/lib/blog-series";
import { buildBlogSubscriberConfirmToken, isBlogSubscriberConfirmSignatureValid, isBlogSubscriberConfirmTokenExpired, parseBlogSubscriberConfirmToken } from "@/lib/blog-subscribers/confirm-token";
import { sendBlogSubscriberConfirmationEmail } from "@/lib/email/blog-subscribers";
import { resolveSiteUrl } from "@/lib/site-url";

const GENERIC_ERROR = "Something went wrong. Please try again.";

type EmailSubscriberRow = {
  id: string;
  email: string;
  series: BlogSubscriptionSlug;
  email_verified: boolean;
};

export type SubmitBlogSubscriptionResult =
  | { status: "submitted"; message: string }
  | { status: "resent"; message: string }
  | { status: "already"; message: string }
  | { status: "error"; error: string };

export type ConfirmBlogSubscriptionResult =
  | { status: "success"; series: BlogSubscriptionSlug }
  | { status: "already"; series: BlogSubscriptionSlug }
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
    .select("id, email, series, email_verified")
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

async function sendConfirmationEmail(row: EmailSubscriberRow): Promise<boolean> {
  try {
    const headerStore = await headers();
    const baseUrl = resolveSiteUrl(headerStore);
    const token = buildBlogSubscriberConfirmToken({
      subscriberId: row.id,
      email: row.email,
      series: row.series,
    });
    const confirmUrl = `${baseUrl}/blogs/confirm?token=${encodeURIComponent(token)}`;

    await sendBlogSubscriberConfirmationEmail({
      email: row.email,
      series: row.series,
      confirmUrl,
    });

    await db
      .from("email_subscribers")
      .update({
        confirm_token_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    return true;
  } catch (error) {
    console.error("Blog subscription confirmation email error:", error);
    return false;
  }
}

export async function submitBlogSubscription(input: {
  email: string;
  series: string[];
}): Promise<SubmitBlogSubscriptionResult> {
  const email = normalizeEmail(input.email);
  const rawSeriesValues = input.series.map((value) => value.trim().toLowerCase());
  const uniqueSeriesValues = Array.from(new Set(rawSeriesValues));

  if (!isValidEmail(email)) {
    return { status: "error", error: "Please enter a valid email address." };
  }

  if (uniqueSeriesValues.length === 0 || uniqueSeriesValues.some((value) => !isBlogSubscriptionSlug(value))) {
    return { status: "error", error: GENERIC_ERROR };
  }

  const submittedSeries: BlogSubscriptionSlug[] = [];
  const resentSeries: BlogSubscriptionSlug[] = [];
  const alreadySeries: BlogSubscriptionSlug[] = [];

  for (const seriesValue of uniqueSeriesValues) {
    let existing = await findSubscription(email, seriesValue);
    const hadExistingRow = Boolean(existing);

    if (existing?.email_verified) {
      alreadySeries.push(seriesValue);
      continue;
    }

    if (!existing) {
      const { data, error } = await db
        .from("email_subscribers")
        .insert({
          email,
          series: seriesValue,
          email_verified: false,
        })
        .select("id, email, series, email_verified")
        .single();

      if (error || !data) {
        if (!isUniqueViolation(error)) {
          console.error("Blog subscription insert error:", error?.message ?? "Missing subscriber row");
          return { status: "error", error: GENERIC_ERROR };
        }

        existing = await findSubscription(email, seriesValue);
        if (!existing) return { status: "error", error: GENERIC_ERROR };
      } else {
        existing = data as EmailSubscriberRow;
      }
    }

    const mailed = await sendConfirmationEmail(existing);
    if (!mailed) return { status: "error", error: GENERIC_ERROR };

    if (hadExistingRow) {
      resentSeries.push(seriesValue);
    } else {
      submittedSeries.push(seriesValue);
    }
  }

  if (submittedSeries.length > 0) {
    return {
      status: "submitted",
      message:
        submittedSeries.length === 1 && resentSeries.length === 0 && alreadySeries.length === 0
          ? "Check your inbox for the confirmation link."
          : "Check your inbox for confirmation links for the selected series.",
    };
  }

  if (resentSeries.length > 0) {
    return { status: "resent", message: "Check your inbox for the confirmation links." };
  }

  return { status: "already", message: "You're already subscribed to the selected series." };
}

export async function confirmBlogSubscription(token: string): Promise<ConfirmBlogSubscriptionResult> {
  const parsed = parseBlogSubscriberConfirmToken(token);
  if (!parsed || isBlogSubscriberConfirmTokenExpired(parsed)) {
    return { status: "invalid" };
  }

  const { data, error } = await db
    .from("email_subscribers")
    .select("id, email, series, email_verified")
    .eq("id", parsed.subscriberId)
    .single();

  if (error || !data) return { status: "invalid" };

  const row = data as EmailSubscriberRow;
  if (!isBlogSubscriptionSlug(row.series)) return { status: "invalid" };
  if (!isBlogSubscriberConfirmSignatureValid(parsed, row.email, row.series)) {
    return { status: "invalid" };
  }

  if (row.email_verified) {
    return { status: "already", series: row.series };
  }

  const now = new Date().toISOString();
  const { error: updateError } = await db
    .from("email_subscribers")
    .update({
      email_verified: true,
      confirmed_at: now,
      updated_at: now,
    })
    .eq("id", row.id);

  if (updateError) {
    console.error("Blog subscription confirm update error:", updateError.message);
    return { status: "invalid" };
  }

  return { status: "success", series: row.series };
}
