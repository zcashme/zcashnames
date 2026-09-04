import "server-only";

import { db } from "@/lib/db";
import { getPreferredReferralCode } from "@/lib/referral-code";

export type ProtectedFamilyReferralProfile = {
  familyRootName: string;
  name: string;
  referralCode: string;
  humanReferralCode: string | null;
  preferredReferralCode: string;
};

export function getProtectedFamilyRootName(row: {
  normalized_name: string;
  parent_name: string | null;
}): string {
  return (row.parent_name?.trim() || row.normalized_name.trim()).toLowerCase();
}

function isMissingProfilesTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || Boolean(error?.message?.includes("zn_protected_family_referrals"));
}

export async function getProtectedFamilyReferralProfiles(
  familyRoots: string[],
): Promise<Map<string, ProtectedFamilyReferralProfile>> {
  const normalizedRoots = Array.from(
    new Set(familyRoots.map((root) => root.trim().toLowerCase()).filter(Boolean)),
  );
  const profiles = new Map<string, ProtectedFamilyReferralProfile>();
  if (normalizedRoots.length === 0) return profiles;

  const { data, error } = await db
    .from("zn_protected_family_referrals")
    .select("family_root_name, name, referral_code, human_referral_code")
    .in("family_root_name", normalizedRoots);

  if (isMissingProfilesTableError(error)) return profiles;
  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as Array<{
    family_root_name: string;
    name: string;
    referral_code: string;
    human_referral_code: string | null;
  }>) {
    if (!row.family_root_name || !row.referral_code) continue;
    profiles.set(row.family_root_name.toLowerCase(), {
      familyRootName: row.family_root_name.toLowerCase(),
      name: row.name,
      referralCode: row.referral_code,
      humanReferralCode: row.human_referral_code,
      preferredReferralCode: getPreferredReferralCode(row),
    });
  }

  return profiles;
}

export async function getProtectedFamilyVariants(familyRootName: string): Promise<string[]> {
  const root = familyRootName.trim().toLowerCase();
  if (!root) return [];

  const { data, error } = await db
    .from("zn_protected_names")
    .select("normalized_name, parent_name")
    .or(`normalized_name.eq.${root},parent_name.eq.${root}`)
    .order("normalized_name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => String(row.normalized_name ?? "").trim().toLowerCase())
    .filter((name) => name && name !== root);
}
