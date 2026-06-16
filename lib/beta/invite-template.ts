import { flattenToPlainText as flattenMarkdownLinks } from "@/lib/campaigns/content";
import { getWalletVariant, type WalletVariantId } from "@/lib/wallets/catalog";

export function defaultInviteSubject(args?: { walletVariantId?: WalletVariantId | null }): string {
  const walletVariantId = args?.walletVariantId ?? null;
  if (!walletVariantId) return "Accepted! ZcashNames beta test";

  const variant = getWalletVariant(walletVariantId);
  if (!variant) return "Accepted! ZcashNames beta test";

  return `ZcashNames beta test with ${variant.displayName}`;
}

export function defaultInviteBody({ displayName: _displayName }: { displayName: string }): string {
  return [
    "Your application was accepted! This is your invitation to join the latest ZcashNames beta.",
    "",
    "Send bug reports through the feedback panel for your chance to earn ZEC. Start by using the sign-in link below.",
  ].join("\n");
}

export function flattenToPlainText(bodyText: string): string {
  return flattenMarkdownLinks(bodyText);
}

export function resolveInviteTemplate(
  bodyText: string,
  personalization: {
    displayName: string;
    inviteCode: string;
    joinUrl: string;
  },
): string {
  return bodyText
    .replace(/\{\{\s*display_name\s*\}\}/gi, personalization.displayName)
    .replace(/\{\{\s*invite_code\s*\}\}/gi, personalization.inviteCode)
    .replace(/\{\{\s*join_url\s*\}\}/gi, personalization.joinUrl);
}
