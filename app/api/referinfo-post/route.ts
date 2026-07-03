import { NextResponse } from "next/server";
import { runReferinfoPostScheduleHeartbeat } from "@/lib/referinfo-post/scheduler";
import { isReferinfoPostDestination, isReferinfoPostRenderMode } from "@/lib/referinfo-post/types";
import { runReferinfoPost } from "@/lib/referinfo-post/workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

async function readJsonBody(request: Request): Promise<{ destination?: unknown; renderMode?: unknown } | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    return (await request.json()) as { destination?: unknown; renderMode?: unknown };
  } catch {
    return null;
  }
}

function readDestination(request: Request, body: { destination?: unknown } | null): "telegram" | "x" | "both" | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("destination")?.trim();
  if (isReferinfoPostDestination(fromQuery)) return fromQuery;
  return typeof body?.destination === "string" && isReferinfoPostDestination(body.destination) ? body.destination : null;
}

function readRenderMode(request: Request, body: { renderMode?: unknown } | null): "deterministic" | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("renderMode")?.trim();
  if (isReferinfoPostRenderMode(fromQuery)) return fromQuery;
  return typeof body?.renderMode === "string" && isReferinfoPostRenderMode(body.renderMode) ? body.renderMode : null;
}

export async function POST(request: Request) {
  return handleReferinfoPostRequest(request);
}

export async function GET(request: Request) {
  return handleReferinfoPostRequest(request);
}

async function handleReferinfoPostRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun")?.trim() === "1";
  const body = await readJsonBody(request);
  const destination = readDestination(request, body);
  const renderMode = readRenderMode(request, body);

  const result = dryRun
    ? await runReferinfoPost({ mode: "dry-run", destination: destination ?? "both", renderMode: renderMode ?? "deterministic" })
    : destination
      ? await runReferinfoPost({ mode: "run", destination, renderMode: renderMode ?? "deterministic" })
      : await runReferinfoPostScheduleHeartbeat();

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
