import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getReferinfoDeterministicAssetConfig } from "@/lib/referinfo-post/deterministic";
import { isReferinfoPostTemplateVariant } from "@/lib/referinfo-post/template-variant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestedVariant = new URL(request.url).searchParams.get("variant");
    if (requestedVariant && !isReferinfoPostTemplateVariant(requestedVariant)) {
      return NextResponse.json({ ok: false, error: "Unknown referinfo template variant." }, { status: 400 });
    }
    const previewVariant = isReferinfoPostTemplateVariant(requestedVariant) ? requestedVariant : undefined;
    const { backgroundPath } = getReferinfoDeterministicAssetConfig(previewVariant);
    const buffer = await readFile(backgroundPath);
    const ext = path.extname(backgroundPath).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
