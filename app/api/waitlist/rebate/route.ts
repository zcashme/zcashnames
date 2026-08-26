import { NextResponse } from "next/server";
import {
  getWaitlistReservePaymentAddress,
  parseWaitlistVerifyToken,
} from "@/lib/campaigns/waitlist-confirm-response";
import { findWaitlistRowsByNormalizedEmail } from "@/lib/campaigns/waitlist-verify";
import {
  disableNoirReservationRebate,
  recordNoirReservationRebateTxid,
  upsertNoirReservationRebate,
} from "@/lib/waitlist/rebates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let payload: {
    token?: unknown;
    rowId?: unknown;
    unifiedAddress?: unknown;
    txid?: unknown;
    enabled?: unknown;
  } | null = null;

  try {
    payload = (await request.json()) as {
      token?: unknown;
      rowId?: unknown;
      unifiedAddress?: unknown;
      txid?: unknown;
      enabled?: unknown;
    };
  } catch {
    payload = null;
  }

  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const rowId = typeof payload?.rowId === "string" ? payload.rowId.trim() : "";
  const unifiedAddress =
    typeof payload?.unifiedAddress === "string" ? payload.unifiedAddress.trim() : "";
  const txid = typeof payload?.txid === "string" ? payload.txid.trim() : "";
  const enabled = typeof payload?.enabled === "boolean" ? payload.enabled : null;

  if (!token || !rowId) {
    return NextResponse.json(
      { ok: false, error: "Missing token or row id.", requestId },
      { status: 400 },
    );
  }

  if (!unifiedAddress && !txid && enabled !== false) {
    return NextResponse.json(
      { ok: false, error: "Missing unified address or transaction id.", requestId },
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

    if (enabled === false) {
      const rebate = await disableNoirReservationRebate({
        waitlistRowId: rowId,
        normalizedEmail: parsed.normalizedEmail,
      });
      return NextResponse.json({
        ok: true,
        requestId,
        rebate: rebate
          ? {
              rowId: rebate.waitlistRowId,
              unifiedAddress: rebate.unifiedAddress,
              enabled: false,
            }
          : { rowId, enabled: false },
      });
    }

    if (txid) {
      const rebate = await recordNoirReservationRebateTxid({
        waitlistRowId: rowId,
        normalizedEmail: parsed.normalizedEmail,
        txid,
      });
      return NextResponse.json({
        ok: true,
        requestId,
        recorded: Boolean(rebate),
      });
    }

    const paymentAddress = getWaitlistReservePaymentAddress();
    if (!paymentAddress) {
      return NextResponse.json(
        { ok: false, error: "Reservation payment configuration is incomplete.", requestId },
        { status: 500 },
      );
    }

    const rebate = await upsertNoirReservationRebate({
      waitlistRowId: rowId,
      normalizedEmail: parsed.normalizedEmail,
      unifiedAddress,
      reservePaymentAddress: paymentAddress,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      rebate: {
        rowId: rebate.waitlistRowId,
        unifiedAddress: rebate.unifiedAddress,
        enabled: true,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not save rebate details.";
    console.error("[waitlist-rebate] failed", {
      requestId,
      rowId,
      normalizedEmail: parsed.normalizedEmail,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
}
