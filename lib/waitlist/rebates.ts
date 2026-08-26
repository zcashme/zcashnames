import "server-only";

import { getWaitlistReserveFeeZec } from "@/lib/campaigns/waitlist-confirm-response";
import { sendNoirReservationRebateEmail } from "@/lib/email/noir-rebate";
import { db } from "@/lib/db";
import { rebateUnifiedAddressError } from "@/lib/waitlist/rebate-address";

export type NoirReservationRebate = {
  waitlistRowId: string;
  unifiedAddress: string;
  consentedAt: string;
  enabled: boolean;
  noirTxid: string | null;
};

type RebateRow = {
  waitlist_row_id: string;
  normalized_email: string;
  unified_address: string;
  consented_at: string | null;
  noir_txid: string | null;
  rebate_email_sent_at: string | null;
};

type WaitlistReserveTxRow = {
  txid: string | null;
  amount_zats: string | number | null;
};

type ReservedWaitlistRow = {
  id: string;
  name: string | null;
  email: string | null;
  name_reserved: boolean | null;
};

function coerceAmountZats(value: string | number | null | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function parseZecToZats(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) return null;
  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  if (!Number.isFinite(whole)) return null;
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  return whole * 100_000_000 + Number(paddedFraction);
}

function normalizeTxid(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function mapRebate(row: RebateRow): NoirReservationRebate {
  return {
    waitlistRowId: row.waitlist_row_id,
    unifiedAddress: row.unified_address,
    consentedAt: row.consented_at ?? "",
    enabled: true,
    noirTxid: normalizeTxid(row.noir_txid),
  };
}

export async function getNoirReservationRebatesByRowId(args: {
  normalizedEmail: string;
  rowIds: string[];
}): Promise<Map<string, NoirReservationRebate>> {
  const rebates = new Map<string, NoirReservationRebate>();
  if (args.rowIds.length === 0) return rebates;

  const { data, error } = await db
    .from("noir_reservation_rebates")
    .select(
      "waitlist_row_id, normalized_email, unified_address, consented_at, noir_txid, rebate_email_sent_at",
    )
    .eq("normalized_email", args.normalizedEmail)
    .in("waitlist_row_id", args.rowIds);

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as RebateRow[]) {
    rebates.set(row.waitlist_row_id, mapRebate(row));
  }

  return rebates;
}

export async function upsertNoirReservationRebate(args: {
  waitlistRowId: string;
  normalizedEmail: string;
  unifiedAddress: string;
  reservePaymentAddress: string;
}): Promise<NoirReservationRebate> {
  const unifiedAddress = args.unifiedAddress.trim();
  const addressError = rebateUnifiedAddressError(
    unifiedAddress,
    args.reservePaymentAddress,
  );
  if (addressError) {
    throw new Error(addressError);
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("noir_reservation_rebates")
    .upsert(
      {
        waitlist_row_id: args.waitlistRowId,
        normalized_email: args.normalizedEmail,
        unified_address: unifiedAddress,
        consented_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: "waitlist_row_id" },
    )
    .select(
      "waitlist_row_id, normalized_email, unified_address, consented_at, noir_txid, rebate_email_sent_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return mapRebate(data as RebateRow);
}

export async function disableNoirReservationRebate(args: {
  waitlistRowId: string;
  normalizedEmail: string;
}): Promise<NoirReservationRebate | null> {
  const { error } = await db
    .from("noir_reservation_rebates")
    .delete()
    .eq("waitlist_row_id", args.waitlistRowId)
    .eq("normalized_email", args.normalizedEmail);

  if (error) throw new Error(error.message);
  return null;
}

export async function recordNoirReservationRebateTxid(args: {
  waitlistRowId: string;
  normalizedEmail: string;
  txid: string;
}): Promise<NoirReservationRebate | null> {
  const txid = normalizeTxid(args.txid);
  if (!txid) throw new Error("Missing transaction id.");

  const nowIso = new Date().toISOString();
  const { data, error } = await db
    .from("noir_reservation_rebates")
    .update({
      noir_txid: txid,
      updated_at: nowIso,
    })
    .eq("waitlist_row_id", args.waitlistRowId)
    .eq("normalized_email", args.normalizedEmail)
    .select(
      "waitlist_row_id, normalized_email, unified_address, consented_at, noir_txid, rebate_email_sent_at",
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRebate(data as RebateRow) : null;
}

async function getMinimumReserveZats(): Promise<number> {
  const minimumAmount = getWaitlistReserveFeeZec();
  const minimumZats = minimumAmount ? parseZecToZats(minimumAmount) : null;
  if (!minimumAmount || minimumZats == null) {
    throw new Error("WAITLIST_RESERVE_FEE_ZEC is missing or invalid.");
  }
  return minimumZats;
}

async function fetchQualifyingReserveTxByTxid(
  txids: string[],
): Promise<Map<string, WaitlistReserveTxRow>> {
  const matches = new Map<string, WaitlistReserveTxRow>();
  if (txids.length === 0) return matches;

  const { data, error } = await db
    .from("zn_waitlist_reserves_transactions")
    .select("txid, amount_zats")
    .eq("is_outgoing", false)
    .in("status", ["mempool", "confirmed"])
    .or(txids.map((txid) => `txid.ilike.${txid}`).join(","));

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as WaitlistReserveTxRow[]) {
    const txid = normalizeTxid(row.txid);
    if (!txid || matches.has(txid)) continue;
    matches.set(txid, row);
  }

  return matches;
}

async function markRebateEmailSent(waitlistRowId: string, sentAt: string): Promise<void> {
  const { error } = await db
    .from("noir_reservation_rebates")
    .update({
      rebate_email_sent_at: sentAt,
      updated_at: sentAt,
    })
    .eq("waitlist_row_id", waitlistRowId)
    .is("rebate_email_sent_at", null);

  if (error) throw new Error(error.message);
}

export async function sendDueNoirReservationRebateEmails(
  reservedIds: string[],
): Promise<void> {
  if (reservedIds.length === 0) return;

  const minimumZats = await getMinimumReserveZats();
  const { data: rebateData, error: rebateError } = await db
    .from("noir_reservation_rebates")
    .select(
      "waitlist_row_id, normalized_email, unified_address, consented_at, noir_txid, rebate_email_sent_at",
    )
    .in("waitlist_row_id", reservedIds)
    .not("noir_txid", "is", null)
    .is("rebate_email_sent_at", null);

  if (rebateError) throw new Error(rebateError.message);

  const rebateRows = (rebateData ?? []) as RebateRow[];
  if (rebateRows.length === 0) return;

  const txids = rebateRows
    .map((row) => normalizeTxid(row.noir_txid))
    .filter((txid): txid is string => Boolean(txid));
  const qualifyingTxById = await fetchQualifyingReserveTxByTxid(txids);

  const { data: waitlistData, error: waitlistError } = await db
    .from("zn_waitlist")
    .select("id, name, email, name_reserved")
    .in("id", rebateRows.map((row) => row.waitlist_row_id))
    .eq("name_reserved", true);

  if (waitlistError) throw new Error(waitlistError.message);

  const waitlistById = new Map(
    ((waitlistData ?? []) as ReservedWaitlistRow[]).map((row) => [row.id, row]),
  );

  for (const rebate of rebateRows) {
    const txid = normalizeTxid(rebate.noir_txid);
    if (!txid) continue;

    const incoming = qualifyingTxById.get(txid);
    const amountZats = coerceAmountZats(incoming?.amount_zats);
    if (!incoming || amountZats == null || amountZats < minimumZats) continue;

    const waitlistRow = waitlistById.get(rebate.waitlist_row_id);
    if (!waitlistRow) continue;

    const reservedName = waitlistRow.name?.trim();
    const unifiedAddress = rebate.unified_address.trim();
    if (!reservedName || !unifiedAddress) continue;

    try {
      await sendNoirReservationRebateEmail({
        unifiedAddress,
        reservedName,
        txid,
        waitlistRowId: rebate.waitlist_row_id,
        ccEmail: waitlistRow.email,
      });
      await markRebateEmailSent(rebate.waitlist_row_id, new Date().toISOString());
    } catch (error) {
      console.error("[noir-reservation-rebates] email failed", {
        rowId: rebate.waitlist_row_id,
        txid,
        error: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }
}
