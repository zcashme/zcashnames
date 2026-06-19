export const EMAIL_SUBSCRIPTION_SERIES = ["general", "builders", "updates"] as const;

export type EmailSubscriptionSeries = (typeof EMAIL_SUBSCRIPTION_SERIES)[number];

export const EMAIL_SUBSCRIPTION_SERIES_DESCRIPTIONS: Record<
  EmailSubscriptionSeries,
  string
> = {
  general: "News, announcements, and outreach.",
  builders: "Integrations, tooling, and opportunities.",
  updates: "Release notes, feature changes, and product availability.",
};
