import { NextResponse } from "next/server";
import { getProtectedRequestOptions } from "@/lib/protected/requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  try {
    const options = await getProtectedRequestOptions({ query });
    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load request options.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
