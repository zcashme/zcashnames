import { NextResponse } from "next/server";
import { runReserveinfoPostScheduleHeartbeat } from "@/lib/reserveinfo-post/scheduler";
import { isReserveinfoPostDestination } from "@/lib/reserveinfo-post/types";
import { runReserveinfoPost } from "@/lib/reserveinfo-post/workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return !secret || request.headers.get("authorization")?.trim() === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  let body: { destination?: unknown } | null = null;
  if ((request.headers.get("content-type") ?? "").includes("application/json")) body = await request.json().catch(() => null);
  const candidate = url.searchParams.get("destination")?.trim() ?? (typeof body?.destination === "string" ? body.destination : null);
  const destination = isReserveinfoPostDestination(candidate) ? candidate : undefined;
  const result = url.searchParams.get("dryRun") === "1"
    ? await runReserveinfoPost({ mode: "dry-run", destination })
    : destination ? await runReserveinfoPost({ mode: "run", destination }) : await runReserveinfoPostScheduleHeartbeat();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export const GET = handle;
export const POST = handle;
