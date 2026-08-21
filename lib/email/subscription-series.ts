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

const EMAIL_SUBSCRIPTION_SERIES_TITLES: Record<string, string> = {
  general: "General",
  users: "Users",
  builders: "Builders",
  waitlist: "waitlist campaigns",
};

export function subscriptionSeriesTitle(series: string): string {
  const normalized = normalizeEmailSeries(series);
  return EMAIL_SUBSCRIPTION_SERIES_TITLES[normalized] ?? normalized;
}

export function formatSubscriptionSeriesPhrase(seriesList: readonly string[]): string {
  const labels = [...new Set(seriesList.map(subscriptionSeriesTitle).filter(Boolean))];
  if (labels.length === 0) return "Zcash Names email";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}
