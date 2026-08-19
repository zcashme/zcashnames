import Link from "next/link";
import { confirmSubscriberSeries } from "@/lib/email/subscribers";
import { listDistinctSubscriberSeriesWithToken } from "@/lib/email/subscriber-series";
import { normalizeEmailSeries } from "@/lib/email/subscription-series";
import {
  isSubscriberConfirmSignatureValid,
  isSubscriberConfirmTokenExpired,
  parseSubscriberConfirmToken,
} from "@/lib/email/subscriber-confirm-token";
import PreferencesPageShell from "../PreferencesPageShell";

export const dynamic = "force-dynamic";

export default async function ConfirmSubscriberPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const parsed = parseSubscriberConfirmToken(String(params.token ?? ""));
  if (parsed) parsed.series = normalizeEmailSeries(parsed.series);

  let confirmed = false;
  let title = (
    <>
      Confirmation{" "}
      <span style={{ color: "var(--color-accent-interactive)" }}>needed</span>
    </>
  );
  let description = "This confirmation link is missing, invalid, or expired.";
  const seriesList = parsed ? await listDistinctSubscriberSeriesWithToken(parsed.series) : [];

  if (
    parsed &&
    seriesList.includes(parsed.series) &&
    !isSubscriberConfirmTokenExpired(parsed) &&
    isSubscriberConfirmSignatureValid(parsed)
  ) {
    await confirmSubscriberSeries({
      email: parsed.email,
      series: parsed.series,
      source: "subscriber_confirm_link",
    });
    confirmed = true;
    title = (
      <>
        Subscription{" "}
        <span style={{ color: "var(--color-accent-interactive)" }}>confirmed</span>
      </>
    );
    description =
      parsed.series === "users"
        ? `${parsed.email} will now receive user emails: launches, releases, and early access.`
        : parsed.series === "waitlist"
          ? `${parsed.email} will now receive waitlist campaign emails.`
          : `${parsed.email} will now receive ${parsed.series} emails.`;
  }

  return (
    <PreferencesPageShell title={title} description={description}>
      <div className="text-center">
        <Link
          href="/unsubscribe"
          className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          {confirmed ? "Manage preferences" : "Request a new preferences link"}
        </Link>
      </div>
    </PreferencesPageShell>
  );
}
