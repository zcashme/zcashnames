import type { Metadata } from "next";
import type { ComponentProps } from "react";
import fs from "fs/promises";
import path from "path";
import WaitlistVerifyClient, { HeroHowReservationsWork } from "@/components/verify/WaitlistVerifyClient";
import VerifyAmbientHeroSection from "@/components/verify/VerifyAmbientHeroSection";
import WaitlistReservationResendForm from "@/components/verify/WaitlistReservationResendForm";
import {
  getWaitlistVerifyPaymentAddress,
  getWaitlistVerifyReserveFeeZec,
  parseWaitlistVerifyToken,
} from "@/lib/campaigns/waitlist-confirm-response";
import {
  buildWaitlistVerifyMemo,
  findWaitlistRowsByNormalizedEmail,
  getWaitlistVerifyReferralStats,
  getWaitlistVerifyNameStats,
  getWaitlistVerifyPotentialRewards,
} from "@/lib/campaigns/waitlist-verify";
import { getActiveWaitlistRowDeleteRequests } from "@/lib/campaigns/waitlist-row-delete";
import { getWaitlistVerifyRowPreferences } from "@/lib/campaigns/waitlist-verify-preferences";
import {
  getLatestProtectedAccessRequestsByRowId,
  getProtectedNameInfoByName,
} from "@/lib/campaigns/waitlist-protected-access";
import { parseShareKitMarkdown } from "@/lib/sharekit";
import {
  WAITLIST_VIEW_EARLY_ACCESS_LABEL,
  WAITLIST_VIEW_EARLY_ACCESS_START_AT,
} from "@/lib/waitlist/view";

type VerifyPageProps = {
  searchParams?: Promise<{ token?: string }>;
};

type VerifyPageCard = ComponentProps<typeof WaitlistVerifyClient>["cards"][number];

export const metadata: Metadata = {
  title: "Verify Waitlist Spot - Zcash Names",
  description: "Verify your Zcash Names waitlist spot and prepare one ZIP-321 payment request per name.",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
const SHAREKIT_PATH = path.join(process.cwd(), "content", "sharekit.md");

async function getVerifyShareDraftPosts(): Promise<string[]> {
  try {
    const markdown = await fs.readFile(SHAREKIT_PATH, "utf8");
    return parseShareKitMarkdown(markdown)
      .flatMap((section) => section.drafts)
      .map((draft) => draft.post.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function ErrorPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div
      className="rounded-[28px] border px-6 py-8 text-center"
      style={{
        borderColor: "color-mix(in srgb, var(--accent-red, #e05252) 28%, var(--faq-border))",
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--accent-red, #e05252) 7%, transparent), color-mix(in srgb, var(--faq-border) 12%, transparent))",
      }}
    >
      <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--fg-heading)" }}>
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7" style={{ color: "var(--fg-body)" }}>
        {body}
      </p>
      <p className="mt-4 text-sm" style={{ color: "var(--fg-muted)" }}>
        If this keeps happening, request a fresh email and try again.
      </p>
    </div>
  );
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const params = (await searchParams) ?? {};
  const token = params.token?.trim() ?? "";

  if (!token) {
    return (
      <>
        <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14">
          <VerifyAmbientHeroSection
            earlyAccessStartAt={WAITLIST_VIEW_EARLY_ACCESS_START_AT}
            hero={
              <div
                className="mx-auto mb-12 max-w-[920px] rounded-2xl border px-6 py-8 text-center sm:mb-14 sm:px-8 sm:py-10"
                style={{
                  borderColor: "var(--faq-border)",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
                }}
              >
                <h1
                  className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
                  style={{ color: "var(--fg-heading)" }}
                >
                  Recover your{" "}
                  <span style={{ color: "var(--color-accent-interactive)" }}>
                    reservation link
                  </span>
                </h1>
                <p
                  className="mx-auto mt-4 max-w-2xl text-lg leading-8"
                  style={{ color: "var(--fg-body)" }}
                >
                  If you are on the waitlist, check your email - we sent you a reservation link.
                  Need another? Enter your email address below.
                </p>
                <HeroHowReservationsWork />
                <div className="mx-auto mt-10 w-full max-w-[760px] text-left">
                  <WaitlistReservationResendForm showFooter={false} />
                </div>
              </div>
            }
            footer={
              <div className="mx-auto mt-8 max-w-[920px]">
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-sm">
                  <span
                    className="inline-flex items-center gap-3"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
                    </svg>
                    <span>We only use your email to send your reservation link.</span>
                  </span>
                  <a
                    href="/docs/learn/privacy"
                    className="inline-flex items-center gap-2 font-semibold transition hover:opacity-80"
                    style={{ color: "var(--color-accent-interactive)" }}
                  >
                    <span>Privacy policy</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M14 3h7v7" />
                      <path d="M10 14 21 3" />
                      <path d="M21 14v4a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h4" />
                    </svg>
                  </a>
                </div>
              </div>
            }
          />
        </div>
      </>
    );
  }

  const parsed = parseWaitlistVerifyToken(token);
  if (!parsed) {
    console.error("[waitlist-verify-page] invalid token");
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Verify link invalid"
          body="This verify link is invalid. Open the most recent campaign email and click the link again."
        />
      </div>
    );
  }

  const paymentAddress = getWaitlistVerifyPaymentAddress();
  const baseAmountZec = getWaitlistVerifyReserveFeeZec();
  if (!paymentAddress || !baseAmountZec) {
    console.error("[waitlist-verify-page] missing payment config", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      hasPaymentAddress: Boolean(paymentAddress),
      hasBaseAmount: Boolean(baseAmountZec),
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Verify page unavailable"
          body="The verification payment configuration is incomplete right now."
        />
      </div>
    );
  }

  let rows;
  try {
    rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist entries.";
    console.error("[waitlist-verify-page] row lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load names"
          body="We couldn't load your waitlist names for verification right now."
        />
      </div>
    );
  }

  if (rows.length === 0) {
    console.error("[waitlist-verify-page] no rows found", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="No waitlist names found"
          body="We couldn't find any waitlist names for the email address tied to this verify link."
        />
      </div>
    );
  }

  let nameStats;
  try {
    nameStats = await getWaitlistVerifyNameStats(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist name stats.";
    console.error("[waitlist-verify-page] name stats lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load name positions"
          body="We couldn't load the reservation queue information for these waitlist names right now."
        />
      </div>
    );
  }

  let referralStats;
  try {
    referralStats = await getWaitlistVerifyReferralStats(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load referral stats.";
    console.error("[waitlist-verify-page] referral stats lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load referral stats"
          body="We couldn't load referral information for these waitlist names right now."
        />
      </div>
    );
  }

  let potentialRewardsByRowId;
  try {
    potentialRewardsByRowId = await getWaitlistVerifyPotentialRewards(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load referral reward stats.";
    console.error("[waitlist-verify-page] referral reward stats lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load referral rewards"
          body="We couldn't load referral reward information for these waitlist names right now."
        />
      </div>
    );
  }

  let rowPreferences;
  try {
    rowPreferences = await getWaitlistVerifyRowPreferences({
      normalizedEmail: parsed.normalizedEmail,
      rowIds: rows.map((row) => row.id),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load verify row preferences.";
    console.error("[waitlist-verify-page] row preference lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load name preferences"
          body="We couldn't load your saved name-card preferences right now."
        />
      </div>
    );
  }

  let activeDeleteRequestsByRowId;
  try {
    activeDeleteRequestsByRowId = await getActiveWaitlistRowDeleteRequests({
      rowIds: rows.map((row) => row.id),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load pending delete requests.";
    console.error("[waitlist-verify-page] delete request lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load name actions"
          body="We couldn't load pending removal requests for these waitlist names right now."
        />
      </div>
    );
  }

  let protectedNamesByName: Awaited<ReturnType<typeof getProtectedNameInfoByName>>;
  try {
    protectedNamesByName = await getProtectedNameInfoByName(rows.map((row) => row.name));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load protected-name data.";
    console.error("[waitlist-verify-page] protected name lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load protected-name access"
          body="We couldn't load protected-name review information for these waitlist names right now."
        />
      </div>
    );
  }

  let protectedRequestsByRowId: Awaited<
    ReturnType<typeof getLatestProtectedAccessRequestsByRowId>
  >;
  try {
    protectedRequestsByRowId = await getLatestProtectedAccessRequestsByRowId(
      rows.map((row) => row.id),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load protected-name requests.";
    console.error("[waitlist-verify-page] protected request lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load access requests"
          body="We couldn't load protected-name request information for these waitlist names right now."
        />
      </div>
    );
  }

  const shareDraftPosts = await getVerifyShareDraftPosts();

  const cards: VerifyPageCard[] = rows.map((row): VerifyPageCard => {
    const stats = nameStats.get(row.id);
    const rowReferralStats = referralStats.get(row.id);
    const preferredReferralCode =
      row.human_referral_code?.trim() || row.referral_code?.trim() || null;
    const protectedName = row.name?.trim()
      ? protectedNamesByName.get(row.name.trim().toLowerCase())
      : null;
    const protectedRequest = protectedRequestsByRowId.get(row.id) ?? null;
    const activeDeleteRequest = activeDeleteRequestsByRowId.get(row.id) ?? null;
    const protectedRequestStatus: VerifyPageCard["protectedRequestStatus"] =
      protectedRequest?.status ?? "not_submitted";
    try {
      return {
        id: row.id,
        name: row.name,
        collapsed: rowPreferences.get(row.id) ?? false,
        reserved: row.name_reserved === true,
        protectedName: protectedName?.isProtected ?? false,
        deleteRequestStatus: activeDeleteRequest ? "pending" : "none",
        deleteRequestId: activeDeleteRequest?.id ?? null,
        deleteRequestRequestedAt: activeDeleteRequest?.requestedAt ?? null,
        deleteRequestExpiresAt: activeDeleteRequest?.expiresAt ?? null,
        protectedRequestStatus,
        protectedRequestId: protectedRequest?.id ?? null,
        protectedRequestReferenceNumber: protectedRequest?.referenceNumber ?? null,
        protectedRequestSubmittedAt: protectedRequest?.submittedAt ?? null,
        protectedRequestPreferredContactKind: protectedRequest?.preferredContactKind ?? null,
        protectedRequestPreferredContactValue: protectedRequest?.preferredContactValue ?? null,
        protectedRequestContactMethods: protectedRequest?.contactMethods ?? [],
        protectedRequestRelationship: protectedRequest?.relationship ?? null,
        protectedRequestSupportingLink: protectedRequest?.supportingLink ?? null,
        protectedRequestAdditionalContext: protectedRequest?.additionalContext ?? null,
        protectedRequestApprovedAt: protectedRequest?.approvedAt ?? null,
        protectedRequestDeniedAt: protectedRequest?.deniedAt ?? null,
        reservedAt: row.name_reserved_at,
        reservedTxid: row.name_reserved_txid,
        totalForName: stats?.totalCount ?? 1,
        positionForName: stats?.reservedPosition ?? null,
        waitlistLinePosition: stats?.waitlistPosition ?? null,
        totalReferrals: rowReferralStats?.totalReferrals ?? 0,
        reservedReferrals: rowReferralStats?.reservedReferrals ?? 0,
        potentialRewards: potentialRewardsByRowId.get(row.id) ?? 0,
        referralCode: preferredReferralCode,
        waitlistHref: row.name?.trim()
          ? `/waitlist/view?search=${encodeURIComponent(row.name.trim())}&searchMode=exact`
          : null,
        memo: buildWaitlistVerifyMemo(row.name, row.id),
        memoError: null,
      };
    } catch (error) {
      return {
        id: row.id,
        name: row.name,
        collapsed: rowPreferences.get(row.id) ?? false,
        reserved: row.name_reserved === true,
        protectedName: protectedName?.isProtected ?? false,
        deleteRequestStatus: activeDeleteRequest ? "pending" : "none",
        deleteRequestId: activeDeleteRequest?.id ?? null,
        deleteRequestRequestedAt: activeDeleteRequest?.requestedAt ?? null,
        deleteRequestExpiresAt: activeDeleteRequest?.expiresAt ?? null,
        protectedRequestStatus,
        protectedRequestId: protectedRequest?.id ?? null,
        protectedRequestReferenceNumber: protectedRequest?.referenceNumber ?? null,
        protectedRequestSubmittedAt: protectedRequest?.submittedAt ?? null,
        protectedRequestPreferredContactKind: protectedRequest?.preferredContactKind ?? null,
        protectedRequestPreferredContactValue: protectedRequest?.preferredContactValue ?? null,
        protectedRequestContactMethods: protectedRequest?.contactMethods ?? [],
        protectedRequestRelationship: protectedRequest?.relationship ?? null,
        protectedRequestSupportingLink: protectedRequest?.supportingLink ?? null,
        protectedRequestAdditionalContext: protectedRequest?.additionalContext ?? null,
        protectedRequestApprovedAt: protectedRequest?.approvedAt ?? null,
        protectedRequestDeniedAt: protectedRequest?.deniedAt ?? null,
        reservedAt: row.name_reserved_at,
        reservedTxid: row.name_reserved_txid,
        totalForName: stats?.totalCount ?? 1,
        positionForName: stats?.reservedPosition ?? null,
        waitlistLinePosition: stats?.waitlistPosition ?? null,
        totalReferrals: rowReferralStats?.totalReferrals ?? 0,
        reservedReferrals: rowReferralStats?.reservedReferrals ?? 0,
        potentialRewards: potentialRewardsByRowId.get(row.id) ?? 0,
        referralCode: preferredReferralCode,
        waitlistHref: row.name?.trim()
          ? `/waitlist/view?search=${encodeURIComponent(row.name.trim())}&searchMode=exact`
          : null,
        memo: null,
        memoError:
          error instanceof Error
            ? error.message
            : "This row is missing a usable name, so a payment request could not be generated.",
      };
    }
  });
  console.info("[waitlist-verify-page] loaded", {
    normalizedEmail: parsed.normalizedEmail,
    campaignId: parsed.campaignId,
    rowCount: rows.length,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
      <WaitlistVerifyClient
        verifyToken={token}
        paymentAddress={paymentAddress}
        baseAmountZec={baseAmountZec}
        cards={cards}
        displayEmail={rows[0]?.email?.trim() || parsed.normalizedEmail}
        normalizedEmail={parsed.normalizedEmail}
        earlyAccessStartAt={WAITLIST_VIEW_EARLY_ACCESS_START_AT}
        earlyAccessLabel={WAITLIST_VIEW_EARLY_ACCESS_LABEL}
        shareDraftPosts={shareDraftPosts}
      />

    </div>
  );
}
