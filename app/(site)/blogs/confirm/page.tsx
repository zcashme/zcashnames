import Link from "next/link";
import { confirmBlogSubscription } from "@/lib/blog-subscribers/subscribers";
import { getBlogSubscriptionOption } from "@/lib/blog-series";
import { buildUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import SiteRouteTitle from "@/components/SiteRouteTitle";

export default async function BlogConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await confirmBlogSubscription(token) : { status: "invalid" as const };
  const series = result.status === "invalid" ? null : getBlogSubscriptionOption(result.series);
  const preferencesHref =
    result.status === "invalid"
      ? "/unsubscribe"
      : `/unsubscribe?token=${encodeURIComponent(
          buildUnsubscribeToken({
            email: result.email,
            series: result.series,
            mode: "series",
          }),
        )}`;

  return (
    <div className="blog-confirm-shell">
      <SiteRouteTitle title="Confirm" />
      <div className="blog-confirm-card">
        <p className="blog-unpublished-kicker">Email confirmation</p>
        <h1 className="blog-unpublished-title">
          {result.status === "success" && "Subscription confirmed"}
          {result.status === "already" && "Already confirmed"}
          {result.status === "invalid" && "Invalid link"}
        </h1>
        <p className="blog-unpublished-body">
          {result.status === "success" && `You're now subscribed to ${series?.title}.`}
          {result.status === "already" && `This email is already subscribed to ${series?.title}.`}
          {result.status === "invalid" && "This confirmation link is invalid or expired."}
        </p>
        <Link href={preferencesHref} className="blog-subscribe-button">
          Email Preferences
        </Link>
      </div>
    </div>
  );
}
