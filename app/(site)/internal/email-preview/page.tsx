import Link from "next/link";
import { render } from "@react-email/render";
import ConfirmEmail from "@/components/emails/ConfirmEmail";
import WaitlistEmail from "@/components/emails/WaitlistEmail";
import FollowUpEmail from "@/components/emails/FollowUpEmail";
import CommissionPinEmail from "@/components/emails/CommissionPinEmail";
import CampaignEmail from "@/components/emails/CampaignEmail";
import BetaInviteWalletPicker from "./BetaInviteWalletPicker";
import { defaultInviteBody, defaultInviteSubject } from "@/lib/beta/invite-template";
import { renderBetaInvitePreview } from "@/lib/email/beta-invite";
import { isWalletVariantId, type WalletVariantId } from "@/lib/wallets/catalog";
import type { ReactElement } from "react";

type EmailPreview = {
  key: string;
  group:
    | "WAITLIST USER EMAILS"
    | "BETA USER EMAILS"
    | "CAMPAIGN EMAILS"
    | "INTERNAL ADMIN NOTICES";
  title: string;
  description: string;
  subject: string;
  kind: "react" | "text";
  element?: ReactElement;
  text?: string;
};

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

const previews: EmailPreview[] = [
  {
    key: "confirm",
    group: "WAITLIST USER EMAILS",
    title: "Confirm Email",
    description: "Waitlist signup confirmation email.",
    subject: "Confirm your email",
    kind: "react",
    element: <ConfirmEmail name="Josh" confirmUrl="https://zcashnames.com/?token=sample-confirmation-token" />,
  },
  {
    key: "waitlist",
    group: "WAITLIST USER EMAILS",
    title: "Waitlist Welcome",
    description: "Sent after confirmation with referral link, dashboard link, passcode, and terms.",
    subject: "Early access to ZcashNames",
    kind: "react",
    element: (
      <WaitlistEmail
        name="Josh"
        referralUrl="https://zcashnames.com/?ref=jswihart"
        referralCode="jswihart"
        accessPin="924731"
      />
    ),
  },
  {
    key: "waitlist-recovery",
    group: "WAITLIST USER EMAILS",
    title: "Referral Recovery Resend",
    description: "Resent when a confirmed waitlist user recovers their referral link from Share Kit.",
    subject: "Early access to ZcashNames",
    kind: "react",
    element: (
      <WaitlistEmail
        name="Josh"
        referralUrl="https://zcashnames.com/?ref=Recover42"
        referralCode="Recover42"
        accessPin="924731"
      />
    ),
  },
  {
    key: "follow-up",
    group: "WAITLIST USER EMAILS",
    title: "Survey Follow-Up",
    description: "Sent after survey completion when we should reach out.",
    subject: "Let's connect",
    kind: "react",
    element: (
      <FollowUpEmail
        name="Josh"
        reasonCopy="Your answers suggest ZcashNames could be useful for your team, wallet, or community."
      />
    ),
  },
  {
    key: "commission-pin",
    group: "WAITLIST USER EMAILS",
    title: "Dashboard Access Code",
    description: "Referral dashboard passcode email.",
    subject: "Your access code",
    kind: "react",
    element: (
      <CommissionPinEmail
        name="Josh"
        pin="924731"
        dashboardUrl="https://zcashnames.com/leaders/ref/jswihart"
      />
    ),
  },
  {
    key: "beta-invite",
    group: "BETA USER EMAILS",
    title: "Beta Invite",
    description: "Closed beta invite with mainnet join link and access code fallback.",
    subject: defaultInviteSubject(),
    kind: "react",
  },
  {
    key: "campaign-waitlist",
    group: "CAMPAIGN EMAILS",
    title: "Waitlist Campaign",
    description: "Generic admin-managed broadcast email for waitlist recipients.",
    subject: "An update from ZcashNames",
    kind: "react",
    element: (
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
          relatedNames: ["Josh", "Jswihart"],
        }}
      />
    ),
  },
  {
    key: "beta-application",
    group: "INTERNAL ADMIN NOTICES",
    title: "Beta Application Notice",
    description: "Text-only internal notice for a closed beta application.",
    subject: "New beta application: Josh",
    kind: "text",
    text: betaApplicationText,
  },
  {
    key: "cabal-access",
    group: "INTERNAL ADMIN NOTICES",
    title: "Cabal Access Notice",
    description: "Text-only internal notice when a cabal invite holder views the proposal.",
    subject: "Cabal proposal view: Josh",
    kind: "text",
    text: cabalAccessText,
  },
  {
    key: "cabal-chat",
    group: "INTERNAL ADMIN NOTICES",
    title: "Cabal Deck Comment",
    description: "Text-only internal notice for a cabal deck comment.",
    subject: "Cabal deck comment: 4 Referral engine",
    kind: "text",
    text: cabalChatText,
  },
  {
    key: "cabal-interest",
    group: "INTERNAL ADMIN NOTICES",
    title: "Cabal Interest",
    description: "Text-only internal notice for cabal interest submissions.",
    subject: "Cabal interest: Josh",
    kind: "text",
    text: cabalInterestText,
  },
];

const previewGroups = [
  "WAITLIST USER EMAILS",
  "BETA USER EMAILS",
  "CAMPAIGN EMAILS",
  "INTERNAL ADMIN NOTICES",
] as const;

function getSelectedPreview(email: string | string[] | undefined): EmailPreview {
  const key = Array.isArray(email) ? email[0] : email;
  return previews.find((preview) => preview.key === key) ?? previews[0];
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => {
    if (character === "&") return "&amp;";
    if (character === "<") return "&lt;";
    if (character === ">") return "&gt;";
    return "&quot;";
  });
}

function textPreviewDocument(preview: EmailPreview): string {
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
        <h1>${escapeHtml(preview.title)}</h1>
        <p>Subject: ${escapeHtml(preview.subject)}</p>
      </header>
      <pre>${escapeHtml(preview.text ?? "")}</pre>
    </main>
  </body>
</html>`;
}

async function renderPreview(
  preview: EmailPreview,
  personalization?: { name?: string; code?: string; wallet?: string },
): Promise<string> {
  if (preview.kind === "text") return textPreviewDocument(preview);
  if (preview.key === "beta-invite") {
    const displayName = personalization?.name?.trim() || "Josh";
    const inviteCode = personalization?.code?.trim() || "7QFMb3jv";
    const walletVariantId =
      personalization?.wallet && isWalletVariantId(personalization.wallet)
        ? personalization.wallet
        : null;
    return renderBetaInvitePreview({
      displayName,
      inviteCode,
      bodyText: defaultInviteBody({ displayName }),
      walletVariantId,
    });
  }
  return render(preview.element!);
}

export default async function InternalEmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; name?: string; code?: string; wallet?: string }>;
}) {
  const params = await searchParams;
  const selected = getSelectedPreview(params.email);
  const selectedWallet =
    params.wallet && isWalletVariantId(params.wallet) ? (params.wallet as WalletVariantId) : null;
  const html = await renderPreview(selected, {
    name: params.name,
    code: params.code,
    wallet: params.wallet,
  });
  const permalink =
    selected.key === "beta-invite"
      ? `/internal/email-preview?email=${selected.key}&name=${encodeURIComponent(params.name?.trim() || "Josh")}&code=${encodeURIComponent(params.code?.trim() || "7QFMb3jv")}${params.wallet?.trim() ? `&wallet=${encodeURIComponent(params.wallet.trim())}` : ""}`
      : `/internal/email-preview?email=${selected.key}`;

  return (
    <main style={{ width: "100%", padding: "12px", boxSizing: "border-box" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: 12,
          minHeight: "calc(100vh - 160px)",
          alignItems: "stretch",
        }}
      >
        <aside
          className="rounded-lg border"
          style={{
            background: "var(--leaders-card-bg)",
            borderColor: "var(--leaders-card-border)",
            padding: 10,
            maxHeight: "calc(100vh - 170px)",
            overflowY: "auto",
          }}
        >
          <div className="mb-3 px-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">Internal</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-fg-heading">Email Preview</h1>
            <p className="mt-1 text-xs leading-5 text-fg-muted">
              Ignored by git. Includes React templates and text-only notices.
            </p>
          </div>

          <div className="grid gap-4">
            {previewGroups.map((group) => (
              <div key={group}>
                <h2 className="mb-1.5 px-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-fg-muted">
                  {group}
                </h2>
                <div className="grid gap-1.5">
                  {previews
                    .filter((preview) => preview.group === group)
                    .map((preview) => {
                      const active = preview.key === selected.key;
                      return (
                        <Link
                          key={preview.key}
                          href={
                            preview.key === "beta-invite"
                              ? `/internal/email-preview?email=${preview.key}&name=${encodeURIComponent(params.name?.trim() || "Josh")}&code=${encodeURIComponent(params.code?.trim() || "7QFMb3jv")}${params.wallet?.trim() ? `&wallet=${encodeURIComponent(params.wallet.trim())}` : ""}`
                              : `/internal/email-preview?email=${preview.key}`
                          }
                          className="block rounded-lg border transition-colors hover:border-fg-muted"
                          style={{
                            background: active ? "var(--market-stats-segment-active-bg)" : "transparent",
                            borderColor: active ? "var(--fg-muted)" : "var(--leaders-card-border)",
                            padding: "8px 10px",
                          }}
                        >
                          <span className="block truncate text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-fg-muted">
                            {preview.kind === "text" ? "Text" : "React"} - {preview.subject}
                          </span>
                          <span className="mt-1 block text-sm font-semibold text-fg-heading">{preview.title}</span>
                          <span className="mt-1 block text-xs leading-4 text-fg-muted">{preview.description}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section
          className="min-w-0 overflow-hidden rounded-lg border"
          style={{
            borderColor: "var(--leaders-card-border)",
            minHeight: "calc(100vh - 170px)",
          }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: "var(--leaders-card-border)", background: "var(--leaders-card-bg)" }}
          >
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-fg-heading">{selected.title}</h2>
              <p className="mt-1 truncate text-xs text-fg-muted">Subject: {selected.subject}</p>
              {selected.key === "beta-invite" && (
                <BetaInviteWalletPicker value={selectedWallet} />
              )}
            </div>
            <Link
              href={permalink}
              className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted underline-offset-2 hover:underline"
            >
              Permalink
            </Link>
          </div>
          <iframe
            title={`${selected.title} preview`}
            srcDoc={html}
            className="w-full bg-white"
            style={{
              display: "block",
              width: "100%",
              height: "calc(100vh - 236px)",
              minHeight: 760,
              border: 0,
            }}
            sandbox=""
          />
        </section>
      </section>
    </main>
  );
}
