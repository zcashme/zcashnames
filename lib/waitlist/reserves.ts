import "server-only";

import { db } from "@/lib/db";
import {
  buildWaitlistConfirmResponseTrackingUrl,
  getWaitlistVerifyReserveFeeZec,
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
import { getWaitlistReservationResendCampaignId } from "@/lib/waitlist/reservation-resend";

const WAITLIST_RESERVES_PAGE_SIZE = 1000;

type WaitlistReserveRow = {
  amount: string | number | null;
  created_at: string | null;
  memo_full: string | null;
  txid: string | null;
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

function amountToZats(value: string | number | null): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100_000_000) : null;
  }
  if (typeof value === "string") {
    return parseZecToZats(value);
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

async function fetchAllWaitlistReserveRows(): Promise<WaitlistReserveRow[]> {
  return fetchAllSupabaseRows<WaitlistReserveRow>({
    pageSize: WAITLIST_RESERVES_PAGE_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist_reserves")
        .select("amount, created_at, memo_full, txid")
        .order("created_at", { ascending: true })
        .range(from, to),
  });
}

async function fetchExistingReservedWaitlistIds(): Promise<string[]> {
  const rows = await fetchAllSupabaseRows<{ id: string }>({
    pageSize: WAITLIST_RESERVES_PAGE_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist")
        .select("id")
        .eq("name_reserved", true)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  });

  return rows.map((row) => row.id);
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
  const minimumAmount = getWaitlistVerifyReserveFeeZec();
  const minimumZats = minimumAmount ? parseZecToZats(minimumAmount) : null;
  if (!minimumAmount || minimumZats == null) {
    throw new Error("WAITLIST_VERIFY_RESERVE_FEE_ZEC is missing or invalid.");
  }

  const [reserveRows, existingReservedIds] = await Promise.all([
    fetchAllWaitlistReserveRows(),
    fetchExistingReservedWaitlistIds(),
  ]);
  const firstValidReservationByUuid = new Map<
    string,
    { createdAt: string; txid: string | null }
  >();

  for (const row of reserveRows) {
    const parsed = parseWaitlistReserveMemo(row.memo_full);
    if (!parsed?.uuid || !row.created_at) continue;

    const amountZats = amountToZats(row.amount);
    if (amountZats == null || amountZats < minimumZats) continue;
    if (firstValidReservationByUuid.has(parsed.uuid)) continue;

    firstValidReservationByUuid.set(parsed.uuid, {
      createdAt: row.created_at,
      txid: row.txid?.trim() || null,
    });
  }

  const reservationEntries = [...firstValidReservationByUuid.entries()];
  const currentReservedIds = new Set(reservationEntries.map(([uuid]) => uuid));

  const staleReservedIds = existingReservedIds.filter((id) => !currentReservedIds.has(id));
  if (staleReservedIds.length > 0) {
    const { error } = await db
      .from("zn_waitlist")
      .update({
        name_reserved: false,
        name_reserved_at: null,
        name_reserved_txid: null,
        reservation_confirmed_email_sent_at: null,
      })
      .in("id", staleReservedIds);
    if (error) throw new Error(error.message);
  }

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

  const pendingConfirmationRows = await fetchReservedWaitlistRowsPendingConfirmation(
    reservationEntries.map(([uuid]) => uuid),
  );

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

  return { matchedCount };
}
