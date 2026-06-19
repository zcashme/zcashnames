"use server";

import type { EmailSubscriptionSeries } from "@/lib/email/subscription-series";
import { EMAIL_SUBSCRIPTION_SERIES } from "@/lib/email/subscription-series";
import { applySubscriberPreferences } from "@/lib/email/subscribers";
import { parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { resolveSiteUrl } from "@/lib/site-url";

export async function saveUnsubscribePreferencesAction(
  _previousState: {
    ok: boolean;
    message: string;
    confirmationRequested?: EmailSubscriptionSeries[];
  },
  formData: FormData,
): Promise<{
  ok: boolean;
  message: string;
  confirmationRequested?: EmailSubscriptionSeries[];
}> {
  const token = String(formData.get("token") ?? "").trim();
  const parsed = parseUnsubscribeToken(token);
  if (!parsed) {
    return { ok: false, message: "This preferences link is invalid or expired." };
  }

  const desiredSeries = Object.fromEntries(
    EMAIL_SUBSCRIPTION_SERIES.map((series) => [
      series,
      String(formData.get(`series_${series}`) ?? "unsubscribe") === "subscribe",
    ]),
  ) as Record<EmailSubscriptionSeries, boolean>;

  const result = await applySubscriberPreferences({
    email: parsed.email,
    desiredSeries,
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
