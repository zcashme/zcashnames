import "server-only";

import { db } from "@/lib/db";
import {
  buildHumanReferralCodeCandidate,
  getPreferredReferralCode,
  normalizeHumanReferralCode,
} from "@/lib/referral-code";

const MAX_HUMAN_REFERRAL_CODE_ATTEMPTS = 100;

export interface ReferralIdentityRow {
  id: string;
  name: string | null;
  referral_code: string;
  human_referral_code: string | null;
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

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

function isCaseInsensitiveExactPattern(value: string): string {
  return value.replace(/[%_]/g, "");
}

async function findReferralIdentityByCode<Row extends ReferralIdentityRow = ReferralIdentityRow>(
  referralCode: string,
  select: string,
): Promise<Row | null> {
  const rawCode = referralCode.trim();
  if (!rawCode) return null;

  const { data: canonicalMatch, error: canonicalError } = await db
    .from("zn_waitlist")
    .select(select)
    .eq("referral_code", rawCode)
    .limit(1)
    .maybeSingle();

  if (canonicalError) {
    throw canonicalError;
  }

  const canonicalRow = canonicalMatch as Partial<ReferralIdentityRow> | null;
  if (canonicalRow?.id && canonicalRow?.referral_code) {
    return canonicalMatch as unknown as Row;
  }

  const normalizedAlias = normalizeHumanReferralCode(rawCode);
  if (!normalizedAlias) return null;

  const { data: aliasMatch, error: aliasError } = await db
    .from("zn_waitlist")
    .select(select)
    .eq("human_referral_code", normalizedAlias)
    .limit(1)
    .maybeSingle();

  if (aliasError) {
    throw aliasError;
  }

  const aliasRow = aliasMatch as Partial<ReferralIdentityRow> | null;
  if (!aliasRow?.id || !aliasRow?.referral_code) return null;
  return aliasMatch as unknown as Row;
}

async function referralCodeExists(candidate: string): Promise<boolean> {
  const canonicalPattern = isCaseInsensitiveExactPattern(candidate);
  const [{ data: canonicalMatch, error: canonicalError }, { data: aliasMatch, error: aliasError }] = await Promise.all([
    db
      .from("zn_waitlist")
      .select("id, referral_code")
      .ilike("referral_code", canonicalPattern)
      .limit(1)
      .maybeSingle(),
    db
      .from("zn_waitlist")
      .select("id, human_referral_code")
      .eq("human_referral_code", candidate)
      .limit(1)
      .maybeSingle(),
  ]);

  if (canonicalError) throw canonicalError;
  if (aliasError) throw aliasError;

  return Boolean(canonicalMatch?.id || aliasMatch?.id);
}

export async function ensureHumanReferralCode<Row extends ReferralIdentityRow = ReferralIdentityRow>(
  row: Row,
): Promise<ResolvedReferralIdentity<Row>> {
  const existingPreferred = getPreferredReferralCode(row);
  if (!row.referral_code) {
    throw new Error("Cannot ensure a human referral code without a canonical referral code.");
  }

  if (row.human_referral_code?.trim()) {
    return {
      canonicalCode: row.referral_code,
      preferredCode: existingPreferred,
      row,
    };
  }

  for (let suffix = 0; suffix < MAX_HUMAN_REFERRAL_CODE_ATTEMPTS; suffix += 1) {
    const candidate = buildHumanReferralCodeCandidate(row.name ?? row.referral_code, suffix);
    if (!candidate) continue;
    if (await referralCodeExists(candidate)) continue;

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
      const nextRow = {
        ...row,
        human_referral_code: String(updated.human_referral_code),
      };
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
      const nextRow = {
        ...row,
        human_referral_code: String(refreshed.human_referral_code),
      };
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
  const select =
    options?.select ??
    "id, name, referral_code, human_referral_code";

  const row = await findReferralIdentityByCode<Row>(referralCode, select);
  if (!row) return null;

  if (options?.ensureHumanReferralCode) {
    return ensureHumanReferralCode(row);
  }

  return {
    canonicalCode: row.referral_code,
    preferredCode: getPreferredReferralCode(row),
    row,
  };
}

export async function resolveCanonicalReferralCode(referralCode: string): Promise<string | null> {
  const resolved = await resolveReferralIdentity(referralCode);
  return resolved?.canonicalCode ?? null;
}
