import type { Metadata } from "next";
import { listDistinctSubscriberSeriesWithToken } from "@/lib/email/subscriber-series";
import { listSubscriberPreferences } from "@/lib/email/subscribers";
import { normalizeEmailSeries } from "@/lib/email/subscription-series";
import { parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import PreferencesPageShell from "./PreferencesPageShell";
import RequestPreferencesLinkClient from "./RequestPreferencesLinkClient";
import UnsubscribePreferencesClient from "./UnsubscribePreferencesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email Preferences | Zcash Names",
  description: "Manage Zcash Names email preferences, including early-access and waitlist updates.",
  alternates: { canonical: "https://www.zcashnames.com/unsubscribe" },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const parsed = token ? parseUnsubscribeToken(token) : null;
  if (parsed) parsed.series = normalizeEmailSeries(parsed.series);

  if (!parsed) {
    return (
      <PreferencesPageShell
        eyebrow={token ? "Link expired" : "Manage what we send you"}
        description={
          token
            ? "This preferences link is invalid or expired. Enter your email and we will send a new one."
            : "Enter your email and we will send a link to manage early-access, waitlist updates, and other ZcashNames email."
        }
      >
        <RequestPreferencesLinkClient />
      </PreferencesPageShell>
    );
  }

  const seriesList = await listDistinctSubscriberSeriesWithToken(parsed.series);
  const preferences = await listSubscriberPreferences(parsed.email, seriesList);
  const initialMap = Object.fromEntries(
    preferences.map((preference) => [preference.series, preference.isSubscribed]),
  ) as Record<string, boolean>;

  if (parsed.mode === "all") {
    for (const series of seriesList) initialMap[series] = false;
  } else {
    initialMap[parsed.series] = false;
  }

  return (
    <PreferencesPageShell
      pills={[parsed.email]}
      description="Choose what we send to this address."
    >
      <UnsubscribePreferencesClient
        token={token}
        email={parsed.email}
        seriesList={seriesList}
        initialPreferences={initialMap}
      />
    </PreferencesPageShell>
  );
}
