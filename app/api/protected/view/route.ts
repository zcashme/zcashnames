import { NextResponse } from "next/server";
import { getProtectedViewData } from "@/lib/protected/view";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);

  try {
    const data = await getProtectedViewData({
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
      sortKey: url.searchParams.get("sortKey"),
      sortDirection: url.searchParams.get("sortDirection"),
      searchQuery: url.searchParams.get("search"),
      searchMode: url.searchParams.get("searchMode"),
      redeemedOnly: url.searchParams.get("redeemedOnly"),
      underReviewOnly: url.searchParams.get("underReviewOnly"),
      rejectedOnly: url.searchParams.get("rejectedOnly"),
      disputedOnly: url.searchParams.get("disputedOnly"),
      ensOnly: url.searchParams.get("ensOnly"),
      zmOnly: url.searchParams.get("zmOnly"),
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load protected view.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
