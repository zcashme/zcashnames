import { NextResponse } from "next/server";
import { getInternalReferralStats } from "@/lib/leaders/leaders";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const expectedToken = process.env.INTERNAL_REFERRAL_STATS_TOKEN?.trim();
  if (!expectedToken) return false;

  const authorization = request.headers.get("authorization")?.trim();
  return authorization === `Bearer ${expectedToken}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await context.params;
    const stats = await getInternalReferralStats(code);
    if (!stats) {
      return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
    }

    return NextResponse.json(stats);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
