import { NextResponse } from "next/server";
import {
  drainEligibleCampaignBatches,
  drainNextEligibleCampaignBatch,
} from "@/lib/campaigns/repository";
import {
  markCampaignWorkerFinished,
  markCampaignWorkerStarted,
} from "@/lib/campaigns/worker-health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  return auth === `Bearer ${secret}`;
}

async function readCampaignId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("campaignId")?.trim();
  if (fromQuery) return fromQuery;
  if (request.method !== "POST") return null;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;

  try {
    const body = (await request.json()) as { campaignId?: unknown };
    return typeof body.campaignId === "string" && body.campaignId.trim()
      ? body.campaignId.trim()
      : null;
  } catch {
    return null;
  }
}

async function handleWorkerRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const campaignId = await readCampaignId(request);
    await markCampaignWorkerStarted(campaignId);
    if (campaignId) {
      const result = await drainEligibleCampaignBatches(campaignId);
      await markCampaignWorkerFinished({
        campaignId,
        processedCount: result.processedCount,
        successful: true,
      });
      return NextResponse.json({
        ok: true,
        campaignId,
        processed: result.processedCount > 0,
        processedCount: result.processedCount,
        status: result.lastStatus,
      });
    }

    const result = await drainNextEligibleCampaignBatch();
    await markCampaignWorkerFinished({
      campaignId: result.campaignId ?? null,
      processedCount: result.processed ? 1 : 0,
      successful: true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markCampaignWorkerFinished({
      campaignId: null,
      processedCount: 0,
      successful: false,
      error: message,
    }).catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleWorkerRequest(request);
}

export async function POST(request: Request) {
  return handleWorkerRequest(request);
}
