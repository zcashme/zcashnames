export const EMAIL_SUBSCRIPTION_SERIES = ["general", "users", "builders", "waitlist"] as const;

export type EmailSubscriptionSeries = (typeof EMAIL_SUBSCRIPTION_SERIES)[number];

export function normalizeEmailSeries(series: string): string {
  const normalized = series.trim().toLowerCase();
  if (normalized === "launch") return "users";
  if (normalized === "updates") return "waitlist";
  return normalized;
}

export const EMAIL_SUBSCRIPTION_SERIES_DESCRIPTIONS: Record<
  EmailSubscriptionSeries,
  string
> = {
  general: "News and outreach.",
  users: "Launches, releases, early access.",
  builders: "Integrations, tooling, and opportunities.",
  waitlist: "Emails we send to the verified waitlist.",
};
