import "server-only";

import { resolveSiteUrl } from "@/lib/site-url";
import { buildUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import { getActiveSubscriber } from "@/lib/email/subscribers";

export type EmailKind = "transactional" | "marketing";

export interface EmailUnsubscribeLinks {
  seriesHref: string;
  allHref: string;
  series?: string;
}

export async function ensureMarketingEmailAllowed(
  email: string,
  series: string,
): Promise<void> {
  const subscriber = await getActiveSubscriber(email, series);
  if (!subscriber) {
    throw new Error(`Recipient is not subscribed to ${series} emails.`);
  }
}

export function buildUnsubscribeLinks(args: {
  email: string;
  series: string;
  baseUrl?: string;
}): EmailUnsubscribeLinks {
  const baseUrl = (args.baseUrl ?? resolveSiteUrl()).replace(/\/$/, "");
  const seriesToken = buildUnsubscribeToken({
    email: args.email,
    series: args.series,
    mode: "series",
  });
  const allToken = buildUnsubscribeToken({
    email: args.email,
    series: args.series,
    mode: "all",
  });

  return {
    seriesHref: `${baseUrl}/unsubscribe?token=${encodeURIComponent(seriesToken)}`,
    allHref: `${baseUrl}/unsubscribe?token=${encodeURIComponent(allToken)}`,
    series: args.series.trim(),
  };
}
