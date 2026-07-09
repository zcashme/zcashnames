import { NextResponse } from "next/server";
import { parseWaitlistConfirmResponseToken } from "@/lib/campaigns/waitlist-confirm-response";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() ?? "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const parsed = parseWaitlistConfirmResponseToken(token);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "Invalid or expired token." }, { status: 400 });
  }

  const { data, error } = await db
    .from("zn_waitlist")
    .select("id, campaign_email_confirm_response")
    .eq("id", parsed.waitlistId)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!data?.id) {
    return NextResponse.json({ ok: false, error: "Waitlist row not found." }, { status: 404 });
  }

  if (!data.campaign_email_confirm_response) {
    const clickedAt = new Date().toISOString();
    const { error: updateError } = await db
      .from("zn_waitlist")
      .update({
        campaign_email_confirm_response: true,
        campaign_email_confirm_response_at: clickedAt,
        campaign_email_confirm_response_campaign_id: parsed.campaignId,
        campaign_email_confirm_response_target_url: parsed.redirectUrl,
      })
      .eq("id", parsed.waitlistId)
      .eq("campaign_email_confirm_response", false);
    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.redirect(parsed.redirectUrl, { status: 302 });
}
