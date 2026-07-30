import { NextResponse } from "next/server";
import { parseWaitlistVerifyToken } from "@/lib/campaigns/waitlist-confirm-response";
import {
  buildWaitlistDeleteConfirmToken,
  buildWaitlistDeleteConfirmUrl,
} from "@/lib/campaigns/waitlist-delete-confirm";
import {
  createWaitlistRowDeleteRequest,
  getActiveWaitlistRowDeleteRequests,
  type WaitlistRowDeleteRequestRowStatus,
} from "@/lib/campaigns/waitlist-row-delete";
import {
  findWaitlistRowsByNormalizedEmail,
  normalizeWaitlistName,
} from "@/lib/campaigns/waitlist-verify";
import { getProtectedNameInfoByName } from "@/lib/campaigns/waitlist-protected-access";
import { sendWaitlistDeleteConfirmEmail } from "@/lib/email/waitlist";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DELETE_REQUEST_TTL_MS = 1000 * 60 * 60 * 24 * 3;

function resolveRowStatus(args: {
  reserved: boolean;
  protectedName: boolean;
}): WaitlistRowDeleteRequestRowStatus {
  if (args.reserved) return "reserved";
  if (args.protectedName) return "protected";
  return "pending";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  let payload:
    | {
        token?: unknown;
        rowId?: unknown;
      }
    | null = null;

  try {
    payload = (await request.json()) as {
      token?: unknown;
      rowId?: unknown;
    };
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
      { ok: false, error: "Invalid verify token.", requestId },
      { status: 400 },
    );
  }

  try {
    const rows = await findWaitlistRowsByNormalizedEmail(parsed.normalizedEmail);
    const row = rows.find((candidate) => candidate.id === rowId);
    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Waitlist row not found for this verify link.", requestId },
        { status: 404 },
      );
    }

    const activeDeleteRequests = await getActiveWaitlistRowDeleteRequests({ rowIds: [rowId] });
    const existingRequest = activeDeleteRequests.get(rowId);
    if (existingRequest) {
      return NextResponse.json({
        ok: true,
        requestId,
        deleteRequest: existingRequest,
        confirmationEmailSent: false,
      });
    }

    const protectedNameKey = normalizeWaitlistName(row.name);
    const protectedMap = await getProtectedNameInfoByName(protectedNameKey ? [protectedNameKey] : []);
    const protectedName = protectedNameKey ? protectedMap.get(protectedNameKey)?.isProtected === true : false;
    const rowStatus = resolveRowStatus({
      reserved: row.name_reserved === true,
      protectedName,
    });

    const expiresAt = new Date(Date.now() + DELETE_REQUEST_TTL_MS).toISOString();
    const verifyUrl = `${new URL(request.url).origin}/verify?token=${encodeURIComponent(token)}`;
    const deleteRequest = await createWaitlistRowDeleteRequest({
      waitlistRowId: rowId,
      normalizedEmail: parsed.normalizedEmail,
      requestedName: row.name?.trim() || "Unnamed name",
      rowStatus,
      rowSnapshot: {
        id: row.id,
        email: row.email,
        name: row.name,
        created_at: row.created_at,
        email_verified: row.email_verified,
        email_verified_at: row.email_verified_at,
        name_reserved: row.name_reserved,
        name_reserved_at: row.name_reserved_at,
        name_reserved_txid: row.name_reserved_txid,
        campaign_email_confirm_response: row.campaign_email_confirm_response,
      },
      redirectUrl: verifyUrl,
      expiresAt,
    });

    const confirmToken = buildWaitlistDeleteConfirmToken({
      requestId: deleteRequest.id,
      normalizedEmail: parsed.normalizedEmail,
    });
    const confirmUrl = buildWaitlistDeleteConfirmUrl({
      baseUrl: new URL(request.url).origin,
      token: confirmToken,
    });

    let confirmationEmailSent = false;

    try {
      await sendWaitlistDeleteConfirmEmail({
        email: row.email?.trim() || parsed.normalizedEmail,
        name: row.name?.trim() || "your name",
        confirmUrl,
        rowStatus,
      });
      confirmationEmailSent = true;
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : "Delete confirmation email failed.";
      console.error("[waitlist-delete-request] confirmation email failed", {
        requestId,
        rowId,
        deleteRequestId: deleteRequest.id,
        normalizedEmail: parsed.normalizedEmail,
        error: message,
      });
    }

    return NextResponse.json({
      ok: true,
      requestId,
      deleteRequest,
      confirmationEmailSent,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create delete request.";
    console.error("[waitlist-delete-request] failed", {
      requestId,
      rowId,
      normalizedEmail: parsed.normalizedEmail,
      error: message,
    });
    return NextResponse.json({ ok: false, error: message, requestId }, { status: 500 });
  }
}
