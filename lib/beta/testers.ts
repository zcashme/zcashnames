import "server-only";

import { db } from "@/lib/db";

export interface BetaTester {
  id: string;
  displayName: string;
  codeHash: string;
}

/** Look up a tester by their stable id (used by the cookie payload). */
export async function findTesterById(id: string): Promise<BetaTester | null> {
  if (!id) return null;

  try {
    const { data, error } = await db
      .from("beta_testers")
      .select("id, display_name, code_hash, revoked_at")
      .eq("id", id)
      .is("revoked_at", null)
      .maybeSingle();

    if (error) {
      console.error("[beta] beta_testers id lookup failed:", error);
      return null;
    }

    if (data) {
      return {
        id: data.id as string,
        displayName: data.display_name as string,
        codeHash: data.code_hash as string,
      };
    }

    return null;
  } catch (err) {
    console.error("[beta] beta_testers id lookup threw:", err);
    return null;
  }
}
