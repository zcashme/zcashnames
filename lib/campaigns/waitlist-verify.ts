import "server-only";

import { db } from "@/lib/db";
import { buildFixedDepthReferralSummaries } from "@/lib/leaders/referral-dashboard";
import { fetchAllSupabaseRows } from "@/lib/supabase/fetch-all";

export type WaitlistVerifyRow = {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string | null;
  referral_code: string | null;
  human_referral_code: string | null;
  referred_by?: string | null;
  email_verified: boolean | null;
  email_verified_at: string | null;
  name_reserved: boolean | null;
  name_reserved_at: string | null;
  name_reserved_txid: string | null;
  campaign_email_confirm_response: boolean | null;
};

const WAITLIST_PAGE_SIZE = 1000;

type WaitlistVerifyNameStatRow = Pick<
  WaitlistVerifyRow,
  "id" | "name" | "created_at" | "name_reserved" | "name_reserved_at"
>;

export type WaitlistVerifyNameStats = {
  totalCount: number;
  reservedPosition: number | null;
  waitlistPosition: number | null;
};

export type WaitlistVerifyReferralStats = {
  totalReferrals: number;
  reservedReferrals: number;
};

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeWaitlistName(name: string | null | undefined): string | null {
  const trimmed = name?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeReferralCodeValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function buildWaitlistVerifyMemo(
  name: string | null | undefined,
  waitlistId: string,
): string {
  const normalizedName = name?.trim() ?? "";
  if (!normalizedName) {
    throw new Error(`Waitlist row ${waitlistId} is missing a usable name.`);
  }
  return `ZNS:RESERVE|Name::${normalizedName}|UUID::${waitlistId}`;
}

function compareWaitlistRows(
  a: Pick<WaitlistVerifyRow, "created_at" | "id">,
  b: Pick<WaitlistVerifyRow, "created_at" | "id">,
): number {
  const aTime = a.created_at ? new Date(a.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.created_at ? new Date(b.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

function compareReservedRows(
  a: Pick<WaitlistVerifyNameStatRow, "name_reserved_at" | "created_at" | "id">,
  b: Pick<WaitlistVerifyNameStatRow, "name_reserved_at" | "created_at" | "id">,
): number {
  const aReservedAt = a.name_reserved_at
    ? new Date(a.name_reserved_at).getTime()
    : Number.MAX_SAFE_INTEGER;
  const bReservedAt = b.name_reserved_at
    ? new Date(b.name_reserved_at).getTime()
    : Number.MAX_SAFE_INTEGER;
  if (aReservedAt !== bReservedAt) return aReservedAt - bReservedAt;

  const aCreatedAt = a.created_at ? new Date(a.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  const bCreatedAt = b.created_at ? new Date(b.created_at).getTime() : Number.MAX_SAFE_INTEGER;
  if (aCreatedAt !== bCreatedAt) return aCreatedAt - bCreatedAt;

  return a.id.localeCompare(b.id);
}

async function fetchAllWaitlistNameStatRows(): Promise<WaitlistVerifyNameStatRow[]> {
  const rows = await fetchAllSupabaseRows<WaitlistVerifyNameStatRow>({
    pageSize: WAITLIST_PAGE_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist")
        .select("id, name, created_at, name_reserved, name_reserved_at")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  });

  return rows.sort(compareWaitlistRows);
}

type WaitlistVerifyReferralStatRow = Pick<
  WaitlistVerifyRow,
  "id" | "referral_code" | "human_referral_code" | "referred_by" | "name_reserved"
>;

type WaitlistVerifyRewardStatRow = Pick<
  WaitlistVerifyRow,
  "id" | "name" | "created_at" | "referral_code" | "human_referral_code" | "referred_by" | "email_verified"
>;

async function fetchAllWaitlistReferralStatRows(): Promise<WaitlistVerifyReferralStatRow[]> {
  return fetchAllSupabaseRows<WaitlistVerifyReferralStatRow>({
    pageSize: WAITLIST_PAGE_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist")
        .select("id, referral_code, human_referral_code, referred_by, name_reserved")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  });
}

async function fetchAllWaitlistRewardStatRows(): Promise<WaitlistVerifyRewardStatRow[]> {
  return fetchAllSupabaseRows<WaitlistVerifyRewardStatRow>({
    pageSize: WAITLIST_PAGE_SIZE,
    fetchPage: async (from, to) =>
      await db
        .from("zn_waitlist")
        .select("id, name, created_at, referral_code, human_referral_code, referred_by, email_verified")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
  });
}

export async function findWaitlistRowsByNormalizedEmail(
  normalizedEmail: string,
): Promise<WaitlistVerifyRow[]> {
  const rows: WaitlistVerifyRow[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await db
      .from("zn_waitlist")
      .select(
        "id, email, name, created_at, referral_code, human_referral_code, email_verified, email_verified_at, name_reserved, name_reserved_at, name_reserved_txid, campaign_email_confirm_response",
      )
      .ilike("email", normalizedEmail)
      .range(offset, offset + WAITLIST_PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }

    const batch = ((data ?? []) as WaitlistVerifyRow[]).filter(
      (row) => row.email && normalizeWaitlistEmail(row.email) === normalizedEmail,
    );
    rows.push(...batch);

    if ((data ?? []).length < WAITLIST_PAGE_SIZE) {
      break;
    }
    offset += WAITLIST_PAGE_SIZE;
  }

  return rows.sort(compareWaitlistRows);
}

export async function getWaitlistVerifyNameStats(
  targetRows: WaitlistVerifyRow[],
): Promise<Map<string, WaitlistVerifyNameStats>> {
  const targetNames = new Set(
    targetRows
      .map((row) => normalizeWaitlistName(row.name))
      .filter((value): value is string => Boolean(value)),
  );
  const statsByRowId = new Map<string, WaitlistVerifyNameStats>();

  if (targetNames.size === 0) {
    return statsByRowId;
  }

  const allRows = await fetchAllWaitlistNameStatRows();
  const rowsByNormalizedName = new Map<string, WaitlistVerifyNameStatRow[]>();

  for (const row of allRows) {
    const normalizedName = normalizeWaitlistName(row.name);
    if (!normalizedName || !targetNames.has(normalizedName)) continue;

    const existing = rowsByNormalizedName.get(normalizedName);
    if (existing) {
      existing.push(row);
    } else {
      rowsByNormalizedName.set(normalizedName, [row]);
    }
  }

  for (const [normalizedName, rows] of rowsByNormalizedName) {
    const reservedRows = rows
      .filter((row) => row.name_reserved === true)
      .sort(compareReservedRows);
    const reservedPositionById = new Map(
      reservedRows.map((row, index) => [row.id, index + 1]),
    );

    for (const row of rows) {
      statsByRowId.set(row.id, {
        totalCount: rows.length,
        reservedPosition: reservedPositionById.get(row.id) ?? null,
        waitlistPosition: rows.findIndex((candidate) => candidate.id === row.id) + 1,
      });
    }

    if (!targetNames.has(normalizedName)) continue;
  }

  return statsByRowId;
}

export async function getWaitlistVerifyReferralStats(
  targetRows: WaitlistVerifyRow[],
): Promise<Map<string, WaitlistVerifyReferralStats>> {
  const statsByRowId = new Map<string, WaitlistVerifyReferralStats>();
  if (targetRows.length === 0) {
    return statsByRowId;
  }

  const allRows = await fetchAllWaitlistReferralStatRows();
  const childrenByParentCode = new Map<string, WaitlistVerifyReferralStatRow[]>();

  for (const row of allRows) {
    const parentCode = normalizeReferralCodeValue(row.referred_by);
    if (!parentCode) continue;

    const existing = childrenByParentCode.get(parentCode);
    if (existing) {
      existing.push(row);
    } else {
      childrenByParentCode.set(parentCode, [row]);
    }
  }

  function countDescendants(parentCode: string | null): WaitlistVerifyReferralStats {
    if (!parentCode) {
      return { totalReferrals: 0, reservedReferrals: 0 };
    }

    const visited = new Set<string>();

    function walk(code: string | null): WaitlistVerifyReferralStats {
      if (!code) {
        return { totalReferrals: 0, reservedReferrals: 0 };
      }

      let totalReferrals = 0;
      let reservedReferrals = 0;
      const children = childrenByParentCode.get(code) ?? [];

      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);

        totalReferrals += 1;
        if (child.name_reserved === true) {
          reservedReferrals += 1;
        }

        const nested = walk(normalizeReferralCodeValue(child.referral_code));
        totalReferrals += nested.totalReferrals;
        reservedReferrals += nested.reservedReferrals;
      }

      return { totalReferrals, reservedReferrals };
    }

    return walk(parentCode);
  }

  for (const row of targetRows) {
    statsByRowId.set(
      row.id,
      countDescendants(normalizeReferralCodeValue(row.referral_code)),
    );
  }

  return statsByRowId;
}

export async function getWaitlistVerifyPotentialRewards(
  targetRows: WaitlistVerifyRow[],
): Promise<Map<string, number>> {
  const rewardsByRowId = new Map<string, number>();
  if (targetRows.length === 0) {
    return rewardsByRowId;
  }

  const allRows = await fetchAllWaitlistRewardStatRows();
  const summaries = buildFixedDepthReferralSummaries(
    allRows
      .map((row) => {
        const referralCode = normalizeReferralCodeValue(row.referral_code);
        if (!referralCode) {
          return null;
        }

        return {
          name: row.name?.trim() ?? "",
          referral_code: referralCode,
          human_referral_code: row.human_referral_code?.trim() || null,
          preferred_referral_code: row.human_referral_code?.trim() || row.referral_code?.trim() || undefined,
          referred_by: normalizeReferralCodeValue(row.referred_by),
          created_at: row.created_at ?? new Date(0).toISOString(),
          email_verified: row.email_verified === true,
          cabal: false,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  );

  for (const row of targetRows) {
    const referralCode = normalizeReferralCodeValue(row.referral_code);
    rewardsByRowId.set(row.id, referralCode ? summaries.get(referralCode)?.potentialRewards ?? 0 : 0);
  }

  return rewardsByRowId;
}
