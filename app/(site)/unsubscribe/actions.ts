"use server";

import { applySubscriberPreferences } from "@/lib/email/subscribers";
import { listDistinctSubscriberSeriesWithToken } from "@/lib/email/subscriber-series";
import { sendPreferencesLinkEmail } from "@/lib/email/preferences-link";
import { buildUnsubscribeToken, parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { resolveSiteUrl } from "@/lib/site-url";

export async function saveUnsubscribePreferencesAction(
  _previousState: { ok: boolean; message: string; confirmationRequested?: string[] },
  formData: FormData,
): Promise<{
  ok: boolean;
  message: string;
  confirmationRequested?: string[];
}> {
  const token = String(formData.get("token") ?? "").trim();
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return { ok: false, message: "This preferences link is invalid or expired." };
  }

  const seriesList = await listDistinctSubscriberSeriesWithToken(parsed.series);
  const desiredSeries = Object.fromEntries(
    seriesList.map((series) => [
      series,
      String(formData.get(`series_${series}`) ?? "unsubscribe") === "subscribe",
    ]),
  ) as Record<string, boolean>;

  const result = await applySubscriberPreferences({
    email: parsed.email,
    desiredSeries,
    seriesList,
    source: "unsubscribe_preferences",
    baseUrl: resolveSiteUrl(),
  });

  if (result.confirmationRequested.length > 0) {
    return {
      ok: true,
      message: `Confirmation email sent for: ${result.confirmationRequested.join(", ")}.`,
      confirmationRequested: result.confirmationRequested,
    };
  }

  if (result.restored.includes("updates")) {
    return {
      ok: true,
      message: "Saved. You will receive early-access and waitlist update emails again.",
      confirmationRequested: [],
    };
  }

  if (result.unsubscribed.includes("updates")) {
    return {
      ok: true,
      message:
        "Saved. You will no longer receive early-access or waitlist update emails. You can turn Updates back on here anytime this link works.",
      confirmationRequested: [],
    };
  }

  return {
    ok: true,
    message: "Email preferences updated.",
    confirmationRequested: [],
  };
}

export async function requestPreferencesLinkAction(
  _previousState: { ok: boolean; message: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  try {
    const token = buildUnsubscribeToken({
      email,
      series: "updates",
      mode: "series",
    });
    const baseUrl = resolveSiteUrl().replace(/\/$/, "");
    await sendPreferencesLinkEmail({
      email,
      preferencesUrl: `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`,
    });
  } catch {
    return { ok: false, message: "Couldn't send right now. Try again in a few minutes." };
  }

  return {
    ok: true,
    message: "If that inbox can manage preferences, we sent a new link.",
  };
}
