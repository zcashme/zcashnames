import { NextResponse } from "next/server";
import {
  drainEligibleCampaignBatches,
  drainNextEligibleCampaignBatch,
} from "@/lib/campaigns/repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    if (campaignId) {
      const result = await drainEligibleCampaignBatches(campaignId);
      return NextResponse.json({
        ok: true,
        campaignId,
        processed: result.processedCount > 0,
        processedCount: result.processedCount,
        status: result.lastStatus,
      });
    }

    const result = await drainNextEligibleCampaignBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
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
