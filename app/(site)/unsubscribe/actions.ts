"use server";

import { applySubscriberPreferences } from "@/lib/email/subscribers";
import { listDistinctSubscriberSeriesWithToken } from "@/lib/email/subscriber-series";
import { parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";
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

  return {
    ok: true,
    message: "Email preferences updated.",
    confirmationRequested: [],
  };
}
