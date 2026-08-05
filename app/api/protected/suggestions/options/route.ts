import { NextResponse } from "next/server";
import {
  getProtectedSuggestionOptions,
} from "@/lib/protected/suggestions";
import type { ProtectedSuggestionOptionKind } from "@/lib/protected/shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const query = url.searchParams.get("q");

  if (kind !== "canonical") {
    return NextResponse.json(
      { ok: false, error: "Invalid suggestion option kind." },
      { status: 400 },
    );
  }

  try {
    const options = await getProtectedSuggestionOptions({
      kind: kind as ProtectedSuggestionOptionKind,
      query,
    });

    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load suggestion options.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
