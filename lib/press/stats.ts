import "server-only";

import { db } from "@/lib/db";
import { getChainStats } from "@/lib/network-stats";
import type { NameLengthCount, PressStats } from "@/lib/press/types";
import { fetchAllSupabaseRows } from "@/lib/supabase/fetch-all";

export type { PressStats };

/** Figures from the 29 Sep 2026, 3:32 PM press snapshot. Live queries replace these when they return. */
export const PRESS_SNAPSHOT = {
  names: 10485,
  reserved: 809,
  protectedNames: 387,
  emailVerified: 10468,
  betaRegistered: 50,
  betaForSale: 5,
  asOf: "29 Sep 2026, 3:32 PM",
} as const;

function countOf(result: { count: number | null; error: unknown }): number | null {
  if (result.error || result.count == null) return null;
  return result.count;
}

const NAME_LENGTH_LABELS = ["1", "2", "3", "4", "5", "6+"] as const;

function emptyNameLengths(): NameLengthCount[] {
  return NAME_LENGTH_LABELS.map((label) => ({ label, waitlist: 0, reserved: 0 }));
}

function lengthBucket(name: string | null): number | null {
  const normalized = name?.trim().toLowerCase() ?? "";
  if (!normalized) return null;
  return Math.min(normalized.length, 6) - 1;
}

/** Email-confirmed waitlist rows, split from paid reservations, by name length. */
export async function getNameLengthCounts(): Promise<NameLengthCount[] | null> {
  try {
    const rows = await fetchAllSupabaseRows<{
      name: string | null;
      email_verified: boolean | null;
      name_reserved: boolean | null;
    }>({
      pageSize: 1000,
      fetchPage: async (from, to) =>
        await db
          .from("zn_waitlist")
          .select("name, email_verified, name_reserved")
          .order("id", { ascending: true })
          .range(from, to),
    });

    const buckets = emptyNameLengths();
    for (const row of rows) {
      const index = lengthBucket(row.name);
      if (index == null) continue;
      if (row.name_reserved === true) {
        buckets[index].reserved += 1;
      } else if (row.email_verified === true) {
        buckets[index].waitlist += 1;
      }
    }
    return buckets;
  } catch {
    return null;
  }
}

export async function getPressStats(): Promise<PressStats> {
  const fallback: PressStats = {
    names: PRESS_SNAPSHOT.names,
    reserved: PRESS_SNAPSHOT.reserved,
    protectedNames: PRESS_SNAPSHOT.protectedNames,
    protectedListCount: PRESS_SNAPSHOT.protectedNames,
    emailVerified: PRESS_SNAPSHOT.emailVerified,
    betaRegistered: PRESS_SNAPSHOT.betaRegistered,
    betaForSale: PRESS_SNAPSHOT.betaForSale,
    asOf: PRESS_SNAPSHOT.asOf,
    namesLive: false,
    emailVerifiedLive: false,
    betaLive: false,
    nameLengths: null,
  };

  try {
    const [namesResult, reservedResult, protectedResult, protectedListResult, emailResult, chain, nameLengths] = await Promise.all([
      db.from("public_waitlist_view_snapshots").select("source_waitlist_id", { count: "exact", head: true }),
      db.from("zn_waitlist").select("id", { count: "exact", head: true }).eq("name_reserved", true),
      db
        .from("public_waitlist_view_snapshots")
        .select("source_waitlist_id", { count: "exact", head: true })
        .eq("is_protected", true),
      db.from("zn_protected_names").select("name", { count: "exact", head: true }),
      db.from("zn_waitlist").select("id", { count: "exact", head: true }).eq("email_verified", true),
      getChainStats("mainnet"),
      getNameLengthCounts(),
    ]);

    const names = countOf(namesResult);
    const reserved = countOf(reservedResult);
    const protectedNames = countOf(protectedResult);
    const protectedListCount = countOf(protectedListResult);
    const emailVerified = countOf(emailResult);
    const namesLive = names != null && names > 0 && protectedNames != null;
    const betaLive = chain.syncedHeight > 0;

    return {
      names: namesLive && names != null ? names : fallback.names,
      reserved: reserved != null ? reserved : fallback.reserved,
      protectedNames: namesLive && protectedNames != null ? protectedNames : fallback.protectedNames,
      protectedListCount: protectedListCount != null ? protectedListCount : fallback.protectedListCount,
      emailVerified: emailVerified != null && emailVerified > 0 ? emailVerified : fallback.emailVerified,
      betaRegistered: betaLive ? chain.claimed : fallback.betaRegistered,
      betaForSale: betaLive ? chain.forSale : fallback.betaForSale,
      asOf: namesLive || betaLive ? new Date().toISOString() : fallback.asOf,
      namesLive,
      emailVerifiedLive: emailVerified != null && emailVerified > 0,
      betaLive,
      nameLengths,
    };
  } catch {
    return fallback;
  }
}
