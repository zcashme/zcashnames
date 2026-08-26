import { NextResponse } from "next/server";
import {
  parseWaitlistVerifyToken,
} from "@/lib/campaigns/waitlist-confirm-response";
import {
  findWaitlistRowsByNormalizedEmail,
  getWaitlistVerifyNameStats,
} from "@/lib/campaigns/waitlist-verify";
import { applyWaitlistReservationFromReserves } from "@/lib/waitlist/reserves";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let payload: { token?: unknown; rowId?: unknown } | null = null;
  try {
    payload = (await request.json()) as { token?: unknown; rowId?: unknown };
  } catch {
    payload = null;
  }

  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const rowId = typeof payload?.rowId === "string" ? payload.rowId.trim() : "";

  if (!token || !rowId) {
    return NextResponse.json(
      { ok: false, error: "Missing token or row id.", requestId },
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
    const applied = await applyWaitlistReservationFromReserves(rowId);

    const rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
    const row = rows.find((candidate) => candidate.id === rowId);

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Waitlist row not found for this reservation link.", requestId },
        { status: 404 },
      );
    }

    const nameStats = await getWaitlistVerifyNameStats(rows);
    const stats = nameStats.get(row.id);
    const checkedAt = new Date().toISOString();
    const reserved = row.name_reserved === true || applied.reserved;

    return NextResponse.json({
      ok: true,
      requestId,
      checkedAt,
      card: {
        id: row.id,
        reserved,
        reservedAt: row.name_reserved_at ?? applied.reservedAt,
        reservedTxid: row.name_reserved_txid ?? applied.reservedTxid,
        totalForName: stats?.totalCount ?? 1,
        positionForName: stats?.reservedPosition ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reservation status check failed.";
    console.error("[waitlist-reservation-status] failed", {
      requestId,
      rowId,
      normalizedEmail: parsed.normalizedEmail,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
}
