// Server action: validates a referral code/link by extracting the code and querying
// zn_waitlist for a matching name. Called by ShareKitClient on form submit. Returns
// { ok, referralCode, referralName } or { ok: false }.
"use server";

import { db } from "@/lib/db";
import { extractReferralCode } from "@/lib/referral-code";

export type ShareKitReferralLookupResult =
  | { ok: true; referralCode: string; referralName: string | null }
  | { ok: false };

export async function lookupShareKitReferral(
  input: string,
): Promise<ShareKitReferralLookupResult> {
  const referralCode = extractReferralCode(input);
  if (!referralCode) return { ok: false };

  try {
    const { data, error } = await db
      .from("zn_waitlist")
      .select("name")
      .eq("referral_code", referralCode)
      .limit(1)
      .maybeSingle();

    if (error || !data) return { ok: false };

    const referralName = (data.name as string | null | undefined)?.trim() || null;
    return { ok: true, referralCode, referralName };
  } catch {
    return { ok: false };
  }
}
