import { NextResponse } from "next/server";
import {
  buildWaitlistVerifyToken,
  buildWaitlistVerifyUrl,
  parseWaitlistConfirmResponseToken,
} from "@/lib/campaigns/waitlist-confirm-response";
import { db } from "@/lib/db";
import { findWaitlistRowsByNormalizedEmail } from "@/lib/campaigns/waitlist-verify";
import { refreshPublicWaitlistViewSnapshotSafe } from "@/lib/waitlist/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const token = searchParams.get("token")?.trim() ?? "";
  if (!token) {
    console.error("[waitlist-confirm-click] missing token", { requestId });
    return NextResponse.json({ ok: false, error: "Missing token.", requestId }, { status: 400 });
  }

  const parsed = parseWaitlistConfirmResponseToken(token);
  if (!parsed) {
    console.error("[waitlist-confirm-click] invalid token", { requestId });
    return NextResponse.json(
      { ok: false, error: "Invalid token.", requestId },
      { status: 400 },
    );
  }

  let rows;
  try {
    rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist rows.";
    console.error("[waitlist-confirm-click] lookup failed", {
      requestId,
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }

  if (rows.length === 0) {
    console.error("[waitlist-confirm-click] no matching waitlist rows", {
      requestId,
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
    });
    return NextResponse.json(
      { ok: false, error: "Waitlist recipient not found.", requestId },
      { status: 404 },
    );
  }

  const verifyToken = buildWaitlistVerifyToken({
    normalizedEmail: parsed.normalizedEmail,
    campaignId: parsed.campaignId,
  });
  const redirectUrl = buildWaitlistVerifyUrl({
    baseUrl: requestUrl.origin,
    token: verifyToken,
  });

  const unconfirmedRows = rows.filter((row) => !row.campaign_email_confirm_response);
  const unverifiedRows = rows.filter((row) => row.email_verified !== true);
  const unstampedVerifiedRows = rows.filter(
    (row) => row.email_verified === true && !row.email_verified_at,
  );
  const clickedAt = new Date().toISOString();
  const unverifiedRowsWithoutStamp = unverifiedRows.filter((row) => !row.email_verified_at);
  const unverifiedRowsWithExistingStamp = unverifiedRows.filter((row) =>
    Boolean(row.email_verified_at),
  );

  if (unverifiedRowsWithoutStamp.length > 0) {
    const { error: verifyUpdateError } = await db
      .from("zn_waitlist")
      .update({
        email_verified: true,
        email_verified_at: clickedAt,
      })
      .in(
        "id",
        unverifiedRowsWithoutStamp.map((row) => row.id),
      )
      .eq("email_verified", false);
    if (verifyUpdateError) {
      console.error("[waitlist-confirm-click] verify update failed", {
        requestId,
        normalizedEmail: parsed.normalizedEmail,
        campaignId: parsed.campaignId,
        matchedRows: rows.length,
        verifyingRows: unverifiedRowsWithoutStamp.length,
        error: verifyUpdateError.message,
      });
      return NextResponse.json(
        { ok: false, error: verifyUpdateError.message, requestId },
        { status: 500 },
      );
    }

  }

  if (unverifiedRowsWithExistingStamp.length > 0) {
      const { error: stampPreserveError } = await db
        .from("zn_waitlist")
        .update({ email_verified: true })
        .in(
          "id",
          unverifiedRowsWithExistingStamp.map((row) => row.id),
        )
        .eq("email_verified", false);
      if (stampPreserveError) {
        console.error("[waitlist-confirm-click] verify preserve update failed", {
          requestId,
          normalizedEmail: parsed.normalizedEmail,
          campaignId: parsed.campaignId,
          matchedRows: rows.length,
          verifyingRows: unverifiedRowsWithExistingStamp.length,
          error: stampPreserveError.message,
        });
        return NextResponse.json(
          { ok: false, error: stampPreserveError.message, requestId },
          { status: 500 },
        );
      }
  }

  if (unstampedVerifiedRows.length > 0) {
    const { error: stampUpdateError } = await db
      .from("zn_waitlist")
      .update({ email_verified_at: clickedAt })
      .in(
        "id",
        unstampedVerifiedRows.map((row) => row.id),
      )
      .is("email_verified_at", null);
    if (stampUpdateError) {
      console.error("[waitlist-confirm-click] verify timestamp update failed", {
        requestId,
        normalizedEmail: parsed.normalizedEmail,
        campaignId: parsed.campaignId,
        matchedRows: rows.length,
        stampingRows: unstampedVerifiedRows.length,
        error: stampUpdateError.message,
      });
      return NextResponse.json(
        { ok: false, error: stampUpdateError.message, requestId },
        { status: 500 },
      );
    }
  }

  if (unconfirmedRows.length > 0) {
    const { error: updateError } = await db
      .from("zn_waitlist")
      .update({
        campaign_email_confirm_response: true,
        campaign_email_confirm_response_at: clickedAt,
        campaign_email_confirm_response_campaign_id: parsed.campaignId,
        campaign_email_confirm_response_target_url: redirectUrl,
      })
      .in(
        "id",
        unconfirmedRows.map((row) => row.id),
      )
      .eq("campaign_email_confirm_response", false);
    if (updateError) {
      console.error("[waitlist-confirm-click] update failed", {
        requestId,
        normalizedEmail: parsed.normalizedEmail,
        campaignId: parsed.campaignId,
        matchedRows: rows.length,
        updatingRows: unconfirmedRows.length,
        error: updateError.message,
      });
      return NextResponse.json(
        { ok: false, error: updateError.message, requestId },
        { status: 500 },
      );
    }
  }

  if (unverifiedRows.length > 0 || unstampedVerifiedRows.length > 0 || unconfirmedRows.length > 0) {
    void refreshPublicWaitlistViewSnapshotSafe();
  }

  console.info("[waitlist-confirm-click] success", {
    requestId,
    normalizedEmail: parsed.normalizedEmail,
    campaignId: parsed.campaignId,
    matchedRows: rows.length,
    verifiedBeforeClickCount: rows.filter((row) => row.email_verified === true).length,
    reservedBeforeClickCount: rows.filter((row) => row.name_reserved === true).length,
    verificationUpdatedRows: unverifiedRows.length,
    verificationStampedRows: unstampedVerifiedRows.length,
    reservationUpdatedRows: unconfirmedRows.length,
    redirectUrl,
  });

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
