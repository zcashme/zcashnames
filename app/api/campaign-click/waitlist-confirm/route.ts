import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildWaitlistConfirmResponseRedirectUrl,
  getWaitlistConfirmResponseRedirectUrl,
  parseWaitlistConfirmResponseToken,
} from "@/lib/campaigns/waitlist-confirm-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WaitlistClickRow = {
  id: string;
  email: string | null;
  name: string | null;
  referral_code: string | null;
  human_referral_code: string | null;
  campaign_email_confirm_response: boolean | null;
};

const WAITLIST_CLICK_PAGE_SIZE = 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim() ?? "").filter(Boolean))];
}

async function findWaitlistRowsByNormalizedEmail(
  normalizedEmail: string,
): Promise<WaitlistClickRow[]> {
  const rows: WaitlistClickRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select(
        "id, email, name, referral_code, human_referral_code, campaign_email_confirm_response",
      )
      .ilike("email", normalizedEmail)
      .range(offset, offset + WAITLIST_CLICK_PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }

    const batch = ((data ?? []) as WaitlistClickRow[]).filter(
      (row) => row.email && normalizeEmail(row.email) === normalizedEmail,
    );
    rows.push(...batch);

    if ((data ?? []).length < WAITLIST_CLICK_PAGE_SIZE) {
      break;
    }
    offset += WAITLIST_CLICK_PAGE_SIZE;
  }

  return rows;
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
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

  const redirectUrlTemplate = getWaitlistConfirmResponseRedirectUrl();
  if (!redirectUrlTemplate) {
    console.error("[waitlist-confirm-click] missing redirect url env", {
      requestId,
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "WAITLIST_CONFIRM_RESPONSE_REDIRECT_URL is not configured.",
        requestId,
      },
      { status: 500 },
    );
  }

  let rows: WaitlistClickRow[];
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

  let redirectUrl: string;
  try {
    redirectUrl = buildWaitlistConfirmResponseRedirectUrl({
      redirectUrlTemplate,
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      names: uniqueNonEmpty(rows.map((row) => row.name)),
      waitlistIds: uniqueNonEmpty(rows.map((row) => row.id)),
      referralCodes: uniqueNonEmpty(rows.map((row) => row.referral_code)),
      humanReferralCodes: uniqueNonEmpty(rows.map((row) => row.human_referral_code)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to build redirect URL.";
    console.error("[waitlist-confirm-click] redirect build failed", {
      requestId,
      normalizedEmail: parsed.normalizedEmail,
      campaignId: parsed.campaignId,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
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
