import "server-only";

import { render } from "@react-email/render";
import BetaInviteEmail from "@/components/emails/BetaInviteEmail";
import { resolveWalletDownloadHref } from "@/lib/beta/wallet-selection";
import { FROM_EMAIL } from "@/lib/email/constants";
import { sendEmail } from "@/lib/email/client";
import { resolveSiteUrl } from "@/lib/site-url";
import {
  defaultInviteBody,
  defaultInviteSubject,
  resolveInviteTemplate,
} from "@/lib/beta/invite-template";
import {
  getWalletBrand,
  getWalletPlatformDownloadsForBrand,
  getWalletVariant,
  subcategoryLabel,
  type WalletVariantId,
} from "@/lib/wallets/catalog";

interface RenderInvitePreviewArgs {
  displayName: string;
  inviteCode: string;
  bodyText: string;
  joinUrl?: string;
  walletVariantId?: WalletVariantId | null;
  baseUrl?: string;
}

type BasicInviteSendArgs = {
  email: string;
  displayName: string;
  inviteCode: string;
  baseUrl: string;
  walletVariantId?: WalletVariantId | null;
};

type DraftInviteSendArgs = {
  to: string;
  displayName: string;
  inviteCode: string;
  subject: string;
  bodyText: string;
  scheduledAt?: string | null;
  walletVariantId?: WalletVariantId | null;
};

function resolveWalletCta(
  walletVariantId: WalletVariantId | null | undefined,
  baseUrl: string,
): {
  walletName: string;
  platformName: string;
  logoSrc: string;
  logoAlt: string;
  primaryLink: {
    href: string;
    label: string;
  };
  alternateLinks: { href: string; label: string }[];
} | null {
  if (!walletVariantId) return null;
  const variant = getWalletVariant(walletVariantId);
  if (!variant) return null;

  const href = resolveWalletDownloadHref(walletVariantId);
  if (!href) return null;

  const brand = getWalletBrand(variant.brandSlug);
  const logoPath = brand?.appIcon?.src ?? brand?.logos?.default;
  if (!logoPath) return null;

  const alternateLinks = getWalletPlatformDownloadsForBrand(variant.brandSlug)
    .filter(
      (download) =>
        !(download.device === variant.device && download.subcategory === variant.subcategory),
    )
    .map((download) => ({
      href: download.href,
      label: subcategoryLabel(download.subcategory),
    }));

  return {
    walletName: variant.displayName,
    platformName: subcategoryLabel(variant.subcategory),
    logoSrc: logoPath.startsWith("http") ? logoPath : `${baseUrl}${logoPath}`,
    logoAlt: brand?.appIcon?.alt ?? brand?.logos?.alt ?? `${variant.displayName} logo`,
    primaryLink: {
      href,
      label: subcategoryLabel(variant.subcategory),
    },
    alternateLinks,
  };
}

function resolveInviteParagraphs(
  bodyText: string,
  personalization: {
    displayName: string;
    inviteCode: string;
    joinUrl: string;
  },
): string[] {
  return resolveInviteTemplate(bodyText, personalization)
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => {
      const normalized = paragraph.toLowerCase();
      return !normalized.startsWith("join link:") && !normalized.startsWith("access code:");
    });
}

export async function renderBetaInvitePreview({
  displayName,
  inviteCode,
  bodyText,
  joinUrl,
  walletVariantId,
  baseUrl,
}: RenderInvitePreviewArgs): Promise<string> {
  const resolvedBaseUrl = baseUrl ?? resolveSiteUrl();
  const resolvedJoinUrl =
    joinUrl ??
    `${resolvedBaseUrl}/beta/join?code=${encodeURIComponent(inviteCode)}&stage=mainnet`;
  const bodyParagraphs = resolveInviteParagraphs(bodyText, {
    displayName,
    inviteCode,
    joinUrl: resolvedJoinUrl,
  });
  const walletCta = resolveWalletCta(walletVariantId, resolvedBaseUrl);

  return render(
    BetaInviteEmail({
      displayName,
      joinUrl: resolvedJoinUrl,
      inviteCode,
      bodyParagraphs,
      walletCta,
    }),
  );
}

export async function sendBetaInviteEmail(
  args: BasicInviteSendArgs | DraftInviteSendArgs,
): Promise<void> {
  const recipient = "email" in args ? args.email : args.to;
  const baseUrl = "baseUrl" in args ? args.baseUrl : resolveSiteUrl();
  const joinUrl = `${baseUrl}/beta/join?code=${encodeURIComponent(args.inviteCode)}&stage=mainnet`;
  const subject = "subject" in args ? args.subject : defaultInviteSubject();
  const bodyText = "bodyText" in args
    ? args.bodyText
    : defaultInviteBody({ displayName: args.displayName });

  const html = await renderBetaInvitePreview({
    displayName: args.displayName,
    inviteCode: args.inviteCode,
    bodyText,
    joinUrl,
    walletVariantId: args.walletVariantId,
    baseUrl,
  });

  const payload = {
    from: FROM_EMAIL,
    to: recipient,
    subject,
    html,
    ...("scheduledAt" in args && args.scheduledAt ? { scheduledAt: args.scheduledAt } : {}),
  } as Parameters<typeof sendEmail>[0];

  await sendEmail(payload);
}
