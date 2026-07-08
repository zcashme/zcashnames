import { render } from "@react-email/render";
import CampaignEmail from "@/components/emails/CampaignEmail";
import FollowUpEmail from "@/components/emails/FollowUpEmail";
import { type EmailPreviewDriftManifest } from "@/lib/email-preview/drift";
import { DEFAULT_EMAIL_SERIES } from "@/lib/email/subscribers";
import { isWalletVariantId, type WalletVariantId } from "@/lib/wallets/catalog";

export type EmailPreviewFilter = "all" | "main" | "other";
export type EmailPreviewSource = "main_production" | "other";
export type EmailPreviewGroup =
  | "WAITLIST USER EMAILS"
  | "BETA USER EMAILS"
  | "CAMPAIGN EMAILS"
  | "SUBSCRIBER EMAILS"
  | "INTERNAL ADMIN NOTICES";

export interface EmailPreviewContext {
  name?: string;
  code?: string;
  wallet?: string;
  includeUnsubscribe?: boolean;
}

export interface EmailPreviewRegistryEntry {
  key: string;
  group: EmailPreviewGroup;
  title: string;
  description: string;
  sourceRepo: EmailPreviewSource;
  kind: "react" | "text";
  controls?: {
    wallet?: boolean;
    includeUnsubscribe?: boolean;
  };
  driftManifest?: EmailPreviewDriftManifest | null;
  renderHtml?: (context: EmailPreviewContext) => Promise<string>;
  resolveSubject: (walletVariantId: WalletVariantId | null) => string;
  text?: string;
}

const betaApplicationText = [
  "New beta application: Josh",
  "",
  "Tester id:    tester_123",
  "Invite code:  CABAL-123456",
  "Submitted:    2026-04-18T12:00:00.000Z",
  "Focus areas:  User flow, SDK / developer",
  "",
  "Contacts:",
  "  - email (best): josh@example.com",
  "  - x: @jswihart",
  "",
  "Why:",
  "I want to test ZcashNames before launch and help with feedback.",
  "",
  "Experience: I use Zcash and run community demos.",
  "Heard about it from: Zcash community",
  "",
  "-",
  "Open the beta_testers table in Supabase to flip status when you've sent the code.",
].join("\n");

const cabalAccessText = [
  "Josh is viewing your proposal.",
  "",
  "Name:      Josh",
  "Viewed at: 2026-04-18T12:00:00.000Z",
].join("\n");

const cabalChatText = [
  "New cabal deck comment from Josh",
  "",
  "Deck:       ZcashNames Cabal",
  "Slide:      4 - Referral engine",
  "Access:     investor-pass",
  "Name field: Josh",
  "Submitted:  2026-04-18T12:00:00.000Z",
  "",
  "Message:",
  "Can you share the expected payout timing and fraud review process?",
].join("\n");

const cabalInterestText = [
  "New cabal interest from Josh",
  "",
  "Deck:              ZcashNames Cabal",
  "Slide:             9 - Join us",
  "Access:            investor-pass",
  "Name field:        Josh",
  "Preferred contact: josh@example.com",
  "Submitted:         2026-04-18T12:00:00.000Z",
  "",
  "Optional note:",
  "Interested in helping with wallet partnerships.",
].join("\n");

const SHARED_LAYOUT_BUNDLE = [
  {
    internal: "components/emails/EmailLayout.tsx",
    main: "components/emails/EmailLayout.tsx",
  },
  {
    internal: "lib/email/styles.ts",
    main: "lib/email/styles.ts",
  },
] as const;

async function loadMainPreviewHelpers() {
  return import("@/lib/email-preview/main-source");
}

function unresolvedMainPreviewSubject(label: string) {
  return `${label} (main preview unavailable)`;
}

function textPreviewDocument(entry: EmailPreviewRegistryEntry, subject: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        background: #f4f4f5;
        color: #18181b;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }
      main {
        max-width: 760px;
        margin: 40px auto;
        background: #ffffff;
        border: 1px solid #d4d4d8;
        border-radius: 8px;
        overflow: hidden;
      }
      header {
        border-bottom: 1px solid #d4d4d8;
        padding: 16px 20px;
      }
      h1 {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 18px;
        margin: 0 0 6px;
      }
      p {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 13px;
        margin: 0;
        color: #52525b;
      }
      pre {
        margin: 0;
        padding: 20px;
        white-space: pre-wrap;
        font-size: 14px;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>${entry.title}</h1>
        <p>Subject: ${subject}</p>
      </header>
      <pre>${entry.text ?? ""}</pre>
    </main>
  </body>
</html>`;
}

export const EMAIL_PREVIEW_GROUPS: readonly EmailPreviewGroup[] = [
  "WAITLIST USER EMAILS",
  "BETA USER EMAILS",
  "CAMPAIGN EMAILS",
  "SUBSCRIBER EMAILS",
  "INTERNAL ADMIN NOTICES",
] as const;

export function getEmailPreviewRegistry(): EmailPreviewRegistryEntry[] {
  return [
    {
      key: "confirm",
      group: "WAITLIST USER EMAILS",
      title: "Confirm Email",
      description: "Waitlist signup confirmation email.",
      sourceRepo: "main_production",
      kind: "react",
      resolveSubject: () => unresolvedMainPreviewSubject("Confirm Email"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/ConfirmEmail.tsx",
            main: "components/emails/ConfirmEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("confirm", context);
      },
    },
    {
      key: "waitlist",
      group: "WAITLIST USER EMAILS",
      title: "Waitlist Welcome",
      description: "Sent after confirmation with referral link, dashboard link, passcode, and terms.",
      sourceRepo: "main_production",
      kind: "react",
      resolveSubject: () => unresolvedMainPreviewSubject("Waitlist Welcome"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/WaitlistEmail.tsx",
            main: "components/emails/WaitlistEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("waitlist", context);
      },
    },
    {
      key: "referral-recovery",
      group: "WAITLIST USER EMAILS",
      title: "Referral Recovery Resend",
      description: "Sent when a confirmed waitlist user recovers verified referral codes.",
      sourceRepo: "main_production",
      kind: "react",
      resolveSubject: () => unresolvedMainPreviewSubject("Referral Recovery Resend"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/ReferralRecoveryEmail.tsx",
            main: "components/emails/ReferralRecoveryEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("referral-recovery", context);
      },
    },
    {
      key: "follow-up",
      group: "WAITLIST USER EMAILS",
      title: "Survey Follow-Up",
      description: "Sent after survey completion when we should reach out.",
      sourceRepo: "other",
      kind: "react",
      controls: { includeUnsubscribe: true },
      resolveSubject: () => "Let's connect",
      renderHtml: async (context) =>
        render(
          <FollowUpEmail
            name="Josh"
            reasonCopy="Your answers suggest ZcashNames could be useful for your team, wallet, or community."
            unsubscribeLinks={
              context.includeUnsubscribe === false
                ? null
                : {
                    seriesHref: "https://zcashnames.com/unsubscribe?token=sample-series-token",
                    allHref: "https://zcashnames.com/unsubscribe?token=sample-all-token",
                  }
            }
          />,
        ),
    },
    {
      key: "commission-pin",
      group: "WAITLIST USER EMAILS",
      title: "Dashboard Access Code",
      description: "Referral dashboard passcode email.",
      sourceRepo: "main_production",
      kind: "react",
      resolveSubject: () => unresolvedMainPreviewSubject("Dashboard Access Code"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/CommissionPinEmail.tsx",
            main: "components/emails/CommissionPinEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
          {
            internal: "lib/email/commission-pin.ts",
            main: "lib/email/commission-pin.ts",
          },
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("commission-pin", context);
      },
    },
    {
      key: "beta-invite",
      group: "BETA USER EMAILS",
      title: "Beta Invite",
      description: "Closed beta invite with mainnet join link and access code fallback.",
      sourceRepo: "main_production",
      kind: "react",
      controls: { wallet: true },
      resolveSubject: () => unresolvedMainPreviewSubject("Beta Invite"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/BetaInviteEmail.tsx",
            main: "components/emails/BetaInviteEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
          {
            internal: "lib/email/beta-invite.ts",
            main: "lib/email/beta-invite.ts",
          },
          {
            internal: "lib/beta/invite-template.ts",
            main: "lib/beta/invite-template.ts",
          },
          {
            internal: "lib/wallets/catalog.ts",
            main: "lib/wallets/catalog.ts",
          },
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("beta-invite", context);
      },
    },
    {
      key: "campaign-waitlist",
      group: "CAMPAIGN EMAILS",
      title: "Waitlist Campaign",
      description: "Generic admin-managed broadcast email for waitlist recipients.",
      sourceRepo: "other",
      kind: "react",
      controls: { includeUnsubscribe: true },
      resolveSubject: () => "An update from ZcashNames",
      renderHtml: async (context) =>
        render(
          <CampaignEmail
            preview="An update from ZcashNames"
            headingText="An update from ZcashNames"
            bodyText={[
              "Thanks for joining the ZcashNames waitlist.",
              "",
              "You can share your referral link here: {{referral_url}}",
              "",
              "If you want to check your dashboard, use [your dashboard]({{dashboard_url}}).",
            ].join("\n")}
            personalization={{
              name: "Josh",
              referralCode: "jswihart",
              referralUrl: "https://zcashnames.com/?ref=jswihart",
              dashboardUrl: "https://zcashnames.com/leaders/ref/jswihart",
              humanReferralCode: null,
              humanReferralUrl: null,
              humanDashboardUrl: null,
              betaDisplayName: null,
              betaInviteCode: null,
              betaInviteLink: null,
              referralStats: null,
              relatedNames: ["Josh", "Jswihart"],
            }}
            unsubscribeLinks={
              context.includeUnsubscribe === false
                ? null
                : {
                    seriesHref: `https://zcashnames.com/unsubscribe?token=sample-${DEFAULT_EMAIL_SERIES}-series-token`,
                    allHref: `https://zcashnames.com/unsubscribe?token=sample-${DEFAULT_EMAIL_SERIES}-all-token`,
                  }
            }
          />,
        ),
    },
    {
      key: "blog-subscriber-confirm",
      group: "SUBSCRIBER EMAILS",
      title: "Blog Subscriber Confirm",
      description: "Public newsletter/blog subscription confirmation email from dotzcash_main.",
      sourceRepo: "main_production",
      kind: "react",
      resolveSubject: () => unresolvedMainPreviewSubject("Blog Subscriber Confirm"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/BlogSubscriberConfirmEmail.tsx",
            main: "components/emails/BlogSubscriberConfirmEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("blog-subscriber-confirm", context);
      },
    },
    {
      key: "subscriber-confirm",
      group: "SUBSCRIBER EMAILS",
      title: "Email Preferences Confirm",
      description: "Public email-preferences confirmation email from dotzcash_main.",
      sourceRepo: "main_production",
      kind: "react",
      resolveSubject: () => unresolvedMainPreviewSubject("Email Preferences Confirm"),
      driftManifest: {
        files: [
          {
            internal: "components/emails/SubscriberConfirmEmail.tsx",
            main: "components/emails/SubscriberConfirmEmail.tsx",
          },
          ...SHARED_LAYOUT_BUNDLE,
          {
            internal: "lib/email/subscriber-confirm-token.ts",
            main: "lib/email/subscriber-confirm-token.ts",
          },
        ],
      },
      renderHtml: async (context) => {
        const { renderMainEmailPreview } = await loadMainPreviewHelpers();
        return renderMainEmailPreview("subscriber-confirm", context);
      },
    },
    {
      key: "beta-application",
      group: "INTERNAL ADMIN NOTICES",
      title: "Beta Application Notice",
      description: "Text-only internal notice for a closed beta application.",
      sourceRepo: "other",
      kind: "text",
      text: betaApplicationText,
      resolveSubject: () => "New beta application: Josh",
    },
    {
      key: "cabal-access",
      group: "INTERNAL ADMIN NOTICES",
      title: "Cabal Access Notice",
      description: "Text-only internal notice when a cabal invite holder views the proposal.",
      sourceRepo: "other",
      kind: "text",
      text: cabalAccessText,
      resolveSubject: () => "Cabal proposal view: Josh",
    },
    {
      key: "cabal-chat",
      group: "INTERNAL ADMIN NOTICES",
      title: "Cabal Deck Comment",
      description: "Text-only internal notice for a cabal deck comment.",
      sourceRepo: "other",
      kind: "text",
      text: cabalChatText,
      resolveSubject: () => "Cabal deck comment: 4 Referral engine",
    },
    {
      key: "cabal-interest",
      group: "INTERNAL ADMIN NOTICES",
      title: "Cabal Interest",
      description: "Text-only internal notice for cabal interest submissions.",
      sourceRepo: "other",
      kind: "text",
      text: cabalInterestText,
      resolveSubject: () => "Cabal interest: Josh",
    },
  ];
}

export function filterEmailPreviews(
  entries: EmailPreviewRegistryEntry[],
  filter: EmailPreviewFilter,
): EmailPreviewRegistryEntry[] {
  if (filter === "main") {
    return entries.filter((entry) => entry.sourceRepo === "main_production");
  }
  if (filter === "other") {
    return entries.filter((entry) => entry.sourceRepo === "other");
  }
  return entries;
}

export async function renderEmailPreview(
  entry: EmailPreviewRegistryEntry,
  context: EmailPreviewContext,
): Promise<string> {
  const walletVariantId =
    context.wallet && isWalletVariantId(context.wallet) ? context.wallet : null;
  const subject = entry.resolveSubject(walletVariantId);

  if (entry.kind === "text") {
    return textPreviewDocument(entry, subject);
  }

  if (entry.renderHtml) return entry.renderHtml(context);

  throw new Error(`No renderer configured for preview entry: ${entry.key}`);
}
