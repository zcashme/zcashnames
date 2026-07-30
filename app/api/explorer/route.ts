import { NextResponse } from "next/server";
import { getExplorerListData } from "@/app/(site)/explorer/listData";
import {
  normalizeExplorerSort,
  parseExplorerNetwork,
  parseExplorerPage,
  parseExplorerPageSize,
  parseExplorerSearchMode,
  parseExplorerTab,
} from "@/app/(site)/explorer/listConfig";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = parseExplorerNetwork(searchParams.get("env"));
  const tab = parseExplorerTab(searchParams.get("tab") ?? undefined);
  const page = parseExplorerPage(searchParams.get("page"));
  const pageSize = parseExplorerPageSize(searchParams.get("pageSize"));
  const searchMode = parseExplorerSearchMode(searchParams.get("searchMode"));
  const searchQuery = searchParams.get("search") ?? "";
  const { sortKey, sortDirection } = normalizeExplorerSort(
    tab,
    searchParams.get("sortKey"),
    searchParams.get("sortDirection"),
  );

  const data = await getExplorerListData({
    network,
    tab,
    page,
    pageSize,
    sortKey,
    sortDirection,
    searchQuery,
    searchMode,
  });

  return NextResponse.json(data);
}
