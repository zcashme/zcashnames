import Link from "next/link";
import { confirmSubscriberSeries } from "@/lib/email/subscribers";
import { listDistinctSubscriberSeriesWithToken } from "@/lib/email/subscriber-series";
import {
  isSubscriberConfirmSignatureValid,
  isSubscriberConfirmTokenExpired,
  parseSubscriberConfirmToken,
} from "@/lib/email/subscriber-confirm-token";

export const dynamic = "force-dynamic";

export default async function ConfirmSubscriberPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const parsed = parseSubscriberConfirmToken(String(params.token ?? ""));

  let title = "Invalid confirmation link";
  let message = "This confirmation link is missing, invalid, or expired.";
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
    title = "Subscription confirmed";
    message = `${parsed.email} will now receive ${parsed.series} emails.`;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-8 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">ZcashNames</p>
        <h1 className="mt-3 text-3xl font-semibold text-zinc-100">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">{message}</p>
        <div className="mt-8">
          <Link href="/" className="text-sm font-medium text-amber-400 hover:text-amber-300">
            Return to zcashnames.com
          </Link>
        </div>
      </section>
    </main>
  );
}
