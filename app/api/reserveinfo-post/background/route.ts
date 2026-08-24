import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getReserveinfoBackgroundPath } from "@/lib/reserveinfo-post/deterministic";
import { isReserveinfoPostTemplateVariant } from "@/lib/reserveinfo-post/template-variant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestedVariant = new URL(request.url).searchParams.get("variant");
    if (requestedVariant && !isReserveinfoPostTemplateVariant(requestedVariant)) {
      return NextResponse.json({ ok: false, error: "Unknown reserveinfo template variant." }, { status: 400 });
    }
    return new NextResponse(await readFile(getReserveinfoBackgroundPath(isReserveinfoPostTemplateVariant(requestedVariant) ? requestedVariant : undefined)), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
