"use server";

import { headers } from "next/headers";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { sendPreferencesLinkEmail } from "@/lib/email/preferences-link";
import {
  isPreferencesLinkRateLimited,
  PREFERENCES_LINK_RATE_LIMIT_MESSAGE,
} from "@/lib/email/preferences-link-throttle";
import { applySubscriberPreferences, listPreferenceSeriesForEmail } from "@/lib/email/subscribers";
import { buildUnsubscribeToken, parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { resolveSiteUrl } from "@/lib/site-url";

export async function saveUnsubscribePreferencesAction(
  _previousState: { ok: boolean; message: string },
  formData: FormData,
): Promise<{
  ok: boolean;
  message: string;
}> {
  const token = String(formData.get("token") ?? "").trim();
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return { ok: false, message: "This preferences link is invalid or expired." };
  }

  const seriesList = await listPreferenceSeriesForEmail(parsed.email, parsed.series);
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
  });

  if (result.restored.includes("waitlist")) {
    return {
      ok: true,
      message: "Saved. You will receive waitlist campaign emails again.",
    };
  }

  if (result.unsubscribed.includes("waitlist")) {
    return {
      ok: true,
      message:
        "Saved. You will no longer receive waitlist campaign emails. You can turn Waitlist campaigns back on here anytime this link works.",
    };
  }

  return {
    ok: true,
    message: "Email preferences updated.",
  };
}

export async function requestPreferencesLinkAction(
  _previousState: { ok: boolean; message: string; code?: string },
  formData: FormData,
): Promise<{ ok: boolean; message: string; code?: string }> {
  const email = normalizeEmailAddress(String(formData.get("email") ?? ""));
  if (!isValidEmailAddress(email)) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const headerStore = await headers();
  const remoteIp =
    headerStore.get("cf-connecting-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null;

  try {
    const throttled = await isPreferencesLinkRateLimited({ email, remoteIp });
    if (throttled) {
      return { ok: false, message: PREFERENCES_LINK_RATE_LIMIT_MESSAGE, code: "rate_limited" };
    }
  } catch (error) {
    console.error("Preferences link throttle error:", error);
    return { ok: false, message: "Couldn't send right now. Try again in a few minutes." };
  }

  try {
    const token = buildUnsubscribeToken({
      email,
      series: "general",
      mode: "manage",
    });
    const baseUrl = resolveSiteUrl(headerStore).replace(/\/$/, "");
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
