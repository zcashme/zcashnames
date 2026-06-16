import { flattenToPlainText as flattenMarkdownLinks } from "@/lib/campaigns/content";
import { getWalletVariant, type WalletVariantId } from "@/lib/wallets/catalog";

export function defaultInviteSubject(args?: { walletVariantId?: WalletVariantId | null }): string {
  const walletVariantId = args?.walletVariantId ?? null;
  if (!walletVariantId) return "Your invitation to ZNS beta test";

  const variant = getWalletVariant(walletVariantId);
  if (!variant) return "Your invitation to ZNS beta test";

  return `ZNS Beta Invitation from ${variant.displayName}`;
}

export function defaultInviteBody({ displayName: _displayName }: { displayName: string }): string {
  return [
    "You're invited to the ZcashNames beta.",
    "",
    "Use the invite link below to sign in and start testing. Keep your access code private and send all bug reports through the feedback panel.",
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
