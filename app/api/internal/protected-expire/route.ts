import { NextResponse } from "next/server";
import { expireProtectedNames } from "@/lib/zns/protected-claim";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getExpireSecret(): string {
  const secret =
    process.env.PROTECTED_EXPIRE_SECRET
    || process.env.WAITLIST_VIEW_REFRESH_SECRET
    || process.env.WAITLIST_CONFIRM_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing protected-name expire secret.");
  return secret;
}

function isAuthorized(request: Request): boolean {
  const secret = getExpireSecret();
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization")?.trim();
  const headerSecret = request.headers.get("x-refresh-secret")?.trim();
  const querySecret = url.searchParams.get("secret")?.trim();

  return (
    authHeader === `Bearer ${secret}`
    || headerSecret === secret
    || querySecret === secret
  );
}

/**
 * Batch-expire unclaimed protected names past expires_at.
 * GET or POST with Authorization: Bearer <secret> (or x-refresh-secret / ?secret=).
 */
async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const expiredCount = await expireProtectedNames();
    return NextResponse.json({ ok: true, expiredCount });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to expire protected names.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
