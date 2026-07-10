import { NextResponse } from "next/server";
import {
  buildWaitlistVerifyToken,
  buildWaitlistVerifyUrl,
  parseWaitlistConfirmResponseToken,
} from "@/lib/campaigns/waitlist-confirm-response";
import { db } from "@/lib/db";
import { findWaitlistRowsByNormalizedEmail } from "@/lib/campaigns/waitlist-verify";

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
      { ok: false, error: "Invalid or expired token.", requestId },
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

  if (unconfirmedRows.length > 0) {
    const clickedAt = new Date().toISOString();
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

  console.info("[waitlist-confirm-click] success", {
    requestId,
    normalizedEmail: parsed.normalizedEmail,
    campaignId: parsed.campaignId,
    matchedRows: rows.length,
    updatedRows: unconfirmedRows.length,
    redirectUrl,
  });

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
