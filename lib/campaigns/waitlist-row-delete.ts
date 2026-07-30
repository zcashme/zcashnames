import "server-only";

import { db } from "@/lib/db";

export type WaitlistRowDeleteRequestRowStatus = "pending" | "protected" | "reserved";
export type WaitlistRowDeleteRequestStatus = "pending" | "confirmed" | "expired" | "cancelled";

type WaitlistRowDeleteRequestDbRow = {
  id: string;
  waitlist_row_id: string;
  normalized_email: string;
  requested_name: string;
  row_status: WaitlistRowDeleteRequestRowStatus;
  row_snapshot: Record<string, unknown> | null;
  redirect_url: string;
  status: WaitlistRowDeleteRequestStatus;
  requested_at: string;
  expires_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
};

export type WaitlistRowDeleteRequest = {
  id: string;
  waitlistRowId: string;
  normalizedEmail: string;
  requestedName: string;
  rowStatus: WaitlistRowDeleteRequestRowStatus;
  rowSnapshot: Record<string, unknown> | null;
  redirectUrl: string;
  status: WaitlistRowDeleteRequestStatus;
  requestedAt: string;
  expiresAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string;
};

function mapDeleteRequest(row: WaitlistRowDeleteRequestDbRow): WaitlistRowDeleteRequest {
  return {
    id: row.id,
    waitlistRowId: row.waitlist_row_id,
    normalizedEmail: row.normalized_email,
    requestedName: row.requested_name,
    rowStatus: row.row_status,
    rowSnapshot: row.row_snapshot ?? null,
    redirectUrl: row.redirect_url,
    status: row.status,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at,
    updatedAt: row.updated_at,
  };
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

export async function getActiveWaitlistRowDeleteRequests(args: {
  rowIds: string[];
}): Promise<Map<string, WaitlistRowDeleteRequest>> {
  const requestsByRowId = new Map<string, WaitlistRowDeleteRequest>();
  if (args.rowIds.length === 0) {
    return requestsByRowId;
  }

  const { data, error } = await db
    .from("waitlist_row_delete_requests")
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, row_status, row_snapshot, redirect_url, status, requested_at, expires_at, confirmed_at, cancelled_at, updated_at",
    )
    .eq("status", "pending")
    .in("waitlist_row_id", args.rowIds)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const expiredIds: string[] = [];

  for (const row of (data ?? []) as WaitlistRowDeleteRequestDbRow[]) {
    if (isExpired(row.expires_at)) {
      expiredIds.push(row.id);
      continue;
    }

    if (!requestsByRowId.has(row.waitlist_row_id)) {
      requestsByRowId.set(row.waitlist_row_id, mapDeleteRequest(row));
    }
  }

  if (expiredIds.length > 0) {
    const { error: expireError } = await db
      .from("waitlist_row_delete_requests")
      .update({
        status: "expired",
        updated_at: new Date().toISOString(),
      })
      .in("id", expiredIds)
      .eq("status", "pending");

    if (expireError) {
      throw new Error(expireError.message);
    }
  }

  return requestsByRowId;
}

export async function getWaitlistRowDeleteRequestById(
  requestId: string,
): Promise<WaitlistRowDeleteRequest | null> {
  const { data, error } = await db
    .from("waitlist_row_delete_requests")
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, row_status, row_snapshot, redirect_url, status, requested_at, expires_at, confirmed_at, cancelled_at, updated_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapDeleteRequest(data as WaitlistRowDeleteRequestDbRow) : null;
}

export async function createWaitlistRowDeleteRequest(args: {
  waitlistRowId: string;
  normalizedEmail: string;
  requestedName: string;
  rowStatus: WaitlistRowDeleteRequestRowStatus;
  rowSnapshot: Record<string, unknown>;
  redirectUrl: string;
  expiresAt: string;
}): Promise<WaitlistRowDeleteRequest> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("waitlist_row_delete_requests")
    .insert({
      waitlist_row_id: args.waitlistRowId,
      normalized_email: args.normalizedEmail,
      requested_name: args.requestedName,
      row_status: args.rowStatus,
      row_snapshot: args.rowSnapshot,
      redirect_url: args.redirectUrl,
      expires_at: args.expiresAt,
      status: "pending",
      requested_at: now,
      updated_at: now,
    })
    .select(
      "id, waitlist_row_id, normalized_email, requested_name, row_status, row_snapshot, redirect_url, status, requested_at, expires_at, confirmed_at, cancelled_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapDeleteRequest(data as WaitlistRowDeleteRequestDbRow);
}

export async function markWaitlistRowDeleteRequestStatus(args: {
  requestId: string;
  status: Extract<WaitlistRowDeleteRequestStatus, "confirmed" | "expired" | "cancelled">;
}): Promise<void> {
  const patch: Record<string, string> = {
    status: args.status,
    updated_at: new Date().toISOString(),
  };

  if (args.status === "confirmed") {
    patch.confirmed_at = new Date().toISOString();
  }

  if (args.status === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
  }

  const { error } = await db
    .from("waitlist_row_delete_requests")
    .update(patch)
    .eq("id", args.requestId);

  if (error) {
    throw new Error(error.message);
  }
}
