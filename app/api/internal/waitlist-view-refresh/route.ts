import { NextResponse } from "next/server";
import { rebuildPublicWaitlistViewSnapshot } from "@/lib/waitlist/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getRefreshSecret(): string {
  const secret =
    process.env.WAITLIST_VIEW_REFRESH_SECRET ||
    process.env.WAITLIST_CONFIRM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing waitlist view refresh secret.");
  return secret;
}

function isAuthorized(request: Request): boolean {
  const secret = getRefreshSecret();
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization")?.trim();
  const headerSecret = request.headers.get("x-refresh-secret")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();

  return (
    authHeader === `Bearer ${secret}` ||
    headerSecret === secret ||
    querySecret === secret
  );
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await rebuildPublicWaitlistViewSnapshot();
    return NextResponse.json({ ok: true, rowCount: result.rowCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refresh waitlist view snapshot.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
