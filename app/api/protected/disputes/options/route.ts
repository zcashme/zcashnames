import { NextResponse } from "next/server";
import { getProtectedDisputeOptions } from "@/lib/protected/disputes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  try {
    const options = await getProtectedDisputeOptions({ query });
    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load dispute options.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
