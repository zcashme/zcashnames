import "server-only";

import { db } from "@/lib/db";
import {
  buildHumanReferralCodeCandidate,
  getPreferredReferralCode,
  normalizeHumanReferralCode,
} from "@/lib/referral-code";

const MAX_HUMAN_REFERRAL_CODE_ATTEMPTS = 100;

export type ReferralOwnerKind = "waitlist" | "protected_family";

export interface ReferralIdentityRow {
  id: string;
  name: string | null;
  referral_code: string;
  human_referral_code: string | null;
  owner_kind?: ReferralOwnerKind;
  family_root_name?: string | null;
  email?: string | null;
  referred_by?: string | null;
  created_at?: string;
  email_verified?: boolean;
  cabal?: boolean;
  access_pin_email_sent_at?: string | null;
  referral_email_resent_at?: string | null;
}

export interface ResolvedReferralIdentity<Row extends ReferralIdentityRow = ReferralIdentityRow> {
  canonicalCode: string;
  preferredCode: string;
  row: Row;
}

const WAITLIST_REFERRAL_SELECT =
  "id, name, email, referral_code, human_referral_code, referred_by, created_at, email_verified, cabal, access_pin_email_sent_at, referral_email_resent_at";
const PROTECTED_FAMILY_REFERRAL_SELECT =
  "family_root_name, name, referral_code, human_referral_code, created_at";

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

function isMissingProfilesTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  return error?.code === "42P01" || Boolean(error?.message?.includes("zn_protected_family_referrals"));
}

function isCaseInsensitiveExactPattern(value: string): string {
  return value.replace(/[%_]/g, "");
}

function toWaitlistIdentity(row: Record<string, unknown> | null): ReferralIdentityRow | null {
  if (!row?.id || !row.referral_code) return null;
  return {
    ...row,
    id: String(row.id),
    name: typeof row.name === "string" ? row.name : null,
    referral_code: String(row.referral_code),
    human_referral_code: typeof row.human_referral_code === "string" ? row.human_referral_code : null,
    owner_kind: "waitlist",
  };
}

function toProtectedFamilyIdentity(row: Record<string, unknown> | null): ReferralIdentityRow | null {
  const familyRootName = typeof row?.family_root_name === "string" ? row.family_root_name.trim().toLowerCase() : "";
  if (!familyRootName || !row?.referral_code) return null;
  return {
    id: familyRootName,
    name: typeof row.name === "string" ? row.name : familyRootName,
    referral_code: String(row.referral_code),
    human_referral_code: typeof row.human_referral_code === "string" ? row.human_referral_code : null,
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    family_root_name: familyRootName,
    owner_kind: "protected_family",
    cabal: false,
  };
}

async function findReferralIdentityByCode(referralCode: string): Promise<ReferralIdentityRow | null> {
  const rawCode = referralCode.trim();
  if (!rawCode) return null;
  const exactCode = isCaseInsensitiveExactPattern(rawCode);

  const { data: canonicalWaitlist, error: canonicalWaitlistError } = await db
    .from("zn_waitlist")
    .select(WAITLIST_REFERRAL_SELECT)
    .ilike("referral_code", exactCode)
    .limit(1)
    .maybeSingle();
  if (canonicalWaitlistError) throw canonicalWaitlistError;

  const waitlistCanonicalIdentity = toWaitlistIdentity(canonicalWaitlist as Record<string, unknown> | null);
  if (waitlistCanonicalIdentity) return waitlistCanonicalIdentity;

  const { data: canonicalProtected, error: canonicalProtectedError } = await db
    .from("zn_protected_family_referrals")
    .select(PROTECTED_FAMILY_REFERRAL_SELECT)
    .ilike("referral_code", exactCode)
    .limit(1)
    .maybeSingle();
  if (canonicalProtectedError && !isMissingProfilesTableError(canonicalProtectedError)) {
    throw canonicalProtectedError;
  }

  const protectedCanonicalIdentity = toProtectedFamilyIdentity(canonicalProtected as Record<string, unknown> | null);
  if (protectedCanonicalIdentity) return protectedCanonicalIdentity;

  const normalizedAlias = normalizeHumanReferralCode(rawCode);
  if (!normalizedAlias) return null;

  const { data: aliasWaitlist, error: aliasWaitlistError } = await db
    .from("zn_waitlist")
    .select(WAITLIST_REFERRAL_SELECT)
    .eq("human_referral_code", normalizedAlias)
    .limit(1)
    .maybeSingle();
  if (aliasWaitlistError) throw aliasWaitlistError;

  const waitlistAliasIdentity = toWaitlistIdentity(aliasWaitlist as Record<string, unknown> | null);
  if (waitlistAliasIdentity) return waitlistAliasIdentity;

  const { data: aliasProtected, error: aliasProtectedError } = await db
    .from("zn_protected_family_referrals")
    .select(PROTECTED_FAMILY_REFERRAL_SELECT)
    .eq("human_referral_code", normalizedAlias)
    .limit(1)
    .maybeSingle();
  if (aliasProtectedError && !isMissingProfilesTableError(aliasProtectedError)) {
    throw aliasProtectedError;
  }

  return toProtectedFamilyIdentity(aliasProtected as Record<string, unknown> | null);
}

export async function referralCodeExists(candidate: string): Promise<boolean> {
  const canonicalPattern = isCaseInsensitiveExactPattern(candidate);
  const normalizedAlias = normalizeHumanReferralCode(candidate);
  const [{ data: canonicalWaitlist, error: canonicalWaitlistError }, { data: aliasWaitlist, error: aliasWaitlistError }] = await Promise.all([
    db.from("zn_waitlist").select("id").ilike("referral_code", canonicalPattern).limit(1).maybeSingle(),
    normalizedAlias
      ? db.from("zn_waitlist").select("id").eq("human_referral_code", normalizedAlias).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (canonicalWaitlistError) throw canonicalWaitlistError;
  if (aliasWaitlistError) throw aliasWaitlistError;
  if (canonicalWaitlist?.id || aliasWaitlist?.id) return true;

  const [{ data: canonicalProtected, error: canonicalProtectedError }, { data: aliasProtected, error: aliasProtectedError }] = await Promise.all([
    db.from("zn_protected_family_referrals").select("family_root_name").ilike("referral_code", canonicalPattern).limit(1).maybeSingle(),
    normalizedAlias
      ? db.from("zn_protected_family_referrals").select("family_root_name").eq("human_referral_code", normalizedAlias).limit(1).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (canonicalProtectedError && !isMissingProfilesTableError(canonicalProtectedError)) throw canonicalProtectedError;
  if (aliasProtectedError && !isMissingProfilesTableError(aliasProtectedError)) throw aliasProtectedError;

  return Boolean(canonicalProtected?.family_root_name || aliasProtected?.family_root_name);
}

export async function ensureHumanReferralCode<Row extends ReferralIdentityRow = ReferralIdentityRow>(
  row: Row,
): Promise<ResolvedReferralIdentity<Row>> {
  const existingPreferred = getPreferredReferralCode(row);
  if (!row.referral_code) {
    throw new Error("Cannot ensure a human referral code without a canonical referral code.");
  }

  // Protected-family profiles intentionally use their generated public code only.
  if (row.owner_kind === "protected_family" || row.human_referral_code?.trim()) {
    return {
      canonicalCode: row.referral_code,
      preferredCode: existingPreferred,
      row,
    };
  }

  for (let suffix = 0; suffix < MAX_HUMAN_REFERRAL_CODE_ATTEMPTS; suffix += 1) {
    const candidate = buildHumanReferralCodeCandidate(row.name ?? row.referral_code, suffix);
    if (!candidate || await referralCodeExists(candidate)) continue;

    const { data: updated, error } = await db
      .from("zn_waitlist")
      .update({ human_referral_code: candidate })
      .eq("id", row.id)
      .is("human_referral_code", null)
      .select("human_referral_code")
      .maybeSingle();

    if (error && isUniqueViolation(error)) continue;
    if (error) throw error;

    if (updated?.human_referral_code) {
      const nextRow = { ...row, human_referral_code: String(updated.human_referral_code) };
      return {
        canonicalCode: row.referral_code,
        preferredCode: String(updated.human_referral_code),
        row: nextRow,
      };
    }

    const { data: refreshed, error: refreshError } = await db
      .from("zn_waitlist")
      .select("id, name, referral_code, human_referral_code")
      .eq("id", row.id)
      .limit(1)
      .maybeSingle();
    if (refreshError) throw refreshError;

    if (refreshed?.human_referral_code) {
      const nextRow = { ...row, human_referral_code: String(refreshed.human_referral_code) };
      return {
        canonicalCode: row.referral_code,
        preferredCode: String(refreshed.human_referral_code),
        row: nextRow,
      };
    }
  }

  throw new Error(`Could not assign a human referral code for waitlist row ${row.id}.`);
}

export async function resolveReferralIdentity<Row extends ReferralIdentityRow = ReferralIdentityRow>(
  referralCode: string,
  options?: { select?: string; ensureHumanReferralCode?: boolean },
): Promise<ResolvedReferralIdentity<Row> | null> {
  // The resolver now selects a stable cross-owner shape. Keep `select` accepted
  // for existing callers while avoiding source-specific select lists.
  void options?.select;
  const row = await findReferralIdentityByCode(referralCode);
  if (!row) return null;

  const typedRow = row as Row;
  if (options?.ensureHumanReferralCode) {
    return ensureHumanReferralCode(typedRow);
  }

  return {
    canonicalCode: typedRow.referral_code,
    preferredCode: getPreferredReferralCode(typedRow),
    row: typedRow,
  };
}

export async function resolveCanonicalReferralCode(referralCode: string): Promise<string | null> {
  const resolved = await resolveReferralIdentity(referralCode);
  return resolved?.canonicalCode ?? null;
}
