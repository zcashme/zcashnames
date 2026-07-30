import { NextResponse } from "next/server";
import { parseWaitlistDeleteConfirmToken } from "@/lib/campaigns/waitlist-delete-confirm";
import {
  getWaitlistRowDeleteRequestById,
  markWaitlistRowDeleteRequestStatus,
} from "@/lib/campaigns/waitlist-row-delete";
import { deleteWaitlistVerifyRowPreference } from "@/lib/campaigns/waitlist-verify-preferences";
import { db } from "@/lib/db";
import { rebuildPublicWaitlistViewSnapshot } from "@/lib/waitlist/view";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fallbackRedirect(request: Request): URL {
  return new URL("/verify", request.url);
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token")?.trim() ?? "";

  if (!token) {
    return NextResponse.redirect(fallbackRedirect(request), { status: 302 });
  }

  const parsed = parseWaitlistDeleteConfirmToken(token);
  if (!parsed) {
    return NextResponse.redirect(fallbackRedirect(request), { status: 302 });
  }

  try {
    const deleteRequest = await getWaitlistRowDeleteRequestById(parsed.requestId);
    if (!deleteRequest || deleteRequest.normalizedEmail !== parsed.normalizedEmail) {
      return NextResponse.redirect(fallbackRedirect(request), { status: 302 });
    }

    const redirectUrl = new URL(deleteRequest.redirectUrl || "/verify", request.url);
    const successRedirectUrl = new URL(redirectUrl.toString());
    successRedirectUrl.searchParams.set("delete", "success");
    successRedirectUrl.searchParams.set("removed", deleteRequest.requestedName);

    if (deleteRequest.status === "confirmed") {
      return NextResponse.redirect(successRedirectUrl, { status: 302 });
    }

    if (deleteRequest.status === "expired" || deleteRequest.status === "cancelled") {
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    if (new Date(deleteRequest.expiresAt).getTime() <= Date.now()) {
      await markWaitlistRowDeleteRequestStatus({
        requestId: deleteRequest.id,
        status: "expired",
      });
      return NextResponse.redirect(redirectUrl, { status: 302 });
    }

    const { data: existingRow, error: rowLookupError } = await db
      .from("zn_waitlist")
      .select("id")
      .eq("id", deleteRequest.waitlistRowId)
      .maybeSingle();

    if (rowLookupError) {
      throw new Error(rowLookupError.message);
    }

    if (existingRow) {
      const { error: deleteError } = await db
        .from("zn_waitlist")
        .delete()
        .eq("id", deleteRequest.waitlistRowId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    await deleteWaitlistVerifyRowPreference({
      normalizedEmail: deleteRequest.normalizedEmail,
      rowId: deleteRequest.waitlistRowId,
    });

    const { error: protectedCleanupError } = await db
      .from("waitlist_protected_name_access_requests")
      .delete()
      .eq("waitlist_row_id", deleteRequest.waitlistRowId);

    if (protectedCleanupError) {
      throw new Error(protectedCleanupError.message);
    }

    await markWaitlistRowDeleteRequestStatus({
      requestId: deleteRequest.id,
      status: "confirmed",
    });

    await rebuildPublicWaitlistViewSnapshot();

    return NextResponse.redirect(successRedirectUrl, { status: 302 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not confirm row deletion.";
    console.error("[waitlist-delete-confirm] failed", {
      requestId,
      deleteRequestId: parsed.requestId,
      normalizedEmail: parsed.normalizedEmail,
      error: message,
    });
    return NextResponse.redirect(fallbackRedirect(request), { status: 302 });
  }
}
