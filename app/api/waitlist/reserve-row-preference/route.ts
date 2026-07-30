import { NextResponse } from "next/server";
import { parseWaitlistVerifyToken } from "@/lib/campaigns/waitlist-confirm-response";
import { findWaitlistRowsByNormalizedEmail } from "@/lib/campaigns/waitlist-verify";
import { upsertWaitlistVerifyRowPreference } from "@/lib/campaigns/waitlist-verify-preferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let payload:
    | {
        token?: unknown;
        rowId?: unknown;
        collapsed?: unknown;
      }
    | null = null;

  try {
    payload = (await request.json()) as {
      token?: unknown;
      rowId?: unknown;
      collapsed?: unknown;
    };
  } catch {
    payload = null;
  }

  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const rowId = typeof payload?.rowId === "string" ? payload.rowId.trim() : "";
  const collapsed = typeof payload?.collapsed === "boolean" ? payload.collapsed : null;

  if (!token || !rowId || collapsed === null) {
    return NextResponse.json(
      { ok: false, error: "Missing token, row id, or collapsed value.", requestId },
      { status: 400 },
    );
  }

  const parsed = parseWaitlistVerifyToken(token);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: "Invalid reservation token.", requestId },
      { status: 400 },
    );
  }

  try {
    const rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
    const row = rows.find((candidate) => candidate.id === rowId);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Waitlist row not found for this reservation link.", requestId },
        { status: 404 },
      );
    }

    await upsertWaitlistVerifyRowPreference({
      normalizedEmail: parsed.normalizedEmail,
      rowId,
      collapsed,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      preference: {
        rowId,
        collapsed,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save row preference.";
    console.error("[waitlist-reserve-row-preference] failed", {
      requestId,
      rowId,
      normalizedEmail: parsed.normalizedEmail,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
}
