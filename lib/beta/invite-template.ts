import { flattenToPlainText as flattenMarkdownLinks } from "@/lib/campaigns/content";

export function defaultInviteSubject(): string {
  return "You're invited to the ZcashNames beta";
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
