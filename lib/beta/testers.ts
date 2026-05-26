// Beta tester DB layer — consumed exclusively by gate.ts (readCurrentTester).
// Queries Supabase beta_testers table, returns null if revoked or missing.
import "server-only";

import { db } from "@/lib/db";

export interface BetaTester {
  id: string;
  displayName: string;
  codeHash: string;
}

/** Look up a tester by their stable id (used by the cookie payload). Checks v2 first, falls back to v1. */
export async function findTesterById(id: string): Promise<BetaTester | null> {
  if (!id) return null;

  try {
    const { data: v2, error: v2Error } = await db
      .from("beta_testers_v2")
      .select("id, display_name, code_hash, status")
      .eq("id", id)
      .neq("status", "revoked")
      .maybeSingle();

    if (v2Error) {
      console.error("[beta] beta_testers_v2 id lookup failed:", v2Error);
    } else if (v2) {
      return {
        id: v2.id as string,
        displayName: v2.display_name as string,
        codeHash: v2.code_hash as string,
      };
    }

    const { data: v1, error: v1Error } = await db
      .from("beta_testers")
      .select("id, display_name, code_hash, revoked_at")
      .eq("id", id)
      .is("revoked_at", null)
      .maybeSingle();

    if (v1Error) {
      console.error("[beta] beta_testers id lookup failed:", v1Error);
      return null;
    }

    if (v1) {
      return {
        id: v1.id as string,
        displayName: v1.display_name as string,
        codeHash: v1.code_hash as string,
      };
    }

    return null;
  } catch (err) {
    console.error("[beta] beta_testers id lookup threw:", err);
    return null;
  }
}
