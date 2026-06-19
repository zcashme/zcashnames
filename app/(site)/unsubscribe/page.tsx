import Link from "next/link";
import { EMAIL_SUBSCRIPTION_SERIES } from "@/lib/email/subscription-series";
import { listSubscriberPreferences } from "@/lib/email/subscribers";
import { parseUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import UnsubscribePreferencesClient from "./UnsubscribePreferencesClient";

export const dynamic = "force-dynamic";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const parsed = token ? parseUnsubscribeToken(token) : null;

  if (!parsed) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
        <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-8 text-center shadow-2xl">
          <h1 className="mt-3 text-3xl font-semibold text-zinc-100">
            Invalid unsubscribe link
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-400">
            This preferences link is missing or invalid. If you still need help, contact us
            directly.
          </p>
          <div className="mt-8">
            <Link href="/" className="text-sm font-medium text-amber-400 hover:text-amber-300">
              Return to zcashnames.com
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const preferences = await listSubscriberPreferences(parsed.email);
  const initialMap = Object.fromEntries(
    preferences.map((preference) => [preference.series, preference.isSubscribed]),
  ) as Record<(typeof EMAIL_SUBSCRIPTION_SERIES)[number], boolean>;

  if (parsed.mode === "all") {
    for (const series of EMAIL_SUBSCRIPTION_SERIES) initialMap[series] = false;
  } else {
    initialMap[parsed.series as (typeof EMAIL_SUBSCRIPTION_SERIES)[number]] = false;
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-zinc-100">Email preferences</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          Choose what we send to this address.
        </p>
        <UnsubscribePreferencesClient
          token={token}
          email={parsed.email}
          initialPreferences={initialMap}
        />
        <div className="mt-8">
          <Link href="/" className="text-sm font-medium text-amber-400 hover:text-amber-300">
            Return to zcashnames.com
          </Link>
        </div>
      </section>
    </main>
  );
}
