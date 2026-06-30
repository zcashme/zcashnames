import type { CampaignRecipientPersonalization } from "@/lib/campaigns/types";

export interface ParsedInlineText {
  type: "text" | "link";
  text: string;
  href?: string;
}

export function defaultCampaignTitle(): string {
  return `Waitlist campaign ${new Date().toISOString().slice(0, 10)}`;
}

export function defaultCampaignSubject(): string {
  return "An update from ZcashNames";
}

export function defaultCampaignBodyText(): string {
  return [
    "Thanks for joining the ZcashNames waitlist.",
    "",
    "We’re sharing a quick update on where things stand and what comes next.",
    "",
    "You can still share your referral link here: {{referral_url}}",
    "",
    "If you want to review your dashboard, use: {{dashboard_url}}",
  ].join("\n");
}

export function normalizeCampaignText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

const LIVE_STATS_TOKEN_NAMES = new Set([
  "direct_referrals",
  "indirect_referrals",
  "attributed_referrals",
  "referrals_24h_count",
  "referrals_24h_growth_pct",
  "referrals_7d_count",
  "referrals_7d_growth_pct",
  "referrals_30d_count",
  "referrals_30d_growth_pct",
  "depth_1_referrals",
  "depth_2_referrals",
  "depth_3_referrals",
  "leaderboard_rank",
  "waitlist_position",
  "waitlist_total",
  "max_referral_depth",
  "potential_rewards",
  "root_badge",
  "commission_unlocked",
  "referrals_unlocked",
]);

export function campaignTextUsesLiveStats(text: string): boolean {
  for (const match of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    const key = String(match[1] ?? "").toLowerCase();
    if (LIVE_STATS_TOKEN_NAMES.has(key)) return true;
  }
  return false;
}

export function campaignDraftUsesLiveStats(args: {
  subject: string;
  bodyText: string;
}): boolean {
  return (
    campaignTextUsesLiveStats(args.subject) ||
    campaignTextUsesLiveStats(args.bodyText)
  );
}

export function resolveCampaignTokens(
  text: string,
  personalization: CampaignRecipientPersonalization,
): string {
  const stats = personalization.referralStats;
  const statText = (value: boolean | number | string | null | undefined): string => {
    if (value === null || value === undefined || value === "") return "N/A";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "∞";
    return value;
  };
  const replacements: Record<string, string> = {
    name: personalization.name,
    referral_code: personalization.referralCode ?? "",
    referral_url: personalization.referralUrl ?? "",
    dashboard_url: personalization.dashboardUrl ?? "",
    human_referral_code: personalization.humanReferralCode ?? "",
    human_referral_url: personalization.humanReferralUrl ?? "",
    human_dashboard_url: personalization.humanDashboardUrl ?? "",
    direct_referrals: statText(stats?.directReferrals),
    indirect_referrals: statText(stats?.indirectReferrals),
    attributed_referrals: statText(stats?.attributedReferrals),
    referrals_24h_count: statText(stats?.referrals24hCount),
    referrals_24h_growth_pct: statText(stats?.referrals24hGrowthPct),
    referrals_7d_count: statText(stats?.referrals7dCount),
    referrals_7d_growth_pct: statText(stats?.referrals7dGrowthPct),
    referrals_30d_count: statText(stats?.referrals30dCount),
    referrals_30d_growth_pct: statText(stats?.referrals30dGrowthPct),
    depth_1_referrals: statText(stats?.depth1Referrals),
    depth_2_referrals: statText(stats?.depth2Referrals),
    depth_3_referrals: statText(stats?.depth3Referrals),
    leaderboard_rank: statText(stats?.leaderboardRank),
    waitlist_position: statText(stats?.waitlistPosition),
    waitlist_total: statText(stats?.waitlistTotal),
    max_referral_depth: statText(stats?.maxReferralDepth),
    potential_rewards: statText(stats?.potentialRewards),
    root_badge: statText(stats?.rootBadge),
    commission_unlocked: statText(stats?.commissionUnlocked),
    referrals_unlocked: statText(stats?.referralsUnlocked),
  };
  return text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, rawKey: string) => {
    const key = rawKey.toLowerCase();
    return replacements[key] ?? "";
  });
}

export function splitCampaignParagraphs(bodyText: string): string[] {
  return normalizeCampaignText(bodyText)
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function parseInlineLinks(value: string): ParsedInlineText[] {
  const result: ParsedInlineText[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      result.push({ type: "text", text: value.slice(lastIndex, index) });
    }
    result.push({ type: "link", text: match[1], href: match[2] });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) {
    result.push({ type: "text", text: value.slice(lastIndex) });
  }
  return result.length > 0 ? result : [{ type: "text", text: value }];
}

export function flattenToPlainText(bodyText: string): string {
  return splitCampaignParagraphs(bodyText)
    .map((paragraph) =>
      paragraph.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1: $2"),
    )
    .join("\n\n");
}
