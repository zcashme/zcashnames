import "server-only";

import { db } from "@/lib/db";
import {
  buildWaitlistConfirmResponseTrackingUrl,
  getWaitlistReserveFeeZec,
  getWaitlistReservePaymentAddress,
} from "@/lib/campaigns/waitlist-confirm-response";
import { getProtectedNameInfoByName } from "@/lib/campaigns/waitlist-protected-access";
import {
  findWaitlistRowsByNormalizedEmail,
  normalizeWaitlistEmail,
} from "@/lib/campaigns/waitlist-verify";
import {
  buildWaitlistReferralDashboardUrl,
  sendWaitlistReservationConfirmedEmail,
} from "@/lib/email/waitlist";
import { ensureHumanReferralCode } from "@/lib/referrals";
import { resolveSiteUrl } from "@/lib/site-url";
import { fetchAllSupabaseRows } from "@/lib/supabase/fetch-all";
import { sendDueNoirReservationRebateEmails } from "@/lib/waitlist/rebates";
import { getWaitlistReservationResendCampaignId } from "@/lib/waitlist/reservation-resend";

const WAITLIST_RESERVES_PAGE_SIZE = 1000;

type WaitlistReserveTransactionRow = {
  amount_zats: string | number | null;
  detected_at: string | null;
  memo: string | null;
  txid: string | null;
  is_outgoing: boolean | null;
  status: string | null;
  recipient_address: string | null;
};

type ReservedWaitlistEmailRow = {
  id: string;
  name: string | null;
  email: string | null;
  referral_code: string | null;
  human_referral_code: string | null;
  reservation_confirmed_email_sent_at: string | null;
};

type ParsedReserveMemo = {
  name: string | null;
  uuid: string | null;
  uaddr: string | null;
  fields: Record<string, string>;
};

function parseZecToZats(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(trimmed)) return null;
  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = Number(wholePart);
  if (!Number.isFinite(whole)) return null;
  const paddedFraction = `${fractionPart}00000000`.slice(0, 8);
  return whole * 100_000_000 + Number(paddedFraction);
}

/** Coerce bigint/number/string zatoshi amounts from Supabase. */
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

function normalizeReserveMemoInput(fullMemo: string): string {
  return fullMemo.startsWith("ZNS:RESERVE|")
    ? fullMemo.slice("ZNS:RESERVE|".length)
    : fullMemo;
}

export function parseWaitlistReserveMemo(fullMemo: string | null | undefined): ParsedReserveMemo | null {
  const trimmed = fullMemo?.trim();
  if (!trimmed) return null;

  const normalized = normalizeReserveMemoInput(trimmed);
  const fields: Record<string, string> = {};

  for (const part of normalized.split("|")) {
    const separatorIndex = part.indexOf("::");
    if (separatorIndex <= 0) continue;

    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 2).trim();
    if (!key || !value) continue;
    fields[key.toLowerCase()] = value;
  }

  return {
    name: fields["name"] ?? null,
    uuid: fields["uuid"] ?? null,
    uaddr: fields["uaddr"] ?? null,
    fields,
  };
}

/**
 * Incoming reserve payments detected by the viewer wallet.
 * Source of truth for "I Sent It!" / Refresh Status matching is the memo column
 * (ZNS:RESERVE|uuid::...|name::... format).
 */
async function fetchAllWaitlistReserveTransactions(): Promise<WaitlistReserveTransactionRow[]> {
  const paymentAddress = getWaitlistReservePaymentAddress()?.trim() || null;

  return fetchAllSupabaseRows<WaitlistReserveTransactionRow>({
    pageSize: WAITLIST_RESERVES_PAGE_SIZE,
    fetchPage: async (from, to) => {
      let query = db
        .from("zn_waitlist_reserves_transactions")
        .select(
          "amount_zats, detected_at, memo, txid, is_outgoing, status, recipient_address",
        )
        .eq("is_outgoing", false)
        .in("status", ["mempool", "confirmed"])
        .order("detected_at", { ascending: true })
        .range(from, to);

      if (paymentAddress) {
        query = query.eq("recipient_address", paymentAddress);
      }

      return await query;
    },
  });
}

async function fetchReservedWaitlistRowsPendingConfirmation(
  rowIds: string[],
): Promise<ReservedWaitlistEmailRow[]> {
  if (rowIds.length === 0) return [];

  return fetchAllSupabaseRows<ReservedWaitlistEmailRow>({
    pageSize: WAITLIST_RESERVES_PAGE_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist")
        .select(
          "id, name, email, referral_code, human_referral_code, reservation_confirmed_email_sent_at",
        )
        .in("id", rowIds)
        .eq("name_reserved", true)
        .is("reservation_confirmed_email_sent_at", null)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  });
}

async function markReservationConfirmationSent(rowId: string, sentAt: string): Promise<void> {
  const { error } = await db
    .from("zn_waitlist")
    .update({ reservation_confirmed_email_sent_at: sentAt })
    .eq("id", rowId)
    .is("reservation_confirmed_email_sent_at", null);

  if (error) throw new Error(error.message);
}

function summarizeOtherNames(
  rowId: string,
  rows: Awaited<ReturnType<typeof findWaitlistRowsByNormalizedEmail>>,
  protectedNamesByName: Awaited<ReturnType<typeof getProtectedNameInfoByName>>,
) {
  return rows
    .filter((candidate) => candidate.id !== rowId)
    .map((candidate) => {
      const trimmedName = candidate.name?.trim() ?? "";
      const protectedName = trimmedName
        ? protectedNamesByName.get(trimmedName.toLowerCase())
        : null;

      if (!trimmedName || candidate.name_reserved === true) {
        return null;
      }

      return {
        name: trimmedName,
        status: protectedName?.isProtected ? "protected" : "pending",
      } as const;
    })
    .filter(
      (
        candidate,
      ): candidate is {
        name: string;
        status: "pending" | "protected";
      } => Boolean(candidate),
    );
}

export async function syncWaitlistReservationFieldsFromReserves(): Promise<{
  matchedCount: number;
}> {
  const minimumAmount = getWaitlistReserveFeeZec();
  const minimumZats = minimumAmount ? parseZecToZats(minimumAmount) : null;
  if (!minimumAmount || minimumZats == null) {
    throw new Error("WAITLIST_RESERVE_FEE_ZEC is missing or invalid.");
  }

  const reserveRows = await fetchAllWaitlistReserveTransactions();
  const firstValidReservationByUuid = new Map<
    string,
    { createdAt: string; txid: string | null }
  >();

  for (const row of reserveRows) {
    const parsed = parseWaitlistReserveMemo(row.memo);
    if (!parsed?.uuid || !row.detected_at) continue;

    const amountZats = coerceAmountZats(row.amount_zats);
    if (amountZats == null || amountZats < minimumZats) continue;
    if (firstValidReservationByUuid.has(parsed.uuid)) continue;

    firstValidReservationByUuid.set(parsed.uuid, {
      createdAt: row.detected_at,
      txid: row.txid?.trim() || null,
    });
  }

  const reservationEntries = [...firstValidReservationByUuid.entries()];

  if (reservationEntries.length === 0) {
    return { matchedCount: 0 };
  }

  let matchedCount = 0;
  for (const [uuid, reservation] of reservationEntries) {
    const { error } = await db
      .from("zn_waitlist")
      .update({
        name_reserved: true,
        name_reserved_at: reservation.createdAt,
        name_reserved_txid: reservation.txid,
      })
      .eq("id", uuid);
    if (error) throw new Error(error.message);
    matchedCount += 1;
  }

  const reservedIds = reservationEntries.map(([uuid]) => uuid);
  await sendPendingReservationFollowupEmails(reservedIds);

  return { matchedCount };
}

async function findQualifyingReserveForUuid(rowId: string): Promise<{
  createdAt: string;
  txid: string | null;
} | null> {
  const minimumAmount = getWaitlistReserveFeeZec();
  const minimumZats = minimumAmount ? parseZecToZats(minimumAmount) : null;
  if (!minimumAmount || minimumZats == null) {
    throw new Error("WAITLIST_RESERVE_FEE_ZEC is missing or invalid.");
  }

  const paymentAddress = getWaitlistReservePaymentAddress()?.trim() || null;
  let query = db
    .from("zn_waitlist_reserves_transactions")
    .select("amount_zats, detected_at, memo, txid, is_outgoing, status, recipient_address")
    .eq("is_outgoing", false)
    .in("status", ["mempool", "confirmed"])
    .ilike("memo", `%UUID::${rowId}%`)
    .order("detected_at", { ascending: true })
    .limit(25);

  if (paymentAddress) {
    query = query.eq("recipient_address", paymentAddress);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as WaitlistReserveTransactionRow[]) {
    const parsed = parseWaitlistReserveMemo(row.memo);
    if (parsed?.uuid !== rowId || !row.detected_at) continue;
    const amountZats = coerceAmountZats(row.amount_zats);
    if (amountZats == null || amountZats < minimumZats) continue;
    return {
      createdAt: row.detected_at,
      txid: row.txid?.trim() || null,
    };
  }

  return null;
}

export async function applyWaitlistReservationFromReserves(rowId: string): Promise<{
  reserved: boolean;
  reservedAt: string | null;
  reservedTxid: string | null;
}> {
  const reservation = await findQualifyingReserveForUuid(rowId);
  if (!reservation) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("name_reserved, name_reserved_at, name_reserved_txid")
      .eq("id", rowId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.name_reserved === true) {
      await sendPendingReservationFollowupEmails([rowId]);
    }
    return {
      reserved: data?.name_reserved === true,
      reservedAt: data?.name_reserved_at ?? null,
      reservedTxid: data?.name_reserved_txid ?? null,
    };
  }

  const { error } = await db
    .from("zn_waitlist")
    .update({
      name_reserved: true,
      name_reserved_at: reservation.createdAt,
      name_reserved_txid: reservation.txid,
    })
    .eq("id", rowId);
  if (error) throw new Error(error.message);

  await sendPendingReservationFollowupEmails([rowId]);

  return {
    reserved: true,
    reservedAt: reservation.createdAt,
    reservedTxid: reservation.txid,
  };
}

async function sendPendingReservationFollowupEmails(rowIds: string[]): Promise<void> {
  if (rowIds.length === 0) return;

  const pendingConfirmationRows = await fetchReservedWaitlistRowsPendingConfirmation(rowIds);

  for (const row of pendingConfirmationRows) {
    const trimmedEmail = row.email?.trim();
    const trimmedName = row.name?.trim();
    const canonicalReferralCode = row.referral_code?.trim();

    if (!trimmedEmail || !trimmedName || !canonicalReferralCode) {
      continue;
    }

    try {
      const ensuredReferral = await ensureHumanReferralCode({
        id: row.id,
        name: row.name,
        referral_code: canonicalReferralCode,
        human_referral_code: row.human_referral_code ?? null,
      });
      const normalizedEmail = normalizeWaitlistEmail(trimmedEmail);
      const relatedRows = await findWaitlistRowsByNormalizedEmail(normalizedEmail);
      const protectedNamesByName = await getProtectedNameInfoByName(
        relatedRows.map((relatedRow) => relatedRow.name),
      );
      const otherNames = summarizeOtherNames(row.id, relatedRows, protectedNamesByName);
      const baseUrl = resolveSiteUrl();
      const reservationUrl =
        buildWaitlistConfirmResponseTrackingUrl({
          normalizedEmail,
          campaignId: getWaitlistReservationResendCampaignId(),
          baseUrl,
        }) ?? `${baseUrl}/reserve`;
      const queueUrl = `${baseUrl}/waitlist/view?search=${encodeURIComponent(trimmedName)}&searchMode=exact`;
      const dashboardUrl = buildWaitlistReferralDashboardUrl(
        ensuredReferral.preferredCode,
        baseUrl,
      );

      if (!dashboardUrl) {
        continue;
      }

      await sendWaitlistReservationConfirmedEmail({
        email: trimmedEmail,
        name: trimmedName,
        dashboardUrl,
        reservationUrl,
        queueUrl,
        otherNames,
      });
      await markReservationConfirmationSent(row.id, new Date().toISOString());
    } catch (error) {
      console.error("[waitlist-reserves] reservation confirmation email failed", {
        rowId: row.id,
        email: trimmedEmail,
        name: trimmedName,
        error: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  try {
    await sendDueNoirReservationRebateEmails(rowIds);
  } catch (error) {
    console.error("[waitlist-reserves] noir rebate emails failed", {
      error: error instanceof Error ? error.message : "Unknown error.",
    });
  }
}
