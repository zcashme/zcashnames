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

export function resolveCampaignTokens(
  text: string,
  personalization: CampaignRecipientPersonalization,
): string {
  const replacements: Record<string, string> = {
    name: personalization.name,
    referral_code: personalization.referralCode ?? "",
    referral_url: personalization.referralUrl ?? "",
    dashboard_url: personalization.dashboardUrl ?? "",
  };
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, rawKey: string) => {
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
