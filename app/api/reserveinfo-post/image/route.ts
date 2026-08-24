import { NextResponse } from "next/server";
import { renderReserveinfoImage } from "@/lib/reserveinfo-post/deterministic";
import { buildCompletedReserveinfoWindow } from "@/lib/reserveinfo-post/planning";
import { getReserveinfoPostScheduleState, getReserveinfoQueue } from "@/lib/reserveinfo-post/store";
import { DEFAULT_RESERVEINFO_POST_SCHEDULE } from "@/lib/reserveinfo-post/types";
import { isReserveinfoPostTemplateVariant } from "@/lib/reserveinfo-post/template-variant";
import { buildReserveinfoPreview } from "@/lib/reserveinfo-post/workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageIndex = Number(url.searchParams.get("page"));
    if (!Number.isInteger(pageIndex) || pageIndex < 0) return NextResponse.json({ ok: false, error: "A non-negative page query parameter is required." }, { status: 400 });
    const schedule = await getReserveinfoPostScheduleState().catch(() => ({ ...DEFAULT_RESERVEINFO_POST_SCHEDULE }));
    const queue = await getReserveinfoQueue(buildCompletedReserveinfoWindow(new Date(), schedule.weeklyTimezone)).catch(() => []);
    const post = queue.find((entry) => entry.pageIndex === pageIndex) ?? (await buildReserveinfoPreview(new Date(), schedule)).plannedPosts.find((entry) => entry.pageIndex === pageIndex);
    if (!post) return NextResponse.json({ ok: false, error: "No persisted reserveinfo page was found." }, { status: 404 });
    const requestedVariant = url.searchParams.get("variant");
    if (requestedVariant && !isReserveinfoPostTemplateVariant(requestedVariant)) return NextResponse.json({ ok: false, error: "Unknown reserveinfo template variant." }, { status: 400 });
    return new NextResponse(new Uint8Array(await renderReserveinfoImage(post, isReserveinfoPostTemplateVariant(requestedVariant) ? requestedVariant : undefined)), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename=reserveinfo-post-${String(pageIndex + 1).padStart(2, "0")}.png` } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
