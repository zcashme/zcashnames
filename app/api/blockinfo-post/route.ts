import { NextResponse } from "next/server";
import { runBlockinfoPostScheduleHeartbeat } from "@/lib/blockinfo-post/scheduler";
import { isBlockinfoPostDestination, isBlockinfoPostRenderMode } from "@/lib/blockinfo-post/types";
import { runBlockinfoPost } from "@/lib/blockinfo-post/workflow";

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
  if (isBlockinfoPostDestination(fromQuery)) return fromQuery;
  return typeof body?.destination === "string" && isBlockinfoPostDestination(body.destination) ? body.destination : null;
}

function readRenderMode(request: Request, body: { renderMode?: unknown } | null): "openai" | "deterministic" | null {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("renderMode")?.trim();
  if (isBlockinfoPostRenderMode(fromQuery)) return fromQuery;
  return typeof body?.renderMode === "string" && isBlockinfoPostRenderMode(body.renderMode) ? body.renderMode : null;
}

export async function POST(request: Request) {
  return handleBlockinfoPostRequest(request);
}

export async function GET(request: Request) {
  return handleBlockinfoPostRequest(request);
}

async function handleBlockinfoPostRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun")?.trim() === "1";
  const body = await readJsonBody(request);
  const destination = readDestination(request, body);
  const renderMode = readRenderMode(request, body);

  const result = dryRun
    ? await runBlockinfoPost({ mode: "dry-run", destination: destination ?? "telegram", renderMode: renderMode ?? "openai" })
    : destination
      ? await runBlockinfoPost({ mode: "run", destination, renderMode: renderMode ?? "openai" })
      : await runBlockinfoPostScheduleHeartbeat();

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
