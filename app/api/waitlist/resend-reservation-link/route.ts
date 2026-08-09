import { NextResponse } from "next/server";
import { buildWaitlistConfirmResponseTrackingUrl } from "@/lib/campaigns/waitlist-confirm-response";
import { getProtectedNameInfoByName } from "@/lib/campaigns/waitlist-protected-access";
import { findWaitlistRowsByNormalizedEmail } from "@/lib/campaigns/waitlist-verify";
import {
  CAPTCHA_ERROR_MESSAGE,
  CAPTCHA_FAILED_CODE,
  verifyRequestCaptcha,
} from "@/lib/captcha/http";
import {
  buildWaitlistShareKitUrl,
  sendWaitlistReservationEmail,
  sendWaitlistReservationResendEmail,
} from "@/lib/email/waitlist";
import {
  getEmailAddressValidationMessage,
  normalizeEmailAddress,
} from "@/lib/email-address";
import { resolveSiteUrl } from "@/lib/site-url";
import {
  applyWaitlistReservationResendMinimumDelay,
  countRecentWaitlistReservationResendAttempts,
  getWaitlistReservationResendCampaignId,
  hashWaitlistReservationResendIp,
  normalizeWaitlistReservationResendIp,
  recordWaitlistReservationResendLog,
  recordWaitlistReservationResendSessionAttempt,
  WAITLIST_RESERVATION_RESEND_ACCEPTED_MESSAGE,
  wasWaitlistReservationResendSentRecently,
  waitlistReservationResendThrottleConfig,
} from "@/lib/waitlist/reservation-resend";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function acceptedResponse(requestId: string) {
  return NextResponse.json(
    {
      ok: true,
      status: "accepted",
      message: WAITLIST_RESERVATION_RESEND_ACCEPTED_MESSAGE,
      requestId,
    },
    { status: 200 },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  let payload: {
    email?: unknown;
    captcha_token?: unknown;
    captcha_answer?: unknown;
  } | null = null;
  try {
    payload = (await request.json()) as {
      email?: unknown;
      captcha_token?: unknown;
      captcha_answer?: unknown;
    };
  } catch {
    payload = null;
  }

  if (!verifyRequestCaptcha(payload)) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        code: CAPTCHA_FAILED_CODE,
        message: CAPTCHA_ERROR_MESSAGE,
        requestId,
      },
      { status: 400 },
    );
  }

  const rawEmail = typeof payload?.email === "string" ? payload.email : "";
  const normalizedEmail = normalizeEmailAddress(rawEmail);
  const validationMessage = getEmailAddressValidationMessage(normalizedEmail);
  if (validationMessage) {
    return NextResponse.json(
      {
        ok: false,
        status: "invalid_email",
        message: validationMessage,
        requestId,
      },
      { status: 400 },
    );
  }

  const ipHash = hashWaitlistReservationResendIp(
    normalizeWaitlistReservationResendIp(
      request.headers.get("cf-connecting-ip") ??
        request.headers.get("x-forwarded-for") ??
        request.headers.get("x-real-ip"),
    ),
  );

  let matchedRowCount = 0;
  let verifiedBeforeClickCount = 0;
  let reservedBeforeClickCount = 0;

  try {
    const rows = await findWaitlistRowsByNormalizedEmail(normalizedEmail);
    matchedRowCount = rows.length;
    verifiedBeforeClickCount = rows.filter((row) => row.email_verified === true).length;
    reservedBeforeClickCount = rows.filter((row) => row.name_reserved === true).length;

    const throttleConfig = waitlistReservationResendThrottleConfig();
    const [sessionThrottled, recentlySent] = await Promise.all([
      recordWaitlistReservationResendSessionAttempt(startedAt),
      wasWaitlistReservationResendSentRecently(normalizedEmail, startedAt),
    ]);

    const ipWindowStart = new Date(startedAt - throttleConfig.ip.windowMs).toISOString();
    const globalWindowStart = new Date(startedAt - throttleConfig.global.windowMs).toISOString();
    const [ipWindowCounts, globalWindowCounts] = await Promise.all([
      countRecentWaitlistReservationResendAttempts({
        ipHash,
        sinceIso: ipWindowStart,
      }),
      countRecentWaitlistReservationResendAttempts({
        ipHash: null,
        sinceIso: globalWindowStart,
      }),
    ]);

    const throttled =
      sessionThrottled ||
      ipWindowCounts.ipCount >= throttleConfig.ip.limit ||
      globalWindowCounts.globalCount >= throttleConfig.global.limit ||
      recentlySent;

    if (matchedRowCount === 0) {
      await recordWaitlistReservationResendLog({
        normalizedEmail,
        matchedRowCount,
        verifiedBeforeClickCount,
        reservedBeforeClickCount,
        outcome: "no_match",
        ipHash,
      });
      await applyWaitlistReservationResendMinimumDelay(startedAt);
      return acceptedResponse(requestId);
    }

    if (throttled) {
      await recordWaitlistReservationResendLog({
        normalizedEmail,
        matchedRowCount,
        verifiedBeforeClickCount,
        reservedBeforeClickCount,
        outcome: "throttled",
        ipHash,
      });
      await applyWaitlistReservationResendMinimumDelay(startedAt);
      return acceptedResponse(requestId);
    }

    const confirmUrl = buildWaitlistConfirmResponseTrackingUrl({
      normalizedEmail,
      campaignId: getWaitlistReservationResendCampaignId(),
      baseUrl:
        resolveSiteUrl({
          get: (name) => request.headers.get(name),
        }) || new URL(request.url).origin,
    });

    if (!confirmUrl) {
      console.error("[waitlist-resend] could not build confirm url", {
        requestId,
        normalizedEmail,
      });
      await recordWaitlistReservationResendLog({
        normalizedEmail,
        matchedRowCount,
        verifiedBeforeClickCount,
        reservedBeforeClickCount,
        outcome: "provider_error",
        ipHash,
      });
      await applyWaitlistReservationResendMinimumDelay(startedAt);
      return acceptedResponse(requestId);
    }

    let providerMessageId: string | null | undefined = null;
    try {
      const protectedNamesByName = await getProtectedNameInfoByName(rows.map((row) => row.name));
      const emailNames = rows
        .map((row) => {
          const preferredReferralCode =
            row.human_referral_code?.trim() || row.referral_code?.trim() || null;
          const protectedName = row.name?.trim()
            ? protectedNamesByName.get(row.name.trim().toLowerCase())
            : null;

          return {
            name: row.name?.trim() ?? "",
            status:
              row.name_reserved === true
                ? "reserved"
                : protectedName?.isProtected
                  ? "protected"
                  : "pending",
            shareKitUrl: buildWaitlistShareKitUrl(preferredReferralCode),
          } as const;
        })
        .filter((entry) => entry.name.length > 0);

      const result =
        emailNames.length > 1
          ? await sendWaitlistReservationEmail({
              email: normalizedEmail,
              confirmUrl,
              variant: "multi-name",
              names: emailNames,
            })
          : await sendWaitlistReservationResendEmail({
              email: normalizedEmail,
              name: rows[0]?.name ?? null,
              confirmUrl,
              shareKitUrl: buildWaitlistShareKitUrl(
                rows[0]?.human_referral_code?.trim() || rows[0]?.referral_code?.trim() || null,
              ),
              variant: "single-name",
            });
      providerMessageId = result.id ?? null;
    } catch (error) {
      console.error("[waitlist-resend] provider send failed", {
        requestId,
        normalizedEmail,
        matchedRowCount,
        verifiedBeforeClickCount,
        reservedBeforeClickCount,
        error: error instanceof Error ? error.message : "Unknown provider error.",
      });
      await recordWaitlistReservationResendLog({
        normalizedEmail,
        matchedRowCount,
        verifiedBeforeClickCount,
        reservedBeforeClickCount,
        outcome: "provider_error",
        ipHash,
      });
      await applyWaitlistReservationResendMinimumDelay(startedAt);
      return acceptedResponse(requestId);
    }

    await recordWaitlistReservationResendLog({
      normalizedEmail,
      matchedRowCount,
      verifiedBeforeClickCount,
      reservedBeforeClickCount,
      outcome: "sent",
      providerMessageId,
      ipHash,
    });

    console.info("[waitlist-resend] sent", {
      requestId,
      normalizedEmail,
      requestSource: "self_serve_resend",
      matchedRowCount,
      verifiedBeforeClickCount,
      reservedBeforeClickCount,
      providerMessageId,
    });

    await applyWaitlistReservationResendMinimumDelay(startedAt);
    return acceptedResponse(requestId);
  } catch (error) {
    console.error("[waitlist-resend] request failed", {
      requestId,
      normalizedEmail,
      matchedRowCount,
      verifiedBeforeClickCount,
      reservedBeforeClickCount,
      error: error instanceof Error ? error.message : "Unknown error.",
    });
    await recordWaitlistReservationResendLog({
      normalizedEmail,
      matchedRowCount,
      verifiedBeforeClickCount,
      reservedBeforeClickCount,
      outcome: "provider_error",
      ipHash,
    });
    await applyWaitlistReservationResendMinimumDelay(startedAt);
    return acceptedResponse(requestId);
  }
}
