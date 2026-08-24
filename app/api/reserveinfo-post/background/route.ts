import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getReserveinfoBackgroundPath } from "@/lib/reserveinfo-post/deterministic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return new NextResponse(await readFile(getReserveinfoBackgroundPath()), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
