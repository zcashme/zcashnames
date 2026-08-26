import type { ComponentProps } from "react";
import fs from "fs/promises";
import path from "path";
import { headers } from "next/headers";
import WaitlistVerifyClient, { HeroHowReservationsWork } from "@/components/verify/WaitlistVerifyClient";
import VerifyAmbientHeroSection from "@/components/verify/VerifyAmbientHeroSection";
import WaitlistReservationResendForm from "@/components/verify/WaitlistReservationResendForm";
import WaitlistEntryForm from "@/components/landing/WaitlistEntryForm";
import HeroShareButton from "@/components/HeroShareButton";
import {
  getWaitlistReservePaymentAddress,
  getWaitlistReserveFeeZec,
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
import { getNoirReservationRebatesByRowId } from "@/lib/waitlist/rebates";
import {
  getLatestProtectedAccessRequestsByRowId,
  getProtectedNameInfoByName,
} from "@/lib/campaigns/waitlist-protected-access";
import { parseShareKitMarkdown } from "@/lib/sharekit";
import { RESERVE_METADATA } from "@/lib/reserve-metadata";
import {
  WAITLIST_VIEW_EARLY_ACCESS_LABEL,
  WAITLIST_VIEW_EARLY_ACCESS_START_AT,
} from "@/lib/waitlist/view";

type ReservePageProps = {
  searchParams?: Promise<{ token?: string }>;
};

type ReservePageCard = ComponentProps<typeof WaitlistVerifyClient>["cards"][number];

export const metadata = RESERVE_METADATA;

export const dynamic = "force-dynamic";
const SHAREKIT_PATH = path.join(process.cwd(), "content", "sharekit.md");
const LOCAL_ZN_PRIORITY_PREVIEW_TOKEN = "preview-zn-priority";

function isLocalPreviewHost(hostHeader: string | null): boolean {
  const host = (hostHeader ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const hostname = host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function buildZnPriorityPreviewCards(): ReservePageCard[] {
  return [
    {
      id: "preview-zn-priority",
      name: "Zcash",
      collapsed: false,
      reserved: false,
      protectedName: true,
      zmPriorityClaim: true,
      protectedExpiresAt: "2027-01-01T00:00:00.000Z",
      deleteRequestStatus: "none",
      deleteRequestId: null,
      deleteRequestRequestedAt: null,
      deleteRequestExpiresAt: null,
      protectedRequestStatus: "not_submitted",
      protectedRequestId: null,
      protectedRequestReferenceNumber: null,
      protectedRequestSubmittedAt: null,
      protectedRequestPreferredContactKind: null,
      protectedRequestPreferredContactValue: null,
      protectedRequestContactMethods: [],
      protectedRequestRelationship: null,
      protectedRequestSupportingLink: null,
      protectedRequestAdditionalContext: null,
      protectedRequestApprovedAt: null,
      protectedRequestDeniedAt: null,
      reservedAt: null,
      reservedTxid: null,
      totalForName: 1,
      positionForName: null,
      waitlistLinePosition: null,
      totalReferrals: 0,
      reservedReferrals: 0,
      potentialRewards: 0,
      referralCode: null,
      waitlistHref: "/waitlist/view?search=Zcash&searchMode=exact",
      memo: null,
      memoError: null,
      rebateEnabled: false,
      rebateUnifiedAddress: null,
    },
  ];
}

async function getReserveShareDraftPosts(): Promise<string[]> {
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

export default async function ReservePage({ searchParams }: ReservePageProps) {
  const params = (await searchParams) ?? {};
  const token = params.token?.trim() ?? "";

  if (!token) {
    return (
      <>
        {/* No extra page pb — FooterSitemap mt alone matches rule → join heading. */}
        <div className="mx-auto w-full max-w-[1320px] px-4 pb-0 pt-10 sm:px-6 sm:pt-14">
          <VerifyAmbientHeroSection
            earlyAccessStartAt={WAITLIST_VIEW_EARLY_ACCESS_START_AT}
            hero={
              <div
                className="relative mx-auto mb-12 max-w-[920px] rounded-2xl border px-6 py-8 text-center sm:mb-14 sm:px-8 sm:py-10"
                style={{
                  borderColor: "var(--faq-border)",
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--color-bg-elevated, transparent) 74%, transparent), color-mix(in srgb, var(--faq-border) 9%, transparent))",
                }}
              >
                <HeroShareButton
                  message="Recover your Zcash Names reservation link or join the waitlist:"
                  shareUrl="https://www.zcashnames.com/reserve"
                  emailSubject="Zcash Names reservation link"
                />
                <h1
                  className="text-balance text-4xl font-black tracking-[-0.05em] sm:text-5xl md:text-6xl"
                  style={{ color: "var(--fg-heading)" }}
                >
                  Recover your
                  <br />
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
                <div className="mx-auto mt-8 w-full max-w-[760px] text-left sm:mt-9">
                  <WaitlistReservationResendForm showFooter={false} />
                </div>
              </div>
            }
            footer={
              <>
                <div className="mx-auto w-full max-w-[920px]">
                  <HeroHowReservationsWork />
                </div>
                <div
                  className="mx-auto mt-10 max-w-[920px] border-t sm:mt-12"
                  style={{ borderColor: "var(--faq-border)" }}
                  aria-hidden="true"
                />
                <div className="mx-auto mt-10 max-w-[920px] sm:mt-12">
                  <div className="mx-auto max-w-4xl">
                    <h2
                      className="text-balance text-center text-[1.65rem] font-bold tracking-tight"
                      style={{ color: "var(--hero-headline-primary, var(--fg-heading))" }}
                    >
                      Join the waitlist{" "}
                      <span style={{ color: "var(--color-accent-interactive)" }}>first</span>
                    </h2>
                    <p
                      className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 sm:text-base"
                      style={{ color: "var(--fg-body)" }}
                    >
                      <strong>Add your name to the waitlist then reserve your place.</strong>
                    </p>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <WaitlistEntryForm showNewsletter={false} />
                  </div>
                </div>
              </>
            }
          />
        </div>
      </>
    );
  }

  if (token === LOCAL_ZN_PRIORITY_PREVIEW_TOKEN) {
    const host = (await headers()).get("host");
    if (isLocalPreviewHost(host)) {
      const paymentAddress =
        getWaitlistReservePaymentAddress() ?? "u1preview0000000000000000000000000000000000";
      const baseAmountZec = getWaitlistReserveFeeZec() ?? "0.01";
      const shareDraftPosts = await getReserveShareDraftPosts();

      return (
        <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:pb-12 sm:pt-6">
          <WaitlistVerifyClient
            verifyToken={token}
            paymentAddress={paymentAddress}
            baseAmountZec={baseAmountZec}
            cards={buildZnPriorityPreviewCards()}
            displayEmail="preview@localhost"
            normalizedEmail="preview@localhost"
            earlyAccessStartAt={WAITLIST_VIEW_EARLY_ACCESS_START_AT}
            earlyAccessLabel={WAITLIST_VIEW_EARLY_ACCESS_LABEL}
            shareDraftPosts={shareDraftPosts}
          />
        </div>
      );
    }
  }

  const parsed = parseWaitlistVerifyToken(token);
  if (!parsed) {
    console.error("[waitlist-reserve-page] invalid token");
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Reservation link invalid"
          body="This reservation link is invalid. Open the most recent campaign email and click the link again."
        />
      </div>
    );
  }

  const paymentAddress = getWaitlistReservePaymentAddress();
  const baseAmountZec = getWaitlistReserveFeeZec();
  if (!paymentAddress || !baseAmountZec) {
    console.error("[waitlist-reserve-page] missing payment config", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      hasPaymentAddress: Boolean(paymentAddress),
      hasBaseAmount: Boolean(baseAmountZec),
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Reservation page unavailable"
          body="The reservation payment configuration is incomplete right now."
        />
      </div>
    );
  }

  let rows;
  try {
    rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist entries.";
    console.error("[waitlist-reserve-page] row lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="Could not load names"
          body="We couldn't load your waitlist names for reservation right now."
        />
      </div>
    );
  }

  if (rows.length === 0) {
    console.error("[waitlist-reserve-page] no rows found", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
    });
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10">
        <ErrorPanel
          title="No waitlist names found"
          body="We couldn't find any waitlist names for the email address tied to this reservation link."
        />
      </div>
    );
  }

  let nameStats;
  try {
    nameStats = await getWaitlistVerifyNameStats(rows);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist name stats.";
    console.error("[waitlist-reserve-page] name stats lookup failed", {
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
    console.error("[waitlist-reserve-page] referral stats lookup failed", {
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
    console.error("[waitlist-reserve-page] referral reward stats lookup failed", {
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
      error instanceof Error ? error.message : "Failed to load reservation row preferences.";
    console.error("[waitlist-reserve-page] row preference lookup failed", {
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
    console.error("[waitlist-reserve-page] delete request lookup failed", {
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
    console.error("[waitlist-reserve-page] protected name lookup failed", {
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
    console.error("[waitlist-reserve-page] protected request lookup failed", {
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

  const shareDraftPosts = await getReserveShareDraftPosts();

  let rebatesByRowId = new Map<string, { unifiedAddress: string }>();
  try {
    rebatesByRowId = await getNoirReservationRebatesByRowId({
      normalizedEmail: parsed.normalizedEmail,
      rowIds: rows.map((row) => row.id),
    });
  } catch (error) {
    console.error("[waitlist-reserve-page] rebate lookup failed", {
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: error instanceof Error ? error.message : "Failed to load rebate opt-ins.",
    });
  }

  const cards: ReservePageCard[] = rows.map((row): ReservePageCard => {
    const stats = nameStats.get(row.id);
    const rowReferralStats = referralStats.get(row.id);
    const preferredReferralCode =
      row.human_referral_code?.trim() || row.referral_code?.trim() || null;
    const rebate = rebatesByRowId.get(row.id) ?? null;
    const protectedName = row.name?.trim()
      ? protectedNamesByName.get(row.name.trim().toLowerCase())
      : null;
    const protectedRequest = protectedRequestsByRowId.get(row.id) ?? null;
    const activeDeleteRequest = activeDeleteRequestsByRowId.get(row.id) ?? null;
    const protectedRequestStatus: ReservePageCard["protectedRequestStatus"] =
      protectedRequest?.status ?? "not_submitted";
    try {
      return {
        id: row.id,
        name: row.name,
        collapsed: rowPreferences.get(row.id) ?? false,
        reserved: row.name_reserved === true,
        protectedName: protectedName?.isProtected ?? false,
        zmPriorityClaim: protectedName?.zmPriorityClaim === true,
        protectedExpiresAt: protectedName?.expiresAt ?? null,
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
        rebateEnabled: Boolean(rebate),
        rebateUnifiedAddress: rebate?.unifiedAddress ?? null,
      };
    } catch (error) {
      return {
        id: row.id,
        name: row.name,
        collapsed: rowPreferences.get(row.id) ?? false,
        reserved: row.name_reserved === true,
        protectedName: protectedName?.isProtected ?? false,
        zmPriorityClaim: protectedName?.zmPriorityClaim === true,
        protectedExpiresAt: protectedName?.expiresAt ?? null,
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
        rebateEnabled: Boolean(rebate),
        rebateUnifiedAddress: rebate?.unifiedAddress ?? null,
      };
    }
  });
  console.info("[waitlist-reserve-page] loaded", {
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
