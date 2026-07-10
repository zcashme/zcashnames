import type { CampaignRecipientPersonalization } from "@/lib/campaigns/types";

export interface ParsedInlineText {
  type: "text" | "link";
  text: string;
  href?: string;
}

export type EmailInlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "underline"; text: string }
  | { type: "link"; text: string; href: string };

export type EmailBlockAlignment = "left" | "center" | "justify";
export type EmailHeadingLevel = 1 | 2 | 3;

export type EmailContentBlock =
  | { type: "paragraph"; text: string; align: EmailBlockAlignment }
  | { type: "heading"; level: EmailHeadingLevel; text: string; align: EmailBlockAlignment }
  | {
      type: "image";
      alt: string;
      src: string;
      href: string | null;
      align: EmailBlockAlignment;
    }
  | { type: "divider"; align: EmailBlockAlignment }
  | { type: "box"; blocks: EmailContentBlock[]; align: EmailBlockAlignment }
  | { type: "codebox"; text: string; align: EmailBlockAlignment };

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

const BETA_TOKEN_NAMES = new Set([
  "beta_display_name",
  "beta_invite_code",
  "beta_invite_link",
]);

const WAITLIST_CONFIRM_RESPONSE_TOKEN = "confirm_response_url";

export interface CampaignBetaTokenUsage {
  usesBetaDisplayName: boolean;
  usesBetaInviteCode: boolean;
  usesBetaInviteLink: boolean;
}

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
  headingText?: string | null;
}): boolean {
  return (
    campaignTextUsesLiveStats(args.subject) ||
    campaignTextUsesLiveStats(args.bodyText) ||
    campaignTextUsesLiveStats(args.headingText ?? "")
  );
}

export function campaignTextUsesBetaInviteTokens(text: string): boolean {
  for (const match of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    const key = String(match[1] ?? "").toLowerCase();
    if (BETA_TOKEN_NAMES.has(key)) return true;
  }
  return false;
}

export function campaignTextUsesWaitlistConfirmResponseToken(text: string): boolean {
  for (const match of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    const key = String(match[1] ?? "").toLowerCase();
    if (key === WAITLIST_CONFIRM_RESPONSE_TOKEN) return true;
  }
  return false;
}

function betaTokenUsageForText(text: string): CampaignBetaTokenUsage {
  const usage: CampaignBetaTokenUsage = {
    usesBetaDisplayName: false,
    usesBetaInviteCode: false,
    usesBetaInviteLink: false,
  };
  for (const match of text.matchAll(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi)) {
    const key = String(match[1] ?? "").toLowerCase();
    if (key === "beta_display_name") usage.usesBetaDisplayName = true;
    if (key === "beta_invite_code") usage.usesBetaInviteCode = true;
    if (key === "beta_invite_link") usage.usesBetaInviteLink = true;
  }
  return usage;
}

export function campaignDraftUsesBetaInviteTokens(args: {
  subject: string;
  bodyText: string;
  headingText?: string | null;
}): boolean {
  return (
    campaignTextUsesBetaInviteTokens(args.subject) ||
    campaignTextUsesBetaInviteTokens(args.bodyText) ||
    campaignTextUsesBetaInviteTokens(args.headingText ?? "")
  );
}

export function getCampaignBetaTokenUsage(args: {
  subject: string;
  bodyText: string;
  headingText?: string | null;
}): CampaignBetaTokenUsage {
  const subjectUsage = betaTokenUsageForText(args.subject);
  const bodyUsage = betaTokenUsageForText(args.bodyText);
  const headingUsage = betaTokenUsageForText(args.headingText ?? "");
  return {
    usesBetaDisplayName:
      subjectUsage.usesBetaDisplayName ||
      bodyUsage.usesBetaDisplayName ||
      headingUsage.usesBetaDisplayName,
    usesBetaInviteCode:
      subjectUsage.usesBetaInviteCode ||
      bodyUsage.usesBetaInviteCode ||
      headingUsage.usesBetaInviteCode,
    usesBetaInviteLink:
      subjectUsage.usesBetaInviteLink ||
      bodyUsage.usesBetaInviteLink ||
      headingUsage.usesBetaInviteLink,
  };
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
    confirm_response_url: personalization.confirmResponseUrl ?? "",
    beta_display_name: personalization.betaDisplayName ?? "",
    beta_invite_code: personalization.betaInviteCode ?? "",
    beta_invite_link: personalization.betaInviteLink ?? "",
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

export function parseEmailInlineContent(value: string): EmailInlineNode[] {
  const result: EmailInlineNode[] = [];
  const pattern =
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*/g;
  let lastIndex = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      result.push({ type: "text", text: value.slice(lastIndex, index) });
    }
    if (match[1] && match[2]) {
      result.push({ type: "link", text: match[1], href: match[2] });
    } else if (match[3]) {
      result.push({ type: "bold", text: match[3] });
    } else if (match[4]) {
      result.push({ type: "underline", text: match[4] });
    } else if (match[5]) {
      result.push({ type: "italic", text: match[5] });
    }
    lastIndex = index + match[0].length;
  }
  if (lastIndex < value.length) {
    result.push({ type: "text", text: value.slice(lastIndex) });
  }
  return result.length > 0 ? result : [{ type: "text", text: value }];
}

export function parseInlineLinks(value: string): ParsedInlineText[] {
  return parseEmailInlineContent(value).map((part) =>
    part.type === "link"
      ? { type: "link", text: part.text, href: part.href }
      : { type: "text", text: part.text },
  );
}

interface ParseEmailContentOptions {
  defaultAlign?: EmailBlockAlignment;
  allowFencedBlocks?: boolean;
}

function parseEmailContentInternal(
  bodyText: string,
  options?: ParseEmailContentOptions,
): EmailContentBlock[] {
  const normalized = bodyText.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const blocks: EmailContentBlock[] = [];
  const paragraphBuffer: string[] = [];
  const defaultAlign = options?.defaultAlign ?? "left";
  const allowFencedBlocks = options?.allowFencedBlocks ?? true;

  const flushParagraph = () => {
    const text = paragraphBuffer.join("\n").trim();
    paragraphBuffer.length = 0;
    if (text) blocks.push({ type: "paragraph", text, align: defaultAlign });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const blockMatch = trimmed.match(/^:::(box|codebox)(?:\s+(left|center|justify))?$/i);

    if (allowFencedBlocks && blockMatch) {
      flushParagraph();
      const blockType = blockMatch[1]?.toLowerCase() === "codebox" ? "codebox" : "box";
      const align = (blockMatch[2]?.toLowerCase() ??
        (blockType === "codebox" ? "center" : "left")) as EmailBlockAlignment;
      const blockLines: string[] = [];
      let closed = false;
      for (index += 1; index < lines.length; index += 1) {
        if (lines[index].trim() === ":::") {
          closed = true;
          break;
        }
        blockLines.push(lines[index]);
      }
      if (!closed) {
        blocks.push({
          type: "paragraph",
          text: [trimmed, ...blockLines].join("\n").trim(),
          align: defaultAlign,
        });
      } else {
        const text = blockLines.join("\n").trim();
        if (text) {
          if (blockType === "codebox") {
            blocks.push({ type: "codebox", text, align });
          } else {
            blocks.push({
              type: "box",
              align,
              blocks: parseEmailContentInternal(text, {
                defaultAlign: align,
                allowFencedBlocks: false,
              }),
            });
          }
        }
      }
      continue;
    }

    const headingMatch = trimmed.match(
      /^(#{1,3})\s+(?:(left|center|justify)\s*:\s*)?(.+)$/i,
    );
    if (headingMatch) {
      flushParagraph();
      const level = headingMatch[1].length as EmailHeadingLevel;
      const align = (headingMatch[2]?.toLowerCase() ?? defaultAlign) as EmailBlockAlignment;
      const text = headingMatch[3]?.trim() ?? "";
      if (text) blocks.push({ type: "heading", level, text, align });
      continue;
    }

    const linkedImageMatch = trimmed.match(
      /^\[!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)\]\((https?:\/\/[^\s)]+)\)$/i,
    );
    if (linkedImageMatch) {
      flushParagraph();
      blocks.push({
        type: "image",
        alt: linkedImageMatch[1] ?? "",
        src: linkedImageMatch[2] ?? "",
        href: linkedImageMatch[3] ?? null,
        align: defaultAlign,
      });
      continue;
    }

    const imageMatch = trimmed.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (imageMatch) {
      flushParagraph();
      blocks.push({
        type: "image",
        alt: imageMatch[1] ?? "",
        src: imageMatch[2] ?? "",
        href: null,
        align: defaultAlign,
      });
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      blocks.push({ type: "divider", align: defaultAlign });
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    paragraphBuffer.push(line);
  }

  flushParagraph();
  return blocks;
}

export function parseEmailContent(bodyText: string): EmailContentBlock[] {
  return parseEmailContentInternal(bodyText);
}

function flattenInlineContent(value: string): string {
  return parseEmailInlineContent(value)
    .map((part) => (part.type === "link" ? `${part.text}: ${part.href}` : part.text))
    .join("");
}

export function flattenToPlainText(bodyText: string): string {
  return parseEmailContent(bodyText)
    .map((block) => {
      if (block.type === "divider") return "---";
      if (block.type === "box") {
        return block.blocks
          .map((child) => {
            if (child.type === "divider") return "---";
            if (child.type === "image") {
              const label = child.alt || "Image";
              return child.href ? `${label}: ${child.href}` : `${label}: ${child.src}`;
            }
            if (child.type === "box") return "";
            return flattenInlineContent(child.text);
          })
          .filter(Boolean)
          .join("\n\n");
      }
      if (block.type === "image") {
        const label = block.alt || "Image";
        return block.href ? `${label}: ${block.href}` : `${label}: ${block.src}`;
      }
      return flattenInlineContent(block.text);
    })
    .filter(Boolean)
    .join("\n\n");
}
