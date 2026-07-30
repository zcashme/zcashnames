import { NextResponse } from "next/server";
import { getPublicWaitlistViewData } from "@/lib/waitlist/view";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "10");
  const sortKey = url.searchParams.get("sortKey");
  const sortDirection = url.searchParams.get("sortDirection");
  const searchQuery = url.searchParams.get("search");
  const searchMode = url.searchParams.get("searchMode");
  const reservedOnly = url.searchParams.get("reservedOnly") === "true";
  const protectedOnly = url.searchParams.get("protectedOnly") === "true";

  try {
    const data = await getPublicWaitlistViewData({
      page,
      pageSize,
      sortKey,
      sortDirection,
      searchQuery,
      searchMode,
      reservedOnly,
      protectedOnly,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load waitlist view.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
