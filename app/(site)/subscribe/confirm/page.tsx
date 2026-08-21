import Link from "next/link";
import { confirmBlogSubscription } from "@/lib/blog-subscribers/subscribers";
import { formatSubscriptionSeriesPhrase } from "@/lib/email/subscription-series";
import { buildUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import PreferencesPageShell from "../../unsubscribe/PreferencesPageShell";

export const dynamic = "force-dynamic";

export default async function SubscribeConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const result = params.token
    ? await confirmBlogSubscription(params.token)
    : { status: "invalid" as const };

  const seriesPhrase =
    result.status === "invalid" ? "" : formatSubscriptionSeriesPhrase(result.series);
  const preferencesHref =
    result.status === "invalid"
      ? "/unsubscribe"
      : `/unsubscribe?token=${encodeURIComponent(
          buildUnsubscribeToken({
            email: result.email,
            series: result.series[0] ?? "general",
            mode: "manage",
          }),
        )}`;

  const title =
    result.status === "success" ? (
      <>
        Subscription{" "}
        <span style={{ color: "var(--color-accent-interactive)" }}>confirmed</span>
      </>
    ) : result.status === "already" ? (
      <>
        Already{" "}
        <span style={{ color: "var(--color-accent-interactive)" }}>confirmed</span>
      </>
    ) : (
      <>
        Confirmation{" "}
        <span style={{ color: "var(--color-accent-interactive)" }}>needed</span>
      </>
    );

  const description =
    result.status === "success"
      ? `You're now subscribed to ${seriesPhrase}.`
      : result.status === "already"
        ? `This email is already subscribed to ${seriesPhrase}.`
        : "This confirmation link is missing, invalid, or expired.";

  return (
    <PreferencesPageShell
      title={title}
      description={description}
      pills={result.status === "invalid" ? undefined : [result.email]}
    >
      <div className="text-center">
        <Link
          href={preferencesHref}
          className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-[filter,transform] duration-200 hover:-translate-y-0.5 hover:brightness-110"
          style={{
            background: "var(--home-result-primary-bg)",
            color: "var(--home-result-primary-fg)",
            boxShadow: "var(--home-result-primary-shadow)",
          }}
        >
          {result.status === "invalid" ? "Request a new preferences link" : "Email preferences"}
        </Link>
      </div>
    </PreferencesPageShell>
  );
}
